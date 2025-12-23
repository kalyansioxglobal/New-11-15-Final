import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { canViewPortfolioResource } from "@/lib/permissions";

import { getUserScope } from '../../../lib/scope';

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  if (!canViewPortfolioResource(user, "HOTEL_PORTFOLIO_VIEW")) {
    return res.status(403).json({ error: 'Forbidden', detail: 'Insufficient permissions for hotel portfolio dashboard' });
  }

  try {
    const scope = getUserScope(user);
    const ventureId = req.query.ventureId ? Number(req.query.ventureId) : undefined;
    const includeTest = req.query.includeTest === 'true';

    const now = new Date();
    const todayEnd = endOfDay(now);

    // Fixed 7-day window for hospitality dashboard (last 7 days including today)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const sevenStart = startOfDay(sevenDaysAgo);

    // Fixed 30-day window for review-related metrics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    const thirtyStart = startOfDay(thirtyDaysAgo);

    const hotelWhere: any = {
      status: 'ACTIVE',
      ...(includeTest ? {} : { isTest: false }),
    };

    if (ventureId) {
      hotelWhere.ventureId = ventureId;
    } else if (!scope.allVentures) {
      hotelWhere.ventureId = { in: scope.ventureIds };
    }

    const hotels = await prisma.hotelProperty.findMany({
      where: hotelWhere,
      include: {
        venture: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });

    const hotelIds = hotels.map((h: (typeof hotels)[number]) => h.id);

    const metrics = await prisma.hotelKpiDaily.findMany({
      where: {
        hotelId: { in: hotelIds },
        date: {
          gte: sevenStart,
          lte: todayEnd,
        },
      },
    });

    type HotelAgg = {
      hotelId: number;
      days: number;
      occSum: number;
      adrSum: number;
      revparSum: number;
      revenueSum: number;
    };

    const aggMap = new Map<number, HotelAgg>();

    for (const m of metrics) {
      if (!aggMap.has(m.hotelId)) {
        aggMap.set(m.hotelId, {
          hotelId: m.hotelId,
          days: 0,
          occSum: 0,
          adrSum: 0,
          revparSum: 0,
          revenueSum: 0,
        });
      }
      const agg = aggMap.get(m.hotelId)!;
      agg.days += 1;
      agg.occSum += m.occupancyPct || 0;
      agg.adrSum += m.adr || 0;
      agg.revparSum += m.revpar || 0;
      agg.revenueSum += m.totalRevenue || 0;
    }

    const hotelCards = hotels.map((h: (typeof hotels)[number]) => {
      const agg = aggMap.get(h.id);
      const avgOcc = agg && agg.days ? agg.occSum / agg.days : 0;
      const avgAdr = agg && agg.days ? agg.adrSum / agg.days : 0;
      const avgRevpar = agg && agg.days ? agg.revparSum / agg.days : 0;
      const totalRevenue = agg ? agg.revenueSum : 0;
      return {
        id: h.id,
        name: h.name,
        brand: h.brand,
        city: h.city,
        state: h.state,
        rooms: h.rooms,
        venture: h.venture,
        avgOcc,
        avgAdr,
        avgRevpar,
        totalRevenue,
      };
    });

    const totalRooms = hotels.reduce(
      (sum: number, h: (typeof hotels)[number]) => sum + (h.rooms || 0),
      0,
    );
    const globalRevpar =
      hotelCards.length > 0
        ?
            hotelCards.reduce(
              (sum: number, c: (typeof hotelCards)[number]) => sum + (c.avgRevpar || 0),
              0,
            ) / hotelCards.length
        : 0;
    const globalOcc =
      hotelCards.length > 0
        ?
            hotelCards.reduce(
              (sum: number, c: (typeof hotelCards)[number]) => sum + (c.avgOcc || 0),
              0,
            ) / hotelCards.length
        : 0;
    const globalAdr =
      hotelCards.length > 0
        ?
            hotelCards.reduce(
              (sum: number, c: (typeof hotelCards)[number]) => sum + (c.avgAdr || 0),
              0,
            ) / hotelCards.length
        : 0;
    const totalRevenue7d = hotelCards.reduce(
      (sum: number, c: (typeof hotelCards)[number]) => sum + c.totalRevenue,
      0,
    );

    const reviewWhere: any = {
      hotelId: { in: hotelIds },
      ...(includeTest ? {} : { isTest: false }),
    };

    const allReviews = await prisma.hotelReview.findMany({
      where: reviewWhere,
      select: {
        hotelId: true,
        rating: true,
        reviewDate: true,
        responseText: true,
        source: true,
      },
    });

    const totalReviews = allReviews.length;
    const ratedReviews = allReviews.filter(
      (r: (typeof allReviews)[number]) => r.rating != null,
    );
    const avgRating =
      ratedReviews.length > 0
        ?
            ratedReviews.reduce(
              (sum: number, r: (typeof ratedReviews)[number]) => sum + (r.rating || 0),
              0,
            ) / ratedReviews.length
        : null;

    const recentReviews = allReviews.filter(
      (r: (typeof allReviews)[number]) =>
        r.reviewDate && r.reviewDate >= thirtyStart && r.reviewDate <= todayEnd,
    );

    const unrespondedReviews = allReviews.filter(
      (r: (typeof allReviews)[number]) => !r.responseText,
    );

    const sourceCounts: Record<string, number> = {};
    for (const r of allReviews) {
      sourceCounts[r.source] = (sourceCounts[r.source] || 0) + 1;
    }

    const topPerformers = [...hotelCards]
      .sort((a, b) => b.avgRevpar - a.avgRevpar)
      .slice(0, 5);

    const underperformers = [...hotelCards]
      .filter(h => h.avgOcc > 0)
      .sort((a, b) => a.avgOcc - b.avgOcc)
      .slice(0, 5);

    return res.json({
      summary: {
        hotelCount: hotels.length,
        totalRooms,
        globalRevpar,
        globalOcc,
        globalAdr,
        totalRevenue7d,
        totalReviews,
        avgRating,
        recentReviewCount: recentReviews.length,
        unrespondedCount: unrespondedReviews.length,
        sourceCounts,
      },
      hotels: hotelCards,
      topPerformers,
      underperformers,
    });
  } catch (err) {
    console.error('Hospitality dashboard error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
