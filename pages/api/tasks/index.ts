import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '@/lib/scope';
import { canCreateTasks, canAssignTasks } from '@/lib/permissions';
import { logger } from '@/lib/logger';

// Tasks index handler
// - GET: returns a paginated list of tasks visible to the current user.
//   * Visibility is controlled via getUserScope(user):
//     - If allVentures/allOffices are false, results are filtered to ventureIds/officeIds.
//   * Any authenticated user can list tasks they have scope for; RBAC mainly
//     affects creation/assignment, not listing.
//   * Pagination is enforced via `page` (>=1) and `limit` (1–100), and the
//     response exposes { tasks, page, limit, totalCount, totalPages }.
// - POST: creates a new task.
//   * Requires canCreateTasks(user.role) === true, otherwise 403 FORBIDDEN.
//   * If assignedToId is provided, canAssignTasks(user.role) must be true,
//     otherwise 403 FORBIDDEN_ASSIGN.
//   * Venture/office scoping is enforced via getUserScope(user): attempting to
//     create a task in an out-of-scope venture/office returns
//     FORBIDDEN_VENTURE / FORBIDDEN_OFFICE.
//   * Due dates must be valid and not in the past; invalid or past dates return
//     400 INVALID_DUE_DATE / DUE_DATE_CANNOT_BE_IN_PAST.
// - This handler does not change any EOD state; EOD interacts with tasks only
//   via reporting/summary in other endpoints.

function isDateInPast(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate < today;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  const scope = getUserScope(user);

  logger.info('api_request', {
    endpoint: '/api/tasks',
    userId: user.id,
    userRole: user.role,
    outcome: 'start',
  });

  if (req.method === 'GET') {
  // GET: scoped by venture/office with pagination caps; POST: guarded by canCreateTasks/canAssignTasks.

    const where: any = {};

    if (!scope.allVentures && scope.ventureIds.length > 0) {
      where.ventureId = { in: scope.ventureIds };
    }
    if (!scope.allOffices && scope.officeIds.length > 0) {
      where.officeId = { in: scope.officeIds };
    }

    // Filter by assignedToId if provided
    if (req.query.assignedToId) {
      const assignedToId = Number(req.query.assignedToId);
      if (!isNaN(assignedToId)) {
        where.assignedTo = assignedToId;
      }
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    try {
      const [tasks, totalCount] = await Promise.all([
        prisma.task.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            venture: true,
            office: true,
            assignedUser: true,
          },
        }),
        prisma.task.count({ where }),
      ]);

      return res.status(200).json({
        tasks: tasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
          ventureName: t.venture?.name ?? null,
          officeName: t.office?.name ?? null,
          assignedToId: t.assignedTo,
          assignedToName: t.assignedUser?.fullName ?? null,
        })),
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      });
    } catch (error: any) {
      logger.error('api_request_error', {
        endpoint: '/api/tasks',
        userId: user.id,
        userRole: user.role,
        outcome: 'error',
      });
      console.error('Tasks GET error', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    if (!canCreateTasks(user.role)) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    const { title, description, ventureId, officeId, dueDate, priority, assignedToId } = req.body;

    if (!title || !ventureId) {
      return res.status(400).json({ error: 'TITLE_AND_VENTURE_REQUIRED' });
    }

    // Validate due date is not in the past
    if (dueDate) {
      const parsedDueDate = new Date(dueDate);
      if (isNaN(parsedDueDate.getTime())) {
        return res.status(400).json({ error: 'INVALID_DUE_DATE' });
      }
      if (isDateInPast(parsedDueDate)) {
        return res.status(400).json({ error: 'DUE_DATE_CANNOT_BE_IN_PAST' });
      }
    }

    // Check if user has permission to assign tasks when assignedToId is provided
    if (assignedToId && !canAssignTasks(user.role)) {
      return res.status(403).json({ error: 'FORBIDDEN_ASSIGN' });
    }

    const vId = Number(ventureId);
    const oId = officeId ? Number(officeId) : null;

    if (!scope.allVentures && !scope.ventureIds.includes(vId)) {
      return res.status(403).json({ error: 'FORBIDDEN_VENTURE' });
    }
    if (oId && !scope.allOffices && !scope.officeIds.includes(oId)) {
      return res.status(403).json({ error: 'FORBIDDEN_OFFICE' });
    }

    try {
      const task = await prisma.task.create({
        data: {
          title,
          description: description ?? null,
          ventureId: vId,
          officeId: oId,
          dueDate: dueDate ? new Date(dueDate) : null,
          priority: priority ?? 'MEDIUM',
          status: 'OPEN',
          createdBy: user.id,
          assignedTo: assignedToId ? Number(assignedToId) : null,
          isTest: user.isTestUser,
        },
        include: {
          venture: { select: { id: true, name: true } },
        },
      });

      // Send notification when task is assigned to a user
      if (assignedToId) {
        const assignedUserId = Number(assignedToId);

        try {
          const assignedUser = await prisma.user.findUnique({
            where: { id: assignedUserId },
            select: { id: true, email: true, fullName: true },
          });

          if (assignedUser) {

            // Create in-app notification
            try {
              const notification = await prisma.notification.create({
                data: {
                  userId: assignedUserId,
                  title: `Task assigned: ${title}`,
                  body: description ? description.slice(0, 200) : `You have been assigned a new task.${dueDate ? ` Due: ${new Date(dueDate).toLocaleDateString()}` : ''}`,
                  type: 'task_assigned',
                  entityType: 'Task',
                  entityId: task.id,
                },
              });
              
              // Push via SSE
              const { pushNotificationViaSSE, pushUnreadCountViaSSE } = await import("@/lib/notifications/push");
              await pushNotificationViaSSE(assignedUserId, notification);
              const unreadCount = await prisma.notification.count({
                where: { userId: assignedUserId, isRead: false },
              });
              await pushUnreadCountViaSSE(assignedUserId, unreadCount);
            } catch (notifErr: any) {
              console.error('[task-create] Failed to create in-app notification:', notifErr);
            }

            // Send email notification
            if (assignedUser.email) {
              try {
                const { sendAndLogEmail } = await import('@/lib/comms/email');
                const { getTaskAssignmentEmailHTML } = await import('@/templates/emails/taskAssignment.html');
                
                const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://new-11-15-final.vercel.app';
                const taskUrl = `${baseUrl}/tasks/${task.id}`;
                const dueDateStr = dueDate ? new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : undefined;
                const priorityLabel = priority || 'MEDIUM';

                const html = getTaskAssignmentEmailHTML({
                  taskTitle: title,
                  taskDescription: description || undefined,
                  priority: priorityLabel,
                  dueDate: dueDateStr,
                  ventureName: task.venture?.name,
                  assignedUserName: assignedUser.fullName || 'there',
                  taskUrl,
                });

                await sendAndLogEmail({
                  to: assignedUser.email,
                  subject: `Task Assigned: ${title}`,
                  html,
                  sentByUserId: user.id,
                });
              } catch (emailErr: any) {
                console.error('[task-create] Failed to send email notification:', emailErr);
              }
            }
          }
        } catch (err: any) {
          console.error('[task-create] Error in task assignment notification flow:', err);
          // Don't fail the request if notification fails
        }
      }

      return res.status(201).json({ id: task.id });
    } catch (error: any) {
      logger.error('api_request_error', {
        endpoint: '/api/tasks',
        userId: user.id,
        userRole: user.role,
        outcome: 'error',
      });
      console.error('Tasks POST error', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end();
}
