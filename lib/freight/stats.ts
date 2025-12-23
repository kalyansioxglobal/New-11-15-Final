import prisma from '@/lib/prisma';
import { getMatchesForLoad } from '@/lib/logistics/matching';

type DateRange = { from?: Date | null; to?: Date | null };

type MatchingStats = {
  averageMatchScore: number;
  averageTopMatchScore: number;
  percentLoadsWithAtLeastOneMatch: number;
  sampleSize: number;
};

type FmcsaStats = {
  countUnauthorizedCarriersExcluded: number;
  countDisqualifiedCarriersExcluded: number;
};

type OnTimeStats = {
  onTimeDeliveryRate: number;
  deliveredCount: number;
  onTimeCount: number;
  carrierBuckets: {
    high: number; // >=95%
    medium: number; // 85-94%
    low: number; // <85%
  };
};

export type FreightStats = {
  matching: MatchingStats;
  fmcsa: FmcsaStats;
  onTime: OnTimeStats;
};

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 100);
}

export async function computeFreightStats(args: {
  ventureId: number;
  range: DateRange;
  loadSampleLimit?: number;
}): Promise<FreightStats> {
  const { ventureId, range, loadSampleLimit = 10 } = args;

  const loadWhere: any = {
    ventureId,
    isTest: false,
  };

  if (range.from || range.to) {
    loadWhere.createdAt = {};
    if (range.from) loadWhere.createdAt.gte = range.from;
    if (range.to) loadWhere.createdAt.lte = range.to;
  }

  // Pick a small sample of loads to keep the matching computations light.
  const loads = await prisma.load.findMany({
    where: loadWhere,
    orderBy: { createdAt: 'desc' },
    take: loadSampleLimit,
    select: {
      id: true,
      equipmentType: true,
      pickupCity: true,
      pickupState: true,
      dropCity: true,
      dropState: true,
      miles: true,
      shipperId: true,
      preferredBonusesJson: true,
      scheduledDeliveryAt: true,
      actualDeliveryAt: true,
      dropDate: true,
    },
  });

  let totalMatchScore = 0;
  let totalMatchCount = 0;
  let totalTopScore = 0;
  let totalTopCount = 0;
  let loadsWithMatches = 0;

  for (const load of loads) {
    const matches = await getMatchesForLoad(load.id);
    const items = matches.matches || [];
    if (items.length) {
      loadsWithMatches += 1;
      totalTopScore += items[0].totalScore || 0;
      totalTopCount += 1;
    }
    for (const m of items) {
      totalMatchScore += m.totalScore || 0;
      totalMatchCount += 1;
    }
  }

  const matching: MatchingStats = {
    averageMatchScore: totalMatchCount ? Math.round(totalMatchScore / totalMatchCount) : 0,
    averageTopMatchScore: totalTopCount ? Math.round(totalTopScore / totalTopCount) : 0,
    percentLoadsWithAtLeastOneMatch: loads.length ? clampPercent((loadsWithMatches / loads.length) * 100) : 0,
    sampleSize: loads.length,
  };

  // FMCSA and disqualification counts are global within the venture scope.
  const [countUnauthorizedCarriersExcluded, countDisqualifiedCarriersExcluded] = await Promise.all([
    prisma.carrier.count({ where: { active: true, fmcsaAuthorized: false } }),
    prisma.carrier.count({ where: { active: true, disqualified: true } }),
  ]);

  const fmcsa: FmcsaStats = {
    countUnauthorizedCarriersExcluded,
    countDisqualifiedCarriersExcluded,
  };

  // On-time delivery rate using scheduled vs actual delivery timestamps when present.
  const deliveredLoads = loads.filter((l: any) => l.scheduledDeliveryAt && (l.actualDeliveryAt || l.dropDate));
  let onTimeCount = 0;
  for (const l of deliveredLoads) {
    const deliveredAt = l.actualDeliveryAt || l.dropDate!;
    if (deliveredAt <= l.scheduledDeliveryAt!) onTimeCount += 1;
  }

  const carrierBuckets = { high: 0, medium: 0, low: 0 };
  const carriersForBuckets = await prisma.carrier.findMany({
    where: { onTimePercentage: { not: null } },
    select: { onTimePercentage: true },
  });
  for (const c of carriersForBuckets) {
    const pct = c.onTimePercentage as number;
    if (pct >= 95) carrierBuckets.high += 1;
    else if (pct >= 85) carrierBuckets.medium += 1;
    else carrierBuckets.low += 1;
  }

  const onTime: OnTimeStats = {
    onTimeDeliveryRate: deliveredLoads.length
      ? clampPercent((onTimeCount / deliveredLoads.length) * 100)
      : 0,
    deliveredCount: deliveredLoads.length,
    onTimeCount,
    carrierBuckets,
  };

  return { matching, fmcsa, onTime };
}
