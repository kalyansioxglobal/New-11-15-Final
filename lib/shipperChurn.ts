import prisma from "@/lib/prisma";

export type ShipperChurnStatus = string;

export const CHURN_CONFIG = {
  MIN_LOADS_FOR_RELIABLE_PATTERN: 3,
  DEFAULT_AT_RISK_DAYS: 14,
  DEFAULT_CHURNED_DAYS: 30,
  NEW_SHIPPER_DAYS: 30,
  MIN_AT_RISK_DAYS: 7,
  MAX_AT_RISK_DAYS: 45,
  MIN_CHURNED_DAYS: 14,
  MAX_CHURNED_DAYS: 90,
  RISK_SCORE_WEIGHTS: {
    DAYS_OVERDUE: 0.4,
    VOLUME_DECLINE: 0.3,
    PATTERN_DEVIATION: 0.2,
    TENURE: 0.1,
  },
};

export interface ShipperChurnSummary {
  ventureId: number;
  date: Date;
  activeCount: number;
  atRiskCount: number;
  churnedCount: number;
  reactivatedCount: number;
  newCount: number;
  retentionRate: number;
  avgRiskScore: number;
  highRiskCount: number;
}

export interface ShipperWithChurnInfo {
  id: number;
  name: string;
  ventureId: number;
  lastLoadDate: Date | null;
  churnStatus: ShipperChurnStatus;
  daysSinceLastLoad: number | null;
  loadCount: number;
  totalRevenue: number;
  avgLoadsPerMonth: number | null;
  loadFrequencyDays: number | null;
  expectedNextLoadDate: Date | null;
  churnRiskScore: number | null;
  daysOverdue: number | null;
}

export interface ShipperMetrics {
  firstLoadDate: Date | null;
  lastLoadDate: Date | null;
  totalLoadsHistoric: number;
  avgLoadsPerMonth: number | null;
  loadFrequencyDays: number | null;
  expectedNextLoadDate: Date | null;
  churnRiskScore: number;
  recentLoadsCount: number;
  expectedRecentLoads: number;
}

interface LoadWithDate {
  createdAt: Date;
}

export async function calculateShipperMetrics(shipperId: number): Promise<ShipperMetrics> {
  const loads = await prisma.load.findMany({
    where: { shipperId },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  const totalLoadsHistoric = loads.length;
  const now = new Date();

  if (totalLoadsHistoric === 0) {
    return {
      firstLoadDate: null,
      lastLoadDate: null,
      totalLoadsHistoric: 0,
      avgLoadsPerMonth: null,
      loadFrequencyDays: null,
      expectedNextLoadDate: null,
      churnRiskScore: 50,
      recentLoadsCount: 0,
      expectedRecentLoads: 0,
    };
  }

  const firstLoadDate = loads[0].createdAt;
  const lastLoadDate = loads[loads.length - 1].createdAt;

  const daysSinceFirstLoad = Math.max(1, (now.getTime() - firstLoadDate.getTime()) / (1000 * 60 * 60 * 24));
  const monthsActive = daysSinceFirstLoad / 30;
  const avgLoadsPerMonth = totalLoadsHistoric / Math.max(1, monthsActive);

  let loadFrequencyDays: number | null = null;

  if (totalLoadsHistoric >= CHURN_CONFIG.MIN_LOADS_FOR_RELIABLE_PATTERN) {
    const intervals: number[] = [];
    for (let i = 1; i < loads.length; i++) {
      const interval = (loads[i].createdAt.getTime() - loads[i - 1].createdAt.getTime()) / (1000 * 60 * 60 * 24);
      intervals.push(interval);
    }
    const sortedIntervals = [...intervals].sort((a, b) => a - b);
    const trimCount = Math.floor(intervals.length * 0.1);
    const trimmedIntervals = sortedIntervals.slice(trimCount, sortedIntervals.length - trimCount || sortedIntervals.length);
    loadFrequencyDays = trimmedIntervals.length > 0 
      ? trimmedIntervals.reduce((a, b) => a + b, 0) / trimmedIntervals.length
      : intervals.reduce((a, b) => a + b, 0) / intervals.length;
  } else if (totalLoadsHistoric === 2) {
    const interval = (loads[1].createdAt.getTime() - loads[0].createdAt.getTime()) / (1000 * 60 * 60 * 24);
    loadFrequencyDays = Math.min(interval, CHURN_CONFIG.DEFAULT_CHURNED_DAYS);
  } else {
    loadFrequencyDays = CHURN_CONFIG.DEFAULT_AT_RISK_DAYS;
  }

  loadFrequencyDays = Math.max(1, loadFrequencyDays);

  let expectedNextLoadDate: Date | null = null;
  if (loadFrequencyDays && lastLoadDate) {
    expectedNextLoadDate = new Date(lastLoadDate.getTime() + loadFrequencyDays * 24 * 60 * 60 * 1000);
  }

  const recentDays = 60;
  const recentCutoff = new Date(now.getTime() - recentDays * 24 * 60 * 60 * 1000);
  const recentLoadsCount = loads.filter((l: LoadWithDate) => l.createdAt >= recentCutoff).length;
  const expectedRecentLoads = avgLoadsPerMonth * 2;

  const churnRiskScore = calculateRiskScore({
    lastLoadDate,
    firstLoadDate,
    totalLoads: totalLoadsHistoric,
    avgLoadsPerMonth,
    loadFrequencyDays,
    expectedNextLoadDate,
    recentLoadsCount,
    expectedRecentLoads,
  });

  return {
    firstLoadDate,
    lastLoadDate,
    totalLoadsHistoric,
    avgLoadsPerMonth,
    loadFrequencyDays,
    expectedNextLoadDate,
    churnRiskScore,
    recentLoadsCount,
    expectedRecentLoads,
  };
}

interface RiskScoreInput {
  lastLoadDate: Date | null;
  firstLoadDate: Date | null;
  totalLoads: number;
  avgLoadsPerMonth: number | null;
  loadFrequencyDays: number | null;
  expectedNextLoadDate: Date | null;
  recentLoadsCount: number;
  expectedRecentLoads: number;
}

function calculateRiskScore(input: RiskScoreInput): number {
  const now = new Date();
  const weights = CHURN_CONFIG.RISK_SCORE_WEIGHTS;

  if (!input.lastLoadDate) {
    return 80;
  }

  const daysSinceLastLoad = Math.floor(
    (now.getTime() - input.lastLoadDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  let daysOverdueScore = 0;
  if (input.expectedNextLoadDate && now > input.expectedNextLoadDate) {
    const daysOverdue = Math.floor(
      (now.getTime() - input.expectedNextLoadDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const expectedFrequency = input.loadFrequencyDays || CHURN_CONFIG.DEFAULT_AT_RISK_DAYS;
    daysOverdueScore = Math.min(100, (daysOverdue / expectedFrequency) * 100);
  } else if (daysSinceLastLoad > CHURN_CONFIG.DEFAULT_AT_RISK_DAYS) {
    daysOverdueScore = Math.min(100, ((daysSinceLastLoad - CHURN_CONFIG.DEFAULT_AT_RISK_DAYS) / CHURN_CONFIG.DEFAULT_AT_RISK_DAYS) * 100);
  }

  let volumeDeclineScore = 0;
  if (input.expectedRecentLoads > 0 && input.totalLoads >= CHURN_CONFIG.MIN_LOADS_FOR_RELIABLE_PATTERN) {
    const volumeRatio = input.recentLoadsCount / input.expectedRecentLoads;
    
    if (volumeRatio >= 1.0) {
      volumeDeclineScore = 0;
    } else if (volumeRatio >= 0.75) {
      volumeDeclineScore = 15;
    } else if (volumeRatio >= 0.5) {
      volumeDeclineScore = 35;
    } else if (volumeRatio >= 0.25) {
      volumeDeclineScore = 60;
    } else if (input.recentLoadsCount === 0) {
      volumeDeclineScore = 100;
    } else {
      volumeDeclineScore = 80;
    }
  } else if (input.recentLoadsCount === 0 && input.totalLoads > 0) {
    volumeDeclineScore = 70;
  }

  let patternDeviationScore = 0;
  if (input.loadFrequencyDays && input.expectedNextLoadDate) {
    if (now > input.expectedNextLoadDate) {
      const daysOverExpected = Math.floor(
        (now.getTime() - input.expectedNextLoadDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const deviationMultiple = daysOverExpected / input.loadFrequencyDays;
      
      if (deviationMultiple <= 0.5) {
        patternDeviationScore = 10;
      } else if (deviationMultiple <= 1) {
        patternDeviationScore = 30;
      } else if (deviationMultiple <= 2) {
        patternDeviationScore = 60;
      } else {
        patternDeviationScore = Math.min(100, 60 + deviationMultiple * 10);
      }
    }
  } else if (daysSinceLastLoad > CHURN_CONFIG.DEFAULT_AT_RISK_DAYS) {
    patternDeviationScore = Math.min(100, (daysSinceLastLoad / CHURN_CONFIG.DEFAULT_CHURNED_DAYS) * 50);
  }

  let tenureScore = 0;
  if (input.firstLoadDate) {
    const tenureMonths = (now.getTime() - input.firstLoadDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (tenureMonths < 2) {
      tenureScore = 25;
    } else if (tenureMonths < 6) {
      tenureScore = 15;
    } else if (tenureMonths < 12) {
      tenureScore = 5;
    } else {
      tenureScore = 0;
    }
  } else {
    tenureScore = 40;
  }

  const weightedScore =
    daysOverdueScore * weights.DAYS_OVERDUE +
    volumeDeclineScore * weights.VOLUME_DECLINE +
    patternDeviationScore * weights.PATTERN_DEVIATION +
    tenureScore * weights.TENURE;

  return Math.min(100, Math.max(0, Math.round(weightedScore)));
}

function calculateDynamicThresholds(
  loadFrequencyDays: number | null,
  totalLoads: number
): { atRiskDays: number; churnedDays: number } {
  if (!loadFrequencyDays || loadFrequencyDays <= 0 || totalLoads < CHURN_CONFIG.MIN_LOADS_FOR_RELIABLE_PATTERN) {
    return {
      atRiskDays: CHURN_CONFIG.DEFAULT_AT_RISK_DAYS,
      churnedDays: CHURN_CONFIG.DEFAULT_CHURNED_DAYS,
    };
  }

  const atRiskMultiplier = 1.5;
  const churnedMultiplier = 3.0;

  let atRiskDays = Math.round(loadFrequencyDays * atRiskMultiplier);
  let churnedDays = Math.round(loadFrequencyDays * churnedMultiplier);

  atRiskDays = Math.max(CHURN_CONFIG.MIN_AT_RISK_DAYS, Math.min(CHURN_CONFIG.MAX_AT_RISK_DAYS, atRiskDays));
  churnedDays = Math.max(CHURN_CONFIG.MIN_CHURNED_DAYS, Math.min(CHURN_CONFIG.MAX_CHURNED_DAYS, churnedDays));

  if (churnedDays <= atRiskDays) {
    churnedDays = atRiskDays + 7;
  }

  return { atRiskDays, churnedDays };
}

export function calculateChurnStatus(
  lastLoadDate: Date | null,
  createdAt: Date,
  loadFrequencyDays: number | null = null,
  totalLoads: number = 0,
  referenceDate: Date = new Date()
): ShipperChurnStatus {
  const now = referenceDate;
  const daysSinceCreation = Math.floor(
    (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceCreation <= CHURN_CONFIG.NEW_SHIPPER_DAYS && !lastLoadDate) {
    return "NEW";
  }

  if (!lastLoadDate) {
    return daysSinceCreation > CHURN_CONFIG.DEFAULT_CHURNED_DAYS ? "CHURNED" : "AT_RISK";
  }

  const daysSinceLastLoad = Math.floor(
    (now.getTime() - lastLoadDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const thresholds = calculateDynamicThresholds(loadFrequencyDays, totalLoads);

  if (daysSinceLastLoad > thresholds.churnedDays) {
    return "CHURNED";
  }
  if (daysSinceLastLoad > thresholds.atRiskDays) {
    return "AT_RISK";
  }
  return "ACTIVE";
}

export async function updateShipperLastLoadDate(shipperId: number): Promise<void> {
  const metrics = await calculateShipperMetrics(shipperId);
  const now = new Date();

  await prisma.logisticsShipper.update({
    where: { id: shipperId },
    data: {
      lastLoadDate: metrics.lastLoadDate,
      firstLoadDate: metrics.firstLoadDate,
      totalLoadsHistoric: metrics.totalLoadsHistoric,
      avgLoadsPerMonth: metrics.avgLoadsPerMonth,
      loadFrequencyDays: metrics.loadFrequencyDays,
      expectedNextLoadDate: metrics.expectedNextLoadDate,
      churnRiskScore: metrics.churnRiskScore,
      metricsCalculatedAt: now,
    },
  });

  const shipper = await prisma.logisticsShipper.findUnique({
    where: { id: shipperId },
    select: { createdAt: true, churnStatus: true },
  });

  if (shipper) {
    let newStatus = calculateChurnStatus(
      metrics.lastLoadDate,
      shipper.createdAt,
      metrics.loadFrequencyDays,
      metrics.totalLoadsHistoric
    );

    const updateData: any = {};
    const oldStatus = shipper.churnStatus;

    if (oldStatus === "CHURNED" && newStatus === "ACTIVE") {
      newStatus = "REACTIVATED";
      updateData.reactivatedAt = now;
    }

    if (oldStatus === "REACTIVATED" && newStatus === "ACTIVE") {
      newStatus = "REACTIVATED";
    }

    if (oldStatus !== newStatus) {
      updateData.churnStatus = newStatus;
      if (newStatus === "CHURNED") {
        updateData.churnedAt = now;
      }
      await prisma.logisticsShipper.update({
        where: { id: shipperId },
        data: updateData,
      });
    }
  }
}

export async function updateAllShipperChurnStatuses(ventureId?: number, includeTest = false): Promise<{
  updated: number;
  byStatus: Record<ShipperChurnStatus, number>;
  metricsUpdated: number;
}> {
  const where: any = { isActive: true };
  if (ventureId) where.ventureId = ventureId;
  if (!includeTest) where.isTest = false;

  const shippers = await prisma.logisticsShipper.findMany({
    where,
    select: {
      id: true,
      lastLoadDate: true,
      createdAt: true,
      churnStatus: true,
      loadFrequencyDays: true,
      totalLoadsHistoric: true,
      metricsCalculatedAt: true,
    },
  });

  const now = new Date();
  const byStatus: Record<ShipperChurnStatus, number> = {
    ACTIVE: 0,
    AT_RISK: 0,
    CHURNED: 0,
    REACTIVATED: 0,
    NEW: 0,
  };

  let updated = 0;
  let metricsUpdated = 0;

  for (const shipper of shippers) {
    const needsMetricsUpdate = !shipper.metricsCalculatedAt ||
      (now.getTime() - shipper.metricsCalculatedAt.getTime()) > 24 * 60 * 60 * 1000;

    let metrics: ShipperMetrics | null = null;
    if (needsMetricsUpdate) {
      metrics = await calculateShipperMetrics(shipper.id);

      await prisma.logisticsShipper.update({
        where: { id: shipper.id },
        data: {
          lastLoadDate: metrics.lastLoadDate,
          firstLoadDate: metrics.firstLoadDate,
          totalLoadsHistoric: metrics.totalLoadsHistoric,
          avgLoadsPerMonth: metrics.avgLoadsPerMonth,
          loadFrequencyDays: metrics.loadFrequencyDays,
          expectedNextLoadDate: metrics.expectedNextLoadDate,
          churnRiskScore: metrics.churnRiskScore,
          metricsCalculatedAt: now,
        },
      });
      metricsUpdated++;
    }

    const lastLoadDate = metrics?.lastLoadDate ?? shipper.lastLoadDate;
    const loadFrequencyDays = metrics?.loadFrequencyDays ?? shipper.loadFrequencyDays;
    const totalLoads = metrics?.totalLoadsHistoric ?? shipper.totalLoadsHistoric ?? 0;

    let newStatus = calculateChurnStatus(
      lastLoadDate,
      shipper.createdAt,
      loadFrequencyDays,
      totalLoads,
      now
    );

    const updateData: any = {};
    const oldStatus = shipper.churnStatus;

    if (oldStatus === "CHURNED" && newStatus === "ACTIVE") {
      newStatus = "REACTIVATED";
      updateData.reactivatedAt = now;
    }

    if (oldStatus === "REACTIVATED" && newStatus === "ACTIVE") {
      newStatus = "REACTIVATED";
    }

    if (newStatus === "CHURNED" && oldStatus !== "CHURNED") {
      updateData.churnedAt = now;
    }

    byStatus[newStatus]++;

    if (oldStatus !== newStatus) {
      updateData.churnStatus = newStatus;

      await prisma.logisticsShipper.update({
        where: { id: shipper.id },
        data: updateData,
      });
      updated++;
    }
  }

  return { updated, byStatus, metricsUpdated };
}

export async function getShipperChurnSummary(
  ventureId: number,
  referenceDate: Date = new Date(),
  includeTest = false
): Promise<ShipperChurnSummary> {
  const where: any = { ventureId, isActive: true };
  if (!includeTest) where.isTest = false;
  
  const shippers = await prisma.logisticsShipper.findMany({
    where,
    select: {
      id: true,
      lastLoadDate: true,
      createdAt: true,
      churnStatus: true,
      churnRiskScore: true,
    },
  });

  let activeCount = 0;
  let atRiskCount = 0;
  let churnedCount = 0;
  let reactivatedCount = 0;
  let newCount = 0;
  let totalRiskScore = 0;
  let riskScoreCount = 0;
  let highRiskCount = 0;

  for (const shipper of shippers) {
    switch (shipper.churnStatus) {
      case "ACTIVE":
        activeCount++;
        break;
      case "AT_RISK":
        atRiskCount++;
        break;
      case "CHURNED":
        churnedCount++;
        break;
      case "REACTIVATED":
        reactivatedCount++;
        break;
      case "NEW":
        newCount++;
        break;
    }

    if (shipper.churnRiskScore !== null) {
      totalRiskScore += shipper.churnRiskScore;
      riskScoreCount++;
      if (shipper.churnRiskScore >= 70) {
        highRiskCount++;
      }
    }
  }

  const totalExcludingNew = activeCount + atRiskCount + churnedCount + reactivatedCount;
  const retained = activeCount + reactivatedCount;
  const retentionRate = totalExcludingNew > 0 ? (retained / totalExcludingNew) * 100 : 100;
  const avgRiskScore = riskScoreCount > 0 ? Math.round(totalRiskScore / riskScoreCount) : 0;

  return {
    ventureId,
    date: referenceDate,
    activeCount,
    atRiskCount,
    churnedCount,
    reactivatedCount,
    newCount,
    retentionRate,
    avgRiskScore,
    highRiskCount,
  };
}

export async function getAtRiskShippers(
  ventureId: number,
  limit = 50,
  includeTest = false
): Promise<ShipperWithChurnInfo[]> {
  const now = new Date();

  const where: any = {
    ventureId,
    isActive: true,
    churnStatus: "AT_RISK",
  };
  if (!includeTest) where.isTest = false;

  const shippers = await prisma.logisticsShipper.findMany({
    where,
    include: {
      loads: {
        select: {
          sellRate: true,
        },
      },
      _count: {
        select: { loads: true },
      },
    },
    orderBy: [
      { churnRiskScore: "desc" },
      { lastLoadDate: "asc" },
    ],
    take: limit,
  });

  return shippers.map((s: any) => {
    const daysSinceLastLoad = s.lastLoadDate
      ? Math.floor((now.getTime() - s.lastLoadDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const totalRevenue = s.loads.reduce((sum: number, l: any) => sum + (l.sellRate || 0), 0);

    let daysOverdue: number | null = null;
    if (s.expectedNextLoadDate && now > s.expectedNextLoadDate) {
      daysOverdue = Math.floor(
        (now.getTime() - s.expectedNextLoadDate.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    return {
      id: s.id,
      name: s.name,
      ventureId: s.ventureId,
      lastLoadDate: s.lastLoadDate,
      churnStatus: s.churnStatus,
      daysSinceLastLoad,
      loadCount: s._count.loads,
      totalRevenue,
      avgLoadsPerMonth: s.avgLoadsPerMonth,
      loadFrequencyDays: s.loadFrequencyDays,
      expectedNextLoadDate: s.expectedNextLoadDate,
      churnRiskScore: s.churnRiskScore,
      daysOverdue,
    };
  });
}

export async function getChurnedShippers(
  ventureId: number,
  limit = 50,
  includeTest = false
): Promise<ShipperWithChurnInfo[]> {
  const now = new Date();

  const where: any = {
    ventureId,
    isActive: true,
    churnStatus: "CHURNED",
  };
  if (!includeTest) where.isTest = false;

  const shippers = await prisma.logisticsShipper.findMany({
    where,
    include: {
      loads: {
        select: {
          sellRate: true,
        },
      },
      _count: {
        select: { loads: true },
      },
    },
    orderBy: { churnedAt: "desc" },
    take: limit,
  });

  return shippers.map((s: any) => {
    const daysSinceLastLoad = s.lastLoadDate
      ? Math.floor((now.getTime() - s.lastLoadDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const totalRevenue = s.loads.reduce((sum: number, l: any) => sum + (l.sellRate || 0), 0);

    let daysOverdue: number | null = null;
    if (s.expectedNextLoadDate && now > s.expectedNextLoadDate) {
      daysOverdue = Math.floor(
        (now.getTime() - s.expectedNextLoadDate.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    return {
      id: s.id,
      name: s.name,
      ventureId: s.ventureId,
      lastLoadDate: s.lastLoadDate,
      churnStatus: s.churnStatus,
      daysSinceLastLoad,
      loadCount: s._count.loads,
      totalRevenue,
      avgLoadsPerMonth: s.avgLoadsPerMonth,
      loadFrequencyDays: s.loadFrequencyDays,
      expectedNextLoadDate: s.expectedNextLoadDate,
      churnRiskScore: s.churnRiskScore,
      daysOverdue,
    };
  });
}

export async function getHighRiskShippers(
  ventureId: number,
  minRiskScore = 70,
  limit = 50,
  includeTest = false
): Promise<ShipperWithChurnInfo[]> {
  const now = new Date();

  const where: any = {
    ventureId,
    isActive: true,
    churnRiskScore: { gte: minRiskScore },
    churnStatus: { in: ["ACTIVE", "AT_RISK", "REACTIVATED"] },
  };
  if (!includeTest) where.isTest = false;

  const shippers = await prisma.logisticsShipper.findMany({
    where,
    include: {
      loads: {
        select: {
          sellRate: true,
        },
      },
      _count: {
        select: { loads: true },
      },
    },
    orderBy: { churnRiskScore: "desc" },
    take: limit,
  });

  return shippers.map((s: any) => {
    const daysSinceLastLoad = s.lastLoadDate
      ? Math.floor((now.getTime() - s.lastLoadDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const totalRevenue = s.loads.reduce((sum: number, l: any) => sum + (l.sellRate || 0), 0);

    let daysOverdue: number | null = null;
    if (s.expectedNextLoadDate && now > s.expectedNextLoadDate) {
      daysOverdue = Math.floor(
        (now.getTime() - s.expectedNextLoadDate.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    return {
      id: s.id,
      name: s.name,
      ventureId: s.ventureId,
      lastLoadDate: s.lastLoadDate,
      churnStatus: s.churnStatus,
      daysSinceLastLoad,
      loadCount: s._count.loads,
      totalRevenue,
      avgLoadsPerMonth: s.avgLoadsPerMonth,
      loadFrequencyDays: s.loadFrequencyDays,
      expectedNextLoadDate: s.expectedNextLoadDate,
      churnRiskScore: s.churnRiskScore,
      daysOverdue,
    };
  });
}

export async function backfillShipperLastLoadDates(ventureId?: number): Promise<number> {
  const where: any = {};
  if (ventureId) where.ventureId = ventureId;

  const shippers = await prisma.logisticsShipper.findMany({
    where,
    select: { id: true },
  });

  let updated = 0;

  for (const shipper of shippers) {
    const metrics = await calculateShipperMetrics(shipper.id);

    await prisma.logisticsShipper.update({
      where: { id: shipper.id },
      data: {
        lastLoadDate: metrics.lastLoadDate,
        firstLoadDate: metrics.firstLoadDate,
        totalLoadsHistoric: metrics.totalLoadsHistoric,
        avgLoadsPerMonth: metrics.avgLoadsPerMonth,
        loadFrequencyDays: metrics.loadFrequencyDays,
        expectedNextLoadDate: metrics.expectedNextLoadDate,
        churnRiskScore: metrics.churnRiskScore,
        metricsCalculatedAt: new Date(),
      },
    });
    updated++;
  }

  return updated;
}

export async function recordDailyChurnKpis(ventureId: number): Promise<void> {
  const summary = await getShipperChurnSummary(ventureId);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  await prisma.freightKpiDaily.upsert({
    where: {
      ventureId_date: {
        ventureId,
        date: today,
      },
    },
    update: {
      activeShippers: summary.activeCount,
      churnedShippers: summary.churnedCount,
      reactivatedShippers: summary.reactivatedCount,
      atRiskShippers: summary.atRiskCount,
      newShippers: summary.newCount,
    },
    create: {
      ventureId,
      date: today,
      activeShippers: summary.activeCount,
      churnedShippers: summary.churnedCount,
      reactivatedShippers: summary.reactivatedCount,
      atRiskShippers: summary.atRiskCount,
      newShippers: summary.newCount,
    },
  });
}

export function getChurnRiskLevel(score: number | null): "low" | "medium" | "high" | "critical" {
  if (score === null) return "medium";
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function getExpectedLoadFrequencyLabel(days: number | null): string {
  if (days === null) return "Unknown";
  if (days <= 3) return "Very High (1-3 days)";
  if (days <= 7) return "High (Weekly)";
  if (days <= 14) return "Medium (Bi-weekly)";
  if (days <= 30) return "Low (Monthly)";
  return "Very Low (30+ days)";
}
