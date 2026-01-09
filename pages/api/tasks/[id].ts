import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '@/lib/scope';
import { canEditTasks, canAssignTasks } from '@/lib/permissions';
import { awardPointsForEvent } from '@/lib/gamification/awardPoints';

// Single-task handler
// - GET: returns a single task with venture/office/assignee metadata, only if
//   the current user has venture/office scope for that task.
// - PATCH: updates editable fields (title, description, status, priority,
//   dueDate, assignedTo) subject to:
//   * Auth via requireUser (401 UNAUTHENTICATED if missing).
//   * Venture/office scoping via getUserScope -> FORBIDDEN_VENTURE /
//     FORBIDDEN_OFFICE when out of scope.
//   * canEditTasks(user.role) required to change core fields; otherwise 403
//     FORBIDDEN.
//   * canAssignTasks(user.role) required when changing assignedToId; otherwise
//     403 FORBIDDEN_ASSIGN.
//   * Due dates must be valid and not in the past; invalid or past dates return
//     400 INVALID_DUE_DATE / DUE_DATE_CANNOT_BE_IN_PAST.
// - This route does not trigger notifications or EOD updates; other endpoints
//   (overdue-check, explanations, notify-manager) layer on top of these tasks.

function isDateInPast(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate < today;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return res.status(401).json({ error: 'UNAUTHENTICATED' });

  const { id } = req.query;
  const taskId = Number(id);

  if (!taskId || Number.isNaN(taskId)) {
    return res.status(400).json({ error: 'INVALID_ID' });
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      venture: true,
      office: true,
      creator: true,
      assignedUser: true,
      files: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fileName: true,
          sizeBytes: true,
        },
      },
    },
  });

  if (!task) return res.status(404).json({ error: 'NOT_FOUND' });

  const scope = getUserScope(user);

  if (
    !scope.allVentures &&
    task.ventureId &&
    !scope.ventureIds.includes(task.ventureId)
  ) {
    return res.status(403).json({ error: 'FORBIDDEN_VENTURE' });
  }
  if (
    !scope.allOffices &&
    task.officeId &&
    !scope.officeIds.includes(task.officeId)
  ) {
    return res.status(403).json({ error: 'FORBIDDEN_OFFICE' });
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      ventureId: task.ventureId,
      ventureName: task.venture?.name ?? null,
      officeId: task.officeId,
      officeName: task.office?.name ?? null,
      createdByName: task.creator?.fullName ?? null,
      assignedToId: task.assignedTo,
      assignedToName: task.assignedUser?.fullName ?? null,
      isTest: task.isTest,
      files: task.files,
    });
  }

  if (req.method === 'PATCH') {
    if (!canEditTasks(user.role)) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    const { title, description, status, priority, dueDate, assignedToId } = req.body;

    // Validate due date is not in the past (only if changing the due date)
    if (dueDate !== undefined && dueDate !== null) {
      const parsedDueDate = new Date(dueDate);
      if (isNaN(parsedDueDate.getTime())) {
        return res.status(400).json({ error: 'Invalid due date' });
      }
      if (isDateInPast(parsedDueDate)) {
        return res.status(400).json({ error: 'Due Date cannot be in past ' });
      }
    }

    // Check if user has permission to assign tasks when changing assignedToId
    if (assignedToId !== undefined && !canAssignTasks(user.role)) {
      return res.status(403).json({ error: 'FORBIDDEN_ASSIGN' });
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        title,
        description,
        status,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        assignedTo: assignedToId !== undefined ? (assignedToId ? Number(assignedToId) : null) : undefined,
      },
      include: {
        venture: { select: { id: true, name: true } },
      },
    });

    // Send notification when task is assigned to a user or reassigned
    if (assignedToId !== undefined && assignedToId !== null && assignedToId !== task.assignedTo) {
      const assignedUserId = Number(assignedToId);
      console.log('[task-assignment] ===== STARTING NOTIFICATION FLOW =====');
      console.log('[task-assignment] Task assignment detected:', {
        taskId,
        assignedUserId,
        previousAssignedTo: task.assignedTo,
        assignedBy: user.id,
      });
      
      try {
        console.log('[task-assignment] Looking up assigned user in database...');
        const assignedUser = await prisma.user.findUnique({
          where: { id: assignedUserId },
          select: { id: true, email: true, fullName: true },
        });

        if (!assignedUser) {
          console.warn('[task-assignment] User not found:', { assignedUserId });
        } else {
          console.log('[task-assignment] Assigned user found:', {
            userId: assignedUser.id,
            email: assignedUser.email,
            fullName: assignedUser.fullName,
            hasEmail: !!assignedUser.email,
          });

          // Use updated values if provided, otherwise use existing task values
          const taskTitle = title !== undefined ? title : task.title;
          const taskDescription = description !== undefined ? description : task.description;
          const taskDueDate = dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : task.dueDate;
          const taskPriority = priority !== undefined ? priority : task.priority;

          // Create in-app notification
          console.log('[task-assignment] ===== STEP 1: Creating in-app notification =====');
          try {
            console.log('[task-assignment] Creating notification record in database...');
            const notification = await prisma.notification.create({
              data: {
                userId: assignedUserId,
                title: `Task assigned: ${taskTitle}`,
                body: taskDescription ? taskDescription.slice(0, 200) : `You have been assigned a new task.${taskDueDate ? ` Due: ${new Date(taskDueDate).toLocaleDateString()}` : ''}`,
                type: 'task_assigned',
                entityType: 'Task',
                entityId: taskId,
              },
            });
            console.log('[task-assignment] ✅ SUCCESS: In-app notification created successfully in database');
            
            // Push via SSE
            const { pushNotificationViaSSE, pushUnreadCountViaSSE } = await import("@/lib/notifications/push");
            await pushNotificationViaSSE(assignedUserId, notification);
            const unreadCount = await prisma.notification.count({
              where: { userId: assignedUserId, isRead: false },
            });
            await pushUnreadCountViaSSE(assignedUserId, unreadCount);
          } catch (notifErr: any) {
            console.error('[task-assignment] ❌ FAILED: In-app notification creation failed:', {
              error: notifErr,
              message: notifErr?.message,
              stack: notifErr?.stack,
              userId: assignedUserId,
              taskId,
            });
          }

          // Send email notification
          console.log('[task-assignment] ===== STEP 2: Sending email notification =====');
          console.log('[task-assignment] Checking if email should be sent:', {
            hasEmail: !!assignedUser.email,
            email: assignedUser.email || 'null',
          });
          
          if (assignedUser.email) {
            console.log('[task-assignment] ✅ Email address found, proceeding with email notification:', {
              to: assignedUser.email,
              taskId,
              taskTitle: taskTitle,
            });
            
            try {
              console.log('[task-assignment] Importing sendAndLogEmail function from @/lib/comms/email...');
              const { sendAndLogEmail } = await import('@/lib/comms/email');
              console.log('[task-assignment] ✅ sendAndLogEmail imported successfully');
              
              const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://new-11-15-final.vercel.app';
              const taskUrl = `${baseUrl}/tasks/${taskId}`;
              const dueDateStr = taskDueDate ? new Date(taskDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not specified';
              const priorityLabel = taskPriority || 'MEDIUM';

              console.log('[task-assignment] Email parameters prepared:', {
                to: assignedUser.email,
                subject: `Task Assigned: ${taskTitle}`,
                baseUrl,
                taskUrl,
                sentByUserId: user.id,
                hasBaseUrl: !!baseUrl,
              });

              console.log('[task-assignment] Calling sendAndLogEmail function...');
              const { getTaskAssignmentEmailHTML } = await import('@/templates/emails/taskAssignment.html');
              
              const html = getTaskAssignmentEmailHTML({
                taskTitle,
                taskDescription: taskDescription || undefined,
                priority: priorityLabel,
                dueDate: dueDateStr !== 'Not specified' ? dueDateStr : undefined,
                ventureName: updated.venture?.name,
                assignedUserName: assignedUser.fullName || 'there',
                taskUrl,
              });

              const emailResult = await sendAndLogEmail({
                to: assignedUser.email,
                subject: `Task Assigned: ${taskTitle}`,
                html,
                sentByUserId: user.id,
              });
              
              console.log('[task-assignment] ✅ Email send function completed. Result:', {
                to: assignedUser.email,
                status: emailResult.status,
                errorMessage: emailResult.errorMessage,
                success: emailResult.status === 'SENT',
              });
              
              if (emailResult.status === 'SENT') {
                console.log('[task-assignment] ✅✅✅ SUCCESS: Email notification sent successfully!');
              } else {
                console.error('[task-assignment] ❌❌❌ FAILED: Email notification failed to send:', {
                  status: emailResult.status,
                  errorMessage: emailResult.errorMessage,
                });
              }
            } catch (emailErr: any) {
              console.error('[task-assignment] ❌❌❌ EXCEPTION: Failed to send email notification:', {
                error: emailErr,
                message: emailErr?.message,
                stack: emailErr?.stack,
                to: assignedUser.email,
                taskId,
              });
            }
          } else {
            console.warn('[task-assignment] ⚠️ SKIPPED: User has no email address, skipping email notification:', {
              userId: assignedUser.id,
              fullName: assignedUser.fullName,
            });
          }
          
          console.log('[task-assignment] ===== NOTIFICATION FLOW COMPLETED =====');
        }
      } catch (err: any) {
        console.error('[task-assignment] Error in task assignment notification flow:', {
          error: err,
          message: err?.message,
          stack: err?.stack,
          taskId,
          assignedUserId,
        });
        // Don't fail the request if notification fails
      }
    } else {
      console.log('[task-assignment] No assignment change detected:', {
        taskId,
        assignedToId,
        currentAssignedTo: task.assignedTo,
      });
    }

    // Award gamification points when task status changes to DONE
    if (status === 'DONE' && task.status !== 'DONE' && task.ventureId) {
      const assignee = task.assignedTo ?? user.id;
      awardPointsForEvent(assignee, task.ventureId, 'TASK_COMPLETED', {
        officeId: task.officeId,
        metadata: { taskId },
        idempotencyKey: `task-completed-${taskId}`,
      }).catch(err => console.error('[gamification] Task completed award error:', err));
    }

    return res.status(200).json({ id: updated.id });
  }

  res.setHeader('Allow', ['GET', 'PATCH']);
  return res.status(405).end();
}
