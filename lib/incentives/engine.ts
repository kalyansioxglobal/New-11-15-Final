import prisma from "../prisma";

export type EngineIncentiveDaily = {
  userId: number;
  ruleId: number;
  amount: number;
  date: string; // YYYY-MM-DD
  planId: number;
};

const LOAD_METRICS = new Set([
  "loads_completed",
  "loads_revenue",
  "loads_miles",
  "loads_margin",
]);

const BPO_METRICS = new Set([
  "bpo_dials",
  "bpo_connects",
  "bpo_talk_seconds",
  "bpo_deals",
]);

const HOTEL_METRICS = new Set([
  "hotel_reviews_responded",
  "hotel_adr",
  "hotel_revpar",
]);

export function getDayBounds(dateStr: string): { day: string; start: Date; end: Date } {
  const base = new Date(dateStr);
  if (Number.isNaN(base.getTime())) {
    throw new Error("Invalid date – expected YYYY-MM-DD");
  }
  const day = base.toISOString().slice(0, 10);
  const start = new Date(`${day}T00:00:00.000Z`);
  const end = new Date(`${day}T23:59:59.999Z`);
  return { day, start, end };
}

// Lightweight local representation of an incentive rule. This avoids coupling
// the engine to the Prisma-generated `IncentiveRule` type while keeping the
// fields we actually use.
export type IncentiveRuleLike = {
  id: number;
  metricKey: string;
  calcType: string;
  rate: number | null;
  config: unknown;
};


function ensureUserMetricBucket(
  metricsByUser: Map<number, Record<string, number>>,
  userId: number,
): Record<string, number> {
  let bucket = metricsByUser.get(userId);
  if (!bucket) {
    bucket = {};
    metricsByUser.set(userId, bucket);
  }
  return bucket;
}

async function loadFreightMetrics(
  ventureId: number,
  start: Date,
  end: Date,
): Promise<Map<number, Record<string, number>>> {
  const metricsByUser = new Map<number, Record<string, number>>();

  const loads = await prisma.load.findMany({
    where: {
      ventureId,
      loadStatus: "DELIVERED",
      billingDate: { gte: start, lte: end },
    },
    select: {
      createdById: true,
      billAmount: true,
      miles: true,
      marginAmount: true,
    },
  });

  for (const l of loads) {
    if (!l.createdById) continue;
    const bucket = ensureUserMetricBucket(metricsByUser, l.createdById);
    bucket.loads_completed = (bucket.loads_completed ?? 0) + 1;
    bucket.loads_revenue = (bucket.loads_revenue ?? 0) + (l.billAmount ?? 0);
    bucket.loads_miles = (bucket.loads_miles ?? 0) + (l.miles ?? 0);
    bucket.loads_margin = (bucket.loads_margin ?? 0) + (l.marginAmount ?? 0);
  }

  return metricsByUser;
}

async function loadBpoMetrics(
  ventureId: number,
  start: Date,
  end: Date,
): Promise<Map<number, Record<string, number>>> {
  const metricsByUser = new Map<number, Record<string, number>>();

  const logs = await prisma.bpoCallLog.findMany({
    where: {
      ventureId,
      callStartedAt: { gte: start, lte: end },
    },
    select: {
      dialCount: true,
      isConnected: true,
      appointmentSet: true,
      dealWon: true,
      callStartedAt: true,
      callEndedAt: true,
      agent: {
        select: { userId: true },
      },
    },
  });

  for (const log of logs) {
    const userId = log.agent?.userId;
    if (!userId) continue;

    const bucket = ensureUserMetricBucket(metricsByUser, userId);

    bucket.bpo_dials = (bucket.bpo_dials ?? 0) + (log.dialCount ?? 1);
    if (log.isConnected) {
      bucket.bpo_connects = (bucket.bpo_connects ?? 0) + 1;
    }
    if (log.dealWon) {
      bucket.bpo_deals = (bucket.bpo_deals ?? 0) + 1;
    }

    const startMs = log.callStartedAt?.getTime() ?? 0;
    const endMs = log.callEndedAt?.getTime() ?? startMs;
    const durSec = Math.max(0, Math.round((endMs - startMs) / 1000));
    bucket.bpo_talk_seconds = (bucket.bpo_talk_seconds ?? 0) + durSec;
  }

  return metricsByUser;
}

async function loadHotelMetrics(
  ventureId: number,
  start: Date,
  end: Date,
): Promise<Map<number, Record<string, number>>> {
  const metricsByUser = new Map<number, Record<string, number>>();

  // Reviews responded per user
  const reviews = await prisma.hotelReview.findMany({
    where: {
      respondedById: { not: null },
      reviewDate: { gte: start, lte: end },
      hotel: { ventureId },
    },
    select: {
      respondedById: true,
    },
  });

  for (const r of reviews) {
    if (!r.respondedById) continue;
    const bucket = ensureUserMetricBucket(metricsByUser, r.respondedById);
    bucket.hotel_reviews_responded =
      (bucket.hotel_reviews_responded ?? 0) + 1;
  }

  return metricsByUser;
}

function computeAmountForRule(
  rule: IncentiveRuleLike,
  metricValue: number,
  allMetrics: Record<string, number>,
): number {
  // Explicit null/undefined check: treat null/undefined as 0, but allow 0 as a valid metric value
  // For BONUS_ON_TARGET, we continue even if metricValue is null/undefined
  if ((metricValue === null || metricValue === undefined) && rule.calcType !== "BONUS_ON_TARGET") {
    return 0;
  }
  
  // Normalize metricValue: if null/undefined, use 0 (but only for non-BONUS_ON_TARGET rules)
  const normalizedMetricValue = metricValue ?? 0;

  switch (rule.calcType as string) {
    case "PERCENT_OF_METRIC": {
      const rate = rule.rate ?? 0; // expected as decimal, e.g. 0.02 for 2%
      return normalizedMetricValue * rate;
    }
    case "FLAT_PER_UNIT":
    case "CURRENCY_PER_DOLLAR": {
      const rate = rule.rate ?? 0;
      return normalizedMetricValue * rate;
    }
    case "BONUS_ON_TARGET": {
      const cfg = (rule.config as any) || {};
      const thresholdMetricKey = cfg.metricKey || rule.metricKey;
      const thresholdValue = cfg.thresholdValue ?? cfg.targetValue ?? 0;
      const bonusAmount = cfg.bonusAmount ?? 0;
      const actual = allMetrics[thresholdMetricKey] ?? metricValue;
      return actual >= thresholdValue ? bonusAmount : 0;
    }
    default:
      // Other calcTypes (TIERED_SLAB, LOAD_LEVEL_BONUS, etc.) are not
      // part of this v1 computation slice.
      return 0;
  }
}

export type EngineRule = Pick<
  IncentiveRuleLike,
  "id" | "metricKey" | "calcType" | "rate" | "config"
>;

export async function computeIncentivesForDayWithRules(opts: {
  ventureId: number;
  planId?: number; // actual IncentivePlan id (defaults to ventureId for backwards compatibility)
  date: string; // YYYY-MM-DD
  rules: EngineRule[];
  restrictToUserIds?: number[];
}): Promise<EngineIncentiveDaily[]> {
  const { ventureId, date, rules, restrictToUserIds, planId = ventureId } = opts;
  if (!rules.length) return [];

  const { day, start, end } = getDayBounds(date);

  // All users under this venture (plan)
  const users = await prisma.user.findMany({
    where: {
      ventures: {
        some: { ventureId },
      },
    },
    select: {
      id: true,
      role: true,
    },
  });

  const metricKeysNeeded = new Set(rules.map((r) => r.metricKey));

  const metricsByUser = new Map<number, Record<string, number>>();

  // Load freight metrics if needed
  if ([...metricKeysNeeded].some((k) => LOAD_METRICS.has(k))) {
    const freightMetrics = await loadFreightMetrics(ventureId, start, end);
    for (const [userId, bucket] of freightMetrics.entries()) {
      const existing = ensureUserMetricBucket(metricsByUser, userId);
      Object.assign(existing, bucket);
    }
  }

  // Load BPO metrics if needed
  if ([...metricKeysNeeded].some((k) => BPO_METRICS.has(k))) {
    const bpoMetrics = await loadBpoMetrics(ventureId, start, end);
    for (const [userId, bucket] of bpoMetrics.entries()) {
      const existing = ensureUserMetricBucket(metricsByUser, userId);
      Object.assign(existing, bucket);
    }
  }

  // Load hotel metrics if needed
  let avgAdr = 0;
  let avgRevpar = 0;

  if ([...metricKeysNeeded].some((k) => HOTEL_METRICS.has(k))) {
    const hotelMetrics = await loadHotelMetrics(ventureId, start, end);
    for (const [userId, bucket] of hotelMetrics.entries()) {
      const existing = ensureUserMetricBucket(metricsByUser, userId);
      Object.assign(existing, bucket);
    }

    // ADR / RevPAR stubbed as venture-level averages, applied to all venture users
    const kpis = await prisma.hotelKpiDaily.findMany({
      where: {
        ventureId,
        date: { gte: start, lte: end },
      },
      select: { adr: true, revpar: true },
    });
    if (kpis.length > 0) {
      avgAdr =
        kpis.reduce((sum: number, k: any) => sum + (k.adr ?? 0), 0) /
        (kpis.length || 1);
      avgRevpar =
        kpis.reduce((sum: number, k: any) => sum + (k.revpar ?? 0), 0) /
        (kpis.length || 1);
    }
  }

  // Build unified user set from venture users and metric-bearing users
  const userIds = new Set<number>();
  for (const u of users) userIds.add(u.id);
  for (const id of metricsByUser.keys()) userIds.add(id);

  const results: EngineIncentiveDaily[] = [];

  for (const userId of userIds) {
    if (restrictToUserIds && !restrictToUserIds.includes(userId)) continue;

    const bucket = ensureUserMetricBucket(metricsByUser, userId);

    // Apply venture-level hotel ADR/RevPAR stubs if requested
    if (metricKeysNeeded.has("hotel_adr") && avgAdr) {
      bucket.hotel_adr = avgAdr;
    }
    if (metricKeysNeeded.has("hotel_revpar") && avgRevpar) {
      bucket.hotel_revpar = avgRevpar;
    }

    for (const rule of rules) {
      const metricValue = bucket[rule.metricKey] ?? 0;
      const amount = computeAmountForRule(rule as IncentiveRuleLike, metricValue, bucket);
      if (!amount) continue;

      results.push({
        userId,
        ruleId: rule.id,
        amount,
        date: day,
        planId,
      });
    }
  }

  return results;
}

export async function calculateIncentivesForDay(
  planId: number,
  date: string,
): Promise<EngineIncentiveDaily[]> {
  const { day } = getDayBounds(date);

  // Load the plan to get the ventureId
  const plan = await prisma.incentivePlan.findUnique({
    where: { id: planId },
    select: { ventureId: true },
  });

  if (!plan) return [];

  // Load active rules for this plan
  const rules = await prisma.incentiveRule.findMany({
    where: { planId, isEnabled: true },
  });

  if (!rules.length) return [];

  return computeIncentivesForDayWithRules({
    ventureId: plan.ventureId,
    planId,
    date: day,
    rules,
  });
}

export async function saveIncentivesForDay(
  planId: number,
  date: string,
): Promise<{
  items: EngineIncentiveDaily[];
  inserted: number;
  updated: number;
}> {
  // Load the plan to get the ventureId
  const plan = await prisma.incentivePlan.findUnique({
    where: { id: planId },
    select: { ventureId: true },
  });

  if (!plan) {
    return { items: [], inserted: 0, updated: 0 };
  }

  const items = await calculateIncentivesForDay(planId, date);
  if (!items.length) {
    return { items, inserted: 0, updated: 0 };
  }

  const { day } = getDayBounds(date);
  const ventureId = plan.ventureId;
  const dayDate = new Date(`${day}T00:00:00.000Z`);

  let inserted = 0;
  let updated = 0;

  for (const item of items) {
    const existing = await prisma.incentiveDaily.findFirst({
      where: {
        userId: item.userId,
        ventureId,
        date: dayDate,
      },
    });

    if (!existing) {
      await prisma.incentiveDaily.create({
        data: {
          userId: item.userId,
          ventureId,
          officeId: null,
          date: dayDate,
          amount: item.amount,
          currency: "USD",
          breakdown: {
            rules: [
              {
                ruleId: item.ruleId,
                amount: item.amount,
              },
            ],
          },
          isTest: false,
        },
      });
      inserted += 1;
    } else {
      const breakdown = (existing.breakdown as any) || { rules: [] };
      const rules = Array.isArray(breakdown.rules) ? breakdown.rules : [];
      rules.push({ ruleId: item.ruleId, amount: item.amount });
      const newAmount = (existing.amount ?? 0) + item.amount;

      await prisma.incentiveDaily.update({
        where: { id: existing.id },
        data: {
          amount: newAmount,
          breakdown: { ...breakdown, rules },
        },
      });
      updated += 1;
    }
  }

  return { items, inserted, updated };
}

/**
 * Idempotent version of saveIncentivesForDay - REPLACES the day's incentives
 * instead of incrementing. Safe to run multiple times for the same (venture, user, date, plan).
 * 
 * This deletes existing IncentiveDaily records for the given plan and date, then
 * creates fresh ones based on current calculations.
 */
export async function saveIncentivesForDayIdempotent(
  planId: number,
  date: string,
): Promise<{
  items: EngineIncentiveDaily[];
  deleted: number;
  inserted: number;
}> {
  const plan = await prisma.incentivePlan.findUnique({
    where: { id: planId },
    select: { ventureId: true },
  });

  if (!plan) {
    return { items: [], deleted: 0, inserted: 0 };
  }

  const { day } = getDayBounds(date);
  const ventureId = plan.ventureId;
  const dayDate = new Date(`${day}T00:00:00.000Z`);

  // Delete existing records for this venture+date (idempotent clear)
  const deleteResult = await prisma.incentiveDaily.deleteMany({
    where: {
      ventureId,
      date: dayDate,
    },
  });

  const deleted = deleteResult.count;

  // Calculate fresh incentives
  const items = await calculateIncentivesForDay(planId, date);
  if (!items.length) {
    return { items: [], deleted, inserted: 0 };
  }

  // Group items by userId to aggregate all rule amounts for each user
  const userTotals = new Map<number, { amount: number; rules: { ruleId: number; amount: number }[] }>();
  
  for (const item of items) {
    const existing = userTotals.get(item.userId);
    if (existing) {
      existing.amount += item.amount;
      existing.rules.push({ ruleId: item.ruleId, amount: item.amount });
    } else {
      userTotals.set(item.userId, {
        amount: item.amount,
        rules: [{ ruleId: item.ruleId, amount: item.amount }],
      });
    }
  }

  // Create fresh records
  let inserted = 0;
  for (const [userId, data] of userTotals.entries()) {
    await prisma.incentiveDaily.create({
      data: {
        userId,
        ventureId,
        officeId: null,
        date: dayDate,
        amount: data.amount,
        currency: "USD",
        breakdown: { rules: data.rules, planId, computedAt: new Date().toISOString() },
        isTest: false,
      },
    });
    inserted += 1;
  }

  return { items, deleted, inserted };
}
