import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { can } from '@/lib/permissions';
import { logger } from '@/lib/logger';
import { generateRequestId } from '@/lib/requestId';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  const requestId = (req.headers && (req.headers['x-request-id'] as string)) || generateRequestId();

  try {
    const ventureId = Number(req.query.ventureId) || user.ventureIds?.[0];
    
    if (!ventureId) {
      return res.status(400).json({ error: 'ventureId is required' });
    }

    if (!can(user, 'view', 'TASK', { ventureId })) {
      return res.status(403).json({ error: 'Not allowed to view this venture' });
    }

    const dormantDays = Number(req.query.dormantDays) || 14;
    const dormantCutoff = new Date(Date.now() - dormantDays * 24 * 60 * 60 * 1000);

    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;

    const whereClause = {
      ventureId,
      isActive: true,
      OR: [
        { lastTouchAt: null },
        { lastTouchAt: { lt: dormantCutoff } },
      ],
    };

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where: whereClause,
        orderBy: [
          { lastTouchAt: { sort: 'asc', nulls: 'first' } },
          { lastLoadDate: { sort: 'desc', nulls: 'last' } },
        ],
        take: limit,
        skip: offset,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          lastTouchAt: true,
          lastLoadDate: true,
          churnStatus: true,
          churnRiskScore: true,
          lifecycleStatus: true,
          salesRep: { select: { id: true, fullName: true } },
          csr: { select: { id: true, fullName: true } },
          lastTouchBy: { select: { id: true, fullName: true } },
          _count: {
            select: { loads: true, touches: true },
          },
        },
      }),
      prisma.customer.count({ where: whereClause }),
    ]);

    const enrichedCustomers = customers.map((c) => {
      const daysSinceTouch = c.lastTouchAt 
        ? Math.floor((Date.now() - new Date(c.lastTouchAt).getTime()) / (1000 * 60 * 60 * 24))
        : null;
      const daysSinceLoad = c.lastLoadDate
        ? Math.floor((Date.now() - new Date(c.lastLoadDate).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        ...c,
        daysSinceTouch,
        daysSinceLoad,
        totalLoads: c._count.loads,
        totalTouches: c._count.touches,
      };
    });

    logger.info('freight_api', {
      endpoint: '/api/freight/dormant-customers',
      userId: user.id,
      role: user.role,
      outcome: 'success',
      requestId,
      ventureId,
      dormantDays,
    });

    return res.json({
      customers: enrichedCustomers,
      total,
      limit,
      offset,
      dormantDays,
      dormantCutoff: dormantCutoff.toISOString(),
    });
  } catch (err) {
    logger.error('freight_api', {
      endpoint: '/api/freight/dormant-customers',
      userId: user.id,
      role: user.role,
      outcome: 'error',
      requestId,
    });
    console.error('Dormant customers error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
