import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { canViewPortfolioResource } from "@/lib/permissions";

import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '@/lib/scope';
import { logger } from '@/lib/logger';
import { generateRequestId } from '@/lib/requestId';
import { getCached } from '@/lib/cache/simple';

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
  const user = await requireUser(req, res);
  if (!user) return;
  if (!canViewPortfolioResource(user, "LOGISTICS_DASHBOARD_VIEW")) {
    return res.status(403).json({ error: 'Forbidden: insufficient permissions for logistics dashboard' });
  }

  const requestId = (req.headers && (req.headers["x-request-id"] as string)) || generateRequestId();

  try {
    const scope = getUserScope(user);
    const ventureId = req.query.ventureId ? Number(req.query.ventureId) : undefined;
    const includeTest = req.query.includeTest === 'true';

    if (!ventureId) {
      return res.status(400).json({ error: 'ventureId is required' });
    }

    if (!scope.allVentures && !scope.ventureIds.includes(ventureId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Use cached dashboard data (5 minute TTL)
    const cacheKey = `dashboard:logistics:${ventureId}:${includeTest}`;
    
    const dashboardData = await getCached(cacheKey, 300, async () => {
      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      const sevenStart = startOfDay(sevenDaysAgo);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
      const thirtyStart = startOfDay(thirtyDaysAgo);

      const baseWhere: any = {
        ventureId,
      };
      if (!includeTest) {
        baseWhere.isTest = false;
      }

    const loadsToday = await prisma.load.findMany({
      where: {
        ...baseWhere,
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    const totalToday = loadsToday.length;
    const coveredToday = loadsToday.filter(l => l.status === 'COVERED').length;
    const openToday = loadsToday.filter(l => l.status === 'OPEN').length;
    const coverageToday = totalToday > 0 ? coveredToday / totalToday : 0;

    const last7Loads = await prisma.load.findMany({
      where: {
        ...baseWhere,
        createdAt: {
          gte: sevenStart,
          lte: todayEnd,
        },
        AND: [
          { buyRate: { not: null } },
          { sellRate: { not: null } },
        ],
      },
    });

    let margin7 = 0;
    for (const l of last7Loads) {
      margin7 += (l.sellRate || 0) - (l.buyRate || 0);
    }
    const avgMargin7 = last7Loads.length ? margin7 / last7Loads.length : 0;

    const statusCountsRaw = await prisma.load.groupBy({
      by: ['status'],
      where: baseWhere,
      _count: { _all: true },
    });

    const statusCounts: Record<string, number> = {};
    statusCountsRaw.forEach(row => {
      if (row.status) {
        statusCounts[row.status] = row._count._all;
      }
    });

    const leaderboardRaw = await prisma.load.groupBy({
      by: ['createdById'],
      where: {
        ...baseWhere,
        createdAt: {
          gte: sevenStart,
          lte: todayEnd,
        },
      },
      _count: { _all: true },
    });

    const userIds = leaderboardRaw.map(l => l.createdById).filter(Boolean) as number[];

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fullName: true },
    });

    const userMap = new Map(users.map(u => [u.id, u.fullName]));

    const leaderboard = leaderboardRaw
      .map(row => ({
        userId: row.createdById,
        name: row.createdById ? userMap.get(row.createdById) || 'Unknown' : 'Unknown',
        loadsCreated: row._count._all,
      }))
      .sort((a, b) => b.loadsCreated - a.loadsCreated)
      .slice(0, 10);

    const officeGroupRaw = await prisma.load.groupBy({
      by: ['officeId', 'status'],
      where: {
        ...baseWhere,
        createdAt: {
          gte: sevenStart,
          lte: todayEnd,
        },
      },
      _count: { _all: true },
    });

    const officeIds = Array.from(
      new Set(officeGroupRaw.map(row => row.officeId).filter(Boolean))
    ) as number[];

    const offices = await prisma.office.findMany({
      where: { id: { in: officeIds } },
      select: { id: true, name: true, city: true },
    });

    const officeMap = new Map(
      offices.map(o => [o.id, `${o.name || ''}${o.city ? ` (${o.city})` : ''}`.trim()])
    );

    type OfficeStats = {
      officeId: number | null;
      officeName: string;
      total: number;
      open: number;
      covered: number;
      lost: number;
      dormant: number;
      working: number;
      coveragePct: number;
      lostPct: number;
    };

    const officeStatsMap = new Map<string, OfficeStats>();

    for (const row of officeGroupRaw) {
      const key = row.officeId !== null ? String(row.officeId) : 'UNASSIGNED';
      if (!officeStatsMap.has(key)) {
        const officeName =
          row.officeId && officeMap.get(row.officeId)
            ? officeMap.get(row.officeId)!
            : row.officeId
            ? 'Office ' + row.officeId
            : 'Unassigned';

        officeStatsMap.set(key, {
          officeId: row.officeId,
          officeName,
          total: 0,
          open: 0,
          covered: 0,
          lost: 0,
          dormant: 0,
          working: 0,
          coveragePct: 0,
          lostPct: 0,
        });
      }
      const stat = officeStatsMap.get(key)!;
      stat.total += row._count._all;
      switch (row.status) {
        case 'OPEN':
          stat.open += row._count._all;
          break;
        case 'COVERED':
          stat.covered += row._count._all;
          break;
        case 'LOST':
          stat.lost += row._count._all;
          break;
        case 'DORMANT':
          stat.dormant += row._count._all;
          break;
        case 'WORKING':
          stat.working += row._count._all;
          break;
      }
    }

    for (const stat of officeStatsMap.values()) {
      stat.coveragePct = stat.total > 0 ? Number(((stat.covered / stat.total) * 100).toFixed(1)) : 0;
      stat.lostPct = stat.total > 0 ? Number(((stat.lost / stat.total) * 100).toFixed(1)) : 0;
    }

    const officeStats = Array.from(officeStatsMap.values()).sort((a, b) => b.total - a.total);

    const lostWhere = {
      ...baseWhere,
      status: 'LOST' as const,
      createdAt: {
        gte: thirtyStart,
        lte: todayEnd,
      },
    };

    const lostByCategory = await prisma.load.groupBy({
      by: ['lostReasonCategory'],
      where: lostWhere,
      _count: { _all: true },
    });

    const lostByReason = await prisma.load.groupBy({
      by: ['lostReason'],
      where: {
        ...lostWhere,
        lostReason: { not: null },
      },
      _count: { _all: true },
    });

    const lostReasons = {
      byCategory: lostByCategory
        .map(r => ({
          category: r.lostReasonCategory || 'UNSPECIFIED',
          count: r._count._all,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      byReason: lostByReason
        .map(r => ({
          reason: r.lostReason || 'UNSPECIFIED',
          count: r._count._all,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };

    logger.info("freight_api", {
      endpoint: "/api/logistics/dashboard",
      userId: user.id,
      role: user.role,
      outcome: "success",
      requestId,
    });

      return {
        today: {
          totalToday,
          coveredToday,
          openToday,
          coverageToday,
        },
        last7: {
          margin7,
          avgMargin7,
        },
        statusCounts,
        leaderboard,
        officeStats,
        lostReasons,
      };
    });

    // Set cache headers
    res.setHeader('Cache-Control', 'private, max-age=300'); // 5 minutes

    return res.json(dashboardData);
  } catch (err: any) {
    logger.error("freight_api", {
      endpoint: "/api/logistics/dashboard",
      userId: user.id,
      role: user.role,
      outcome: "error",
      requestId,
      ventureId: req.query.ventureId,
      error: err?.message || String(err),
      stack: process.env.NODE_ENV !== 'production' ? err?.stack : undefined,
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
