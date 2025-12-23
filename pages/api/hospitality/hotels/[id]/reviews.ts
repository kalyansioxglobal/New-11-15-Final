import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../../lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '../../../../../lib/scope';

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
    const limit = Number(req.query.limit) || 100;
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

    // Get reviews
    const where: any = {
      hotelId,
      ...(includeTest ? {} : { isTest: false }),
    };

    const [reviews, total] = await Promise.all([
      prisma.hotelReview.findMany({
        where,
        include: {
          hotel: { select: { id: true, name: true, brand: true } },
          respondedBy: { select: { id: true, fullName: true } },
        },
        orderBy: { reviewDate: 'desc' },
        take: Math.min(limit, 200),
      }),
      prisma.hotelReview.count({ where }),
    ]);

    // Calculate summary
    const summary = {
      total,
      averageRating: reviews.length > 0
        ? reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviews.length
        : 0,
      bySource: reviews.reduce((acc: Record<string, number>, r: any) => {
        const source = r.source || 'UNKNOWN';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      unresponded: reviews.filter((r: any) => !r.responseText).length,
    };

    return res.json({
      reviews,
      summary,
    });
  } catch (err) {
    console.error('Hotel reviews API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
