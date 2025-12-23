import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../../lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '../../../../../lib/scope';
import { summarizeHotelKpis } from '@/lib/kpiHotel';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query as { id: string };
  const hotelId = Number(id);

  if (isNaN(hotelId)) {
    return res.status(400).json({ error: 'Invalid hotel ID' });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const scope = getUserScope(user);
    const limit = Number(req.query.limit) || 30;
    const includeTest = req.query.includeTest === 'true';

    // Verify hotel exists and user has access
    const hotel = await prisma.hotelProperty.findUnique({
      where: { id: hotelId },
      select: { ventureId: true },
    });

    if (!hotel) {
      return res.status(404).json({ error: 'Hotel not found' });
    }

    if (!scope.allVentures && !scope.ventureIds.includes(hotel.ventureId)) {
      return res.status(403).json({ error: 'Not authorized for this hotel' });
    }

    // Get metrics
    const where: any = {
      hotelId,
      ...(includeTest ? {} : { isTest: false }),
    };

    const metrics = await prisma.hotelKpiDaily.findMany({
      where,
      orderBy: { date: 'desc' },
      take: Math.min(limit, 200),
    });

    const summary = summarizeHotelKpis(metrics);

    return res.json({
      metrics,
      summary,
    });
  } catch (err) {
    console.error('Hotel metrics API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
