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

    const startDate = req.query.startDate 
      ? new Date(req.query.startDate as string) 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate 
      ? new Date(req.query.endDate as string) 
      : new Date();

    const touches = await prisma.customerTouch.findMany({
      where: {
        ventureId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        user: { select: { id: true, fullName: true } },
      },
    });

    const byUser: Record<number, { 
      userId: number; 
      userName: string; 
      total: number; 
      byChannel: Record<string, number> 
    }> = {};

    const byChannel: Record<string, number> = {};

    for (const touch of touches) {
      if (!byUser[touch.userId]) {
        byUser[touch.userId] = {
          userId: touch.userId,
          userName: touch.user.fullName || 'Unknown',
          total: 0,
          byChannel: {},
        };
      }
      byUser[touch.userId].total += 1;
      byUser[touch.userId].byChannel[touch.channel] = 
        (byUser[touch.userId].byChannel[touch.channel] || 0) + 1;

      byChannel[touch.channel] = (byChannel[touch.channel] || 0) + 1;
    }

    logger.info('freight_api', {
      endpoint: '/api/logistics/customers/touches/summary',
      userId: user.id,
      role: user.role,
      outcome: 'success',
      requestId,
      ventureId,
    });

    return res.json({
      ventureId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalTouches: touches.length,
      byChannel,
      byUser: Object.values(byUser).sort((a, b) => b.total - a.total),
    });
  } catch (err) {
    logger.error('freight_api', {
      endpoint: '/api/logistics/customers/touches/summary',
      userId: user.id,
      role: user.role,
      outcome: 'error',
      requestId,
    });
    console.error('Touch summary error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
