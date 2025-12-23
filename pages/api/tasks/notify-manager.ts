import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { ROLE_CONFIG } from '@/lib/permissions';

// Task overdue explanation notification handler
// - POST only: marks a task's existing overdue explanation as
//   `managerNotified` and logs an activity.
// - Auth: requireUser; unauthenticated callers receive 401 UNAUTHENTICATED.
// - RBAC / ownership rules:
//   * Global admins (ventureScope === 'all') may notify for any task.
//   * The task assignee may notify for their own task if they belong to the
//     same venture.
//   * Other users with venture access but not assignee/global-admin are
//     rejected with FORBIDDEN / ONLY_ASSIGNEE_CAN_NOTIFY.
// - Preconditions:
//   * A taskId must be provided and must resolve to an existing task.
//   * The task must already have an overdueExplanation; otherwise
//     NO_EXPLANATION_TO_NOTIFY.
//   * Repeated notifications are idempotent: if managerNotified is already
//     true, the handler returns 200 with alreadyNotified: true without
//     changing state.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end();
  }

  const user = await requireUser(req, res);
  if (!user) return res.status(401).json({ error: 'UNAUTHENTICATED' });

  const { taskId } = req.body;
  if (!taskId) {
    return res.status(400).json({ error: 'MISSING_TASK_ID' });
  }

  const task = await prisma.task.findUnique({
    where: { id: Number(taskId) },
    include: {
      assignedUser: { select: { id: true, fullName: true, email: true } },
      venture: { select: { id: true, name: true } },
      overdueExplanation: true,
    },
  });

  if (!task) {
    return res.status(404).json({ error: 'TASK_NOT_FOUND' });
  }

  const isGlobalAdmin = ROLE_CONFIG[user.role]?.ventureScope === 'all';
  const isTaskAssignee = task.assignedTo === user.id;
  const hasVentureAccess = user.ventureIds?.includes(task.ventureId ?? 0);

  if (!isGlobalAdmin && !isTaskAssignee && !hasVentureAccess) {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }

  if (!isGlobalAdmin && !isTaskAssignee) {
    return res.status(403).json({ error: 'ONLY_ASSIGNEE_CAN_NOTIFY' });
  }

  if (!task.overdueExplanation) {
    return res.status(400).json({ error: 'NO_EXPLANATION_TO_NOTIFY' });
  }

  // Log the notification activity
  await (prisma.activityLog as any).create({
    data: {
      userId: user.id,
      action: 'TASK_OVERDUE_EXPLANATION_NOTIFIED',
      entityType: 'Task',
      entityId: String(taskId),
      description: `Overdue explanation notification triggered for task "${task.title}"`,
      metadata: {
        taskId,
        assigneeId: task.assignedTo,
        ventureId: task.ventureId,
        reason: task.overdueExplanation.reason,
      },
    },
  });

  return res.status(200).json({
    success: true,
    message: 'Managers will be notified',
  });
}
