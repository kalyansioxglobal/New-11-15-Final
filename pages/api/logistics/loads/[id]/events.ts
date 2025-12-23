import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../../lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '../../../../../lib/scope';
import { canCreateTasks } from '../../../../../lib/permissions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const loadId = Number(id);

  if (isNaN(loadId)) {
    return res.status(400).json({ error: 'Invalid load ID' });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const scope = getUserScope(user);

    const load = await prisma.load.findUnique({
      where: { id: loadId },
      select: { id: true, ventureId: true },
    });

    if (!load) {
      return res.status(404).json({ error: 'Load not found' });
    }

    if (!scope.allVentures && load.ventureId && !scope.ventureIds.includes(load.ventureId)) {
      return res.status(403).json({ error: 'Not authorized for this venture' });
    }

    if (load.ventureId) {
      const { assertCanAccessVenture } = await import('../../../../../lib/scope');
      assertCanAccessVenture(scope, load.ventureId);
    }

    if (req.method === 'GET') {
      const events = await prisma.logisticsLoadEvent.findMany({
        where: { loadId },
        include: {
          createdBy: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      return res.json(events);
    }

    if (req.method === 'POST') {
      if (!canCreateTasks(user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { type, payload, message } = req.body;

      if (!type) {
        return res.status(400).json({ error: 'Event type is required' });
      }

      const event = await prisma.logisticsLoadEvent.create({
        data: {
          loadId,
          type,
          data: payload || {},
          message: message || null,
          createdById: user.id,
        },
        include: {
          createdBy: { select: { id: true, fullName: true, email: true } },
        },
      });

      return res.status(201).json(event);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Load events API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
