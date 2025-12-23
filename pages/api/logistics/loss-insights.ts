import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { canViewPortfolioResource } from "@/lib/permissions";

import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '@/lib/scope';
import {
  LOST_REASON_CONFIGS,
} from '@/lib/logisticsLostReasons';
import { logger } from '@/lib/logger';
import { generateRequestId } from '@/lib/requestId';

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

  const requestId = (req.headers && (req.headers["x-request-id"] as string)) || generateRequestId();

  logger.info("freight_api", {
    endpoint: "/api/logistics/loss-insights",
    userId: user.id,
    role: user.role,
    outcome: "start",
    requestId,
  });

  if (!canViewPortfolioResource(user, "LOGISTICS_LOSS_INSIGHTS_VIEW")) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }
  // RBAC: only portfolio viewers with LOGISTICS_LOSS_INSIGHTS_VIEW can access venture-level loss insights.

  try {
    const scope = getUserScope(user);
    const ventureId = req.query.ventureId ? Number(req.query.ventureId) : undefined;
    const includeTest = req.query.includeTest === 'true';
    const daysParam = req.query.days as string | undefined;
    const days = daysParam ? Math.max(1, Math.min(90, Number(daysParam))) : 30;

    if (!ventureId) {
      return res.status(400).json({ error: 'ventureId is required' });
    }

    if (!scope.allVentures && !scope.ventureIds.includes(ventureId)) {
      return res.status(403).json({ error: 'FORBIDDEN_VENTURE' });
    }

    const now = new Date();
    const windowEnd = endOfDay(now);
    const windowStart = startOfDay(
      new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000),
    );

    const baseWhere: any = {
      ventureId,
      status: 'LOST',
      createdAt: {
        gte: windowStart,
        lte: windowEnd,
      },
    };
    if (!includeTest) {
      baseWhere.isTest = false;
    }

    const byCategory = await prisma.load.groupBy({
      by: ['lostReasonCategory'],
      where: baseWhere,
      _count: { _all: true },
    });

    const byReason = await prisma.load.groupBy({
      by: ['lostReason'],
      where: {
        ...baseWhere,
        lostReason: { not: null },
      },
      _count: { _all: true },
    });

    const totalLost = byCategory.reduce((sum, r) => sum + r._count._all, 0);

    const categoryRows = LOST_REASON_CONFIGS.map(cfg => {
      const row = byCategory.find(r => r.lostReasonCategory === cfg.id);
      const count = row?._count._all || 0;
      const share = totalLost > 0 ? count / totalLost : 0;

      return {
        id: cfg.id,
        label: cfg.label,
        description: cfg.description,
        kpiImpact: cfg.kpiImpact,
        count,
        share,
        sopSteps: cfg.sopSteps,
        coachingQuestions: cfg.coachingQuestions,
      };
    }).sort((a, b) => b.count - a.count);

    const reasonRows = byReason
      .map(r => ({
        reason: r.lostReason || 'UNSPECIFIED',
        count: r._count._all,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    logger.info("freight_api", {
      endpoint: "/api/logistics/loss-insights",
      userId: user.id,
      role: user.role,
      outcome: "success",
      requestId,
    });

    return res.json({
      windowDays: days,
      totalLost,
      categories: categoryRows,
      topReasons: reasonRows,
    });
  } catch (err) {
    logger.error("freight_api", {
      endpoint: "/api/logistics/loss-insights",
      userId: user?.id,
      role: user?.role,
      outcome: "error",
      requestId,
    });
    console.error('Loss insights error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
