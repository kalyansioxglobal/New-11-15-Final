import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { canManageUsers } from '../../../lib/permissions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    if (!canManageUsers(user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const limit = req.query.limit ? Number(req.query.limit) : 100;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    const where: any = {};

    if (from || to) {
      where.startedAt = {};
      if (from) where.startedAt.gte = new Date(from);
      if (to) where.startedAt.lte = new Date(to);
    }

    const logs = await prisma.impersonationLog.findMany({
      where,
      include: {
        initiator: { select: { id: true, fullName: true, email: true, role: true } },
        impersonated: { select: { id: true, fullName: true, email: true, role: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });

    return res.json(logs);
  } catch (err) {
    console.error('Impersonation log API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
