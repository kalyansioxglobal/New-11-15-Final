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
        return res.status(400).json({ error: 'INVALID_DUE_DATE' });
      }
      if (isDateInPast(parsedDueDate)) {
        return res.status(400).json({ error: 'DUE_DATE_CANNOT_BE_IN_PAST' });
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
    });

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
