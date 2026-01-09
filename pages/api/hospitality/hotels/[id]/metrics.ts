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
      select: { ventureId: true, isTest: true },
    });

    if (!hotel) {
      return res.status(404).json({ error: 'Hotel not found' });
    }

    if (!scope.allVentures && !scope.ventureIds.includes(hotel.ventureId)) {
      return res.status(403).json({ error: 'Not authorized for this hotel' });
    }

    // Filter by hotel's isTest status if test mode is disabled
    // Note: HotelKpiDaily doesn't have isTest field, so we filter by hotel's isTest status
    if (!includeTest && hotel.isTest) {
      return res.json({
        metrics: [],
        summary: {
          totalRoomsAvailable: 0,
          totalRoomsSold: 0,
          occupancyPct: 0,
          adr: 0,
          revpar: 0,
          totalRoomRevenue: 0,
          lowOcc: false,
          lowRevpar: false,
        },
      });
    }

    // Get metrics - HotelKpiDaily doesn't have isTest field, so we only filter by hotelId
    const where: any = {
      hotelId,
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
