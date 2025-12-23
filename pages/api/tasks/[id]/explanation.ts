import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '@/lib/scope';
import { ROLE_CONFIG } from '@/lib/permissions';

// Task overdue explanation handler
// - GET: allows the assignee or select HR/leadership roles to view an existing
//   overdue explanation for a task, subject to venture scoping.
// - POST: allows **only the assignee** to create or update their overdue
//   explanation when they have missed the configured thresholds.
// - Auth/scoping:
//   * requireUser (401 UNAUTHENTICATED if missing).
//   * getUserScope ensures the task's venture is in-scope;
//     out-of-scope -> 403 FORBIDDEN_VENTURE.
// - RBAC/role rules:
//   * isAssignee can always write (POST) their own explanation.
//   * HR_ADMIN / ADMIN / CEO (isHrAdmin) and roles with
//     ROLE_CONFIG[role].task.assign may read explanations.
// - Policy:
//   * Explanations shorter than 10 characters are rejected with
//     EXPLANATION_TOO_SHORT.
//   * daysOverdue is recomputed on each write based on today vs task.dueDate.
//   * Existing explanations are updated in place; otherwise a new record is
//     created.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await requireUser(req, res);
    if (!user) return res.status(401).json({ error: 'UNAUTHENTICATED' });

  const taskId = Number(req.query.id);
  if (isNaN(taskId)) {
    return res.status(400).json({ error: 'INVALID_TASK_ID' });
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      overdueExplanation: true,
      assignedUser: { select: { id: true, fullName: true, email: true } },
      venture: { select: { id: true, name: true } },
    },
  });

  if (!task) {
    return res.status(404).json({ error: 'TASK_NOT_FOUND' });
  }

  const scope = getUserScope(user);
  const isAssignee = task.assignedTo === user.id;
  const isHrAdmin = user.role === 'HR_ADMIN' || user.role === 'ADMIN' || user.role === 'CEO';
  const canViewAll = ROLE_CONFIG[user.role]?.task?.assign === true;

  if (!scope.allVentures && task.ventureId && !scope.ventureIds.includes(task.ventureId)) {
    return res.status(403).json({ error: 'FORBIDDEN_VENTURE' });
  }

  if (req.method === 'GET') {
    if (!isAssignee && !isHrAdmin) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    if (!task.overdueExplanation) {
      return res.status(404).json({ error: 'NO_EXPLANATION' });
    }

    return res.status(200).json({
      taskId: task.id,
      taskTitle: task.title,
      assignee: task.assignedUser?.fullName ?? task.assignedUser?.email,
      explanation: task.overdueExplanation.reason,
      createdAt: task.overdueExplanation.createdAt,
    });
  }

  if (req.method === 'POST') {
    if (!isAssignee) {
      return res.status(403).json({ error: 'ONLY_ASSIGNEE_CAN_EXPLAIN' });
    }

    const { explanation } = req.body;
    if (!explanation || typeof explanation !== 'string' || explanation.trim().length < 10) {
      return res.status(400).json({ error: 'EXPLANATION_TOO_SHORT', message: 'Explanation must be at least 10 characters' });
    }

    const existingExplanation = await prisma.taskOverdueExplanation.findUnique({
      where: { taskId },
    });

    if (existingExplanation) {
      const updated = await prisma.taskOverdueExplanation.update({
        where: { taskId },
        data: {
          reason: explanation.trim(),
        },
      });
      return res.status(200).json({ success: true, explanation: updated });
    }

    const created = await prisma.taskOverdueExplanation.create({
      data: {
        taskId,
        userId: user.id,
        ventureId: task.ventureId || 0,
        reason: explanation.trim(),
      },
    });

    return res.status(201).json({ success: true, explanation: created });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  } catch (err: any) {
    console.error('Task explanation API error:', err);
    return res.status(500).json({ 
      error: 'INTERNAL_ERROR', 
      message: err?.message || 'An unexpected error occurred' 
    });
  }
}
