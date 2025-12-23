import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '@/lib/scope';

// Overdue tasks check
// - GET only: returns a summary of overdue tasks for a target user (defaulting
//   to the current user) and whether explanations are required/present.
// - Auth: requireUser (401 UNAUTHENTICATED if missing).
// - Scoping:
//   * getUserScope(user) is used to ensure a non-global viewer cannot run the
//     check for other users outside their venture scope; if targetUserId !==
//     user.id and !scope.allVentures, the call is rejected with 403 FORBIDDEN.
// - Policy:
//   * PRIORITY_THRESHOLDS define how many days overdue (by priority) before an
//     explanation is required:
//       - CRITICAL/HIGH: 3 days
//       - MEDIUM: 7 days
//       - LOW: 14 days
//   * Only OPEN / IN_PROGRESS / BLOCKED tasks with dueDate < today are
//     considered.
//   * The response includes per-task flags (requiresExplanation,
//     hasExplanation) and aggregate counts (requiresExplanation, explained).
// - This endpoint **does not** create or modify explanations; it only reports
//   state. Explanations are managed via /tasks/[id]/explanation.

const PRIORITY_THRESHOLDS: Record<string, number> = {
  CRITICAL: 3,
  HIGH: 3,
  MEDIUM: 7,
  LOW: 14,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    }

    const user = await requireUser(req, res);
    if (!user) return res.status(401).json({ error: 'UNAUTHENTICATED' });

  const scope = getUserScope(user);
  const includeTest = req.query.includeTest === 'true';
  const { userId } = req.query;

  const targetUserId = userId ? Number(userId) : user.id;
  if (targetUserId !== user.id && !scope.allVentures) {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const where: any = {
    assignedTo: targetUserId,
    status: { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED'] },
    dueDate: { lt: today },
  };

  if (!includeTest) where.isTest = false;

  const overdueTasks = await (prisma as any).task.findMany({
    where,
    include: {
      venture: { select: { id: true, name: true } },
      office: { select: { id: true, name: true } },
      overdueExplanation: true,
    },
    orderBy: { dueDate: 'asc' },
  });

  const flaggedTasks = overdueTasks.map((task: any) => {
    const dueDate = new Date(task.dueDate!);
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    const threshold = PRIORITY_THRESHOLDS[task.priority] || 7;
    const requiresExplanation = daysOverdue >= threshold;
    const hasExplanation = !!task.overdueExplanation;

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      daysOverdue,
      threshold,
      requiresExplanation,
      hasExplanation,
      explanation: task.overdueExplanation?.explanation ?? null,
      explanationDate: task.overdueExplanation?.createdAt ?? null,
      managerNotified: task.overdueExplanation?.managerNotified ?? false,
      venture: task.venture?.name ?? null,
      office: task.office?.name ?? null,
    };
  });

  const requiresAction = flaggedTasks.filter((t: typeof flaggedTasks[0]) => t.requiresExplanation && !t.hasExplanation);
  const explained = flaggedTasks.filter((t: typeof flaggedTasks[0]) => t.requiresExplanation && t.hasExplanation);

  return res.status(200).json({
    userId: targetUserId,
    totalOverdue: overdueTasks.length,
    requiresExplanation: requiresAction.length,
    explained: explained.length,
    tasks: flaggedTasks,
    thresholds: PRIORITY_THRESHOLDS,
  });
  } catch (err: any) {
    console.error('Overdue check API error:', err);
    return res.status(500).json({ 
      error: 'INTERNAL_ERROR', 
      message: err?.message || 'An unexpected error occurred' 
    });
  }
}
