import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { ROLE_CONFIG } from '@/lib/permissions';

// Missed EOD explanation notification handler
// - POST only: marks a missedEodExplanation as managerNotified and logs an
//   activity entry.
// - Auth: requireUser; unauthenticated requests receive 401 UNAUTHENTICATED.
// - RBAC / ownership rules:
//   * Global admins (ventureScope === 'all') may notify for any explanation.
//   * The explanation owner may notify for their own record if they belong to
//     the same venture.
//   * Others with venture access but not owner/global-admin are rejected with
//     FORBIDDEN / ONLY_OWNER_CAN_NOTIFY.
// - Idempotency:
//   * If managerNotified is already true, the handler returns 200 with
//     alreadyNotified: true without making changes.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end();
  }

  const user = await requireUser(req, res);
  if (!user) return res.status(401).json({ error: 'UNAUTHENTICATED' });

  const { explanationId } = req.body;
  if (!explanationId) {
    return res.status(400).json({ error: 'MISSING_EXPLANATION_ID' });
  }

  const explanation = await (prisma as any).missedEodExplanation.findUnique({
    where: { id: Number(explanationId) },
    include: {
      user: { select: { id: true, fullName: true, email: true } },
      venture: { select: { id: true, name: true } },
    },
  });

  if (!explanation) {
    return res.status(404).json({ error: 'EXPLANATION_NOT_FOUND' });
  }

  const isGlobalAdmin = ROLE_CONFIG[user.role]?.ventureScope === 'all';
  const isExplanationOwner = explanation.userId === user.id;
  const hasVentureAccess = user.ventureIds?.includes(explanation.ventureId);

  if (!isGlobalAdmin && !isExplanationOwner && !hasVentureAccess) {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }

  if (!isGlobalAdmin && !isExplanationOwner) {
    return res.status(403).json({ error: 'ONLY_OWNER_CAN_NOTIFY' });
  }

  if (explanation.managerNotified) {
    return res.status(200).json({ message: 'Already notified', alreadyNotified: true });
  }

  await (prisma as any).missedEodExplanation.update({
    where: { id: explanation.id },
    data: {
      managerNotified: true,
      notifiedAt: new Date(),
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'MISSED_EOD_EXPLANATION_NOTIFIED',
      module: 'eod-reports',
      entityType: 'MissedEodExplanation',
      entityId: String(explanationId),
      description: `Missed EOD explanation notification triggered for ${explanation.user.fullName || explanation.user.email}`,
      metadata: {
        explanationId,
        employeeId: explanation.userId,
        ventureId: explanation.ventureId,
      },
    },
  });

  return res.status(200).json({
    success: true,
    message: 'Managers will be notified',
  });
}
