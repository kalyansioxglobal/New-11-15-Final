import { prisma } from '@/lib/prisma';
import { ShipperChurnStatus } from '@prisma/client';

interface ChurnMetrics {
  lastLoadDate: Date | null;
  loadFrequencyDays: number | null;
  churnRiskScore: number | null;
  churnStatus: ShipperChurnStatus;
}

const CHURN_THRESHOLDS = {
  ACTIVE_MAX_DAYS: 30,
  AT_RISK_MAX_DAYS: 60,
};

function calculateChurnStatus(daysSinceLastLoad: number | null): ShipperChurnStatus {
  if (daysSinceLastLoad === null) {
    return ShipperChurnStatus.ACTIVE;
  }

  if (daysSinceLastLoad <= CHURN_THRESHOLDS.ACTIVE_MAX_DAYS) {
    return ShipperChurnStatus.ACTIVE;
  }

  if (daysSinceLastLoad <= CHURN_THRESHOLDS.AT_RISK_MAX_DAYS) {
    return ShipperChurnStatus.AT_RISK;
  }

  return ShipperChurnStatus.CHURNED;
}

function calculateRiskScore(daysSinceLastLoad: number | null, avgFrequency: number | null): number {
  if (daysSinceLastLoad === null) {
    return 0;
  }

  if (avgFrequency && avgFrequency > 0) {
    const missedCycles = daysSinceLastLoad / avgFrequency;
    if (missedCycles <= 1) return 0;
    if (missedCycles <= 2) return 30;
    if (missedCycles <= 3) return 60;
    return Math.min(100, Math.round(missedCycles * 20));
  }

  if (daysSinceLastLoad <= 14) return 0;
  if (daysSinceLastLoad <= 30) return 20;
  if (daysSinceLastLoad <= 45) return 40;
  if (daysSinceLastLoad <= 60) return 60;
  if (daysSinceLastLoad <= 90) return 80;
  return 100;
}

export async function calculateCustomerChurnMetrics(customerId: number): Promise<ChurnMetrics> {
  const loads = await prisma.load.findMany({
    where: {
      customerId,
      loadStatus: { not: 'LOST' },
    },
    select: {
      pickupDate: true,
      createdAt: true,
    },
    orderBy: { pickupDate: 'desc' },
  });

  if (loads.length === 0) {
    return {
      lastLoadDate: null,
      loadFrequencyDays: null,
      churnRiskScore: 0,
      churnStatus: ShipperChurnStatus.ACTIVE,
    };
  }

  const loadDates = loads
    .map(l => l.pickupDate || l.createdAt)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => b.getTime() - a.getTime());

  const lastLoadDate = loadDates[0] || null;

  let loadFrequencyDays: number | null = null;
  if (loadDates.length >= 2) {
    const intervals: number[] = [];
    for (let i = 0; i < loadDates.length - 1 && i < 10; i++) {
      const daysDiff = (loadDates[i].getTime() - loadDates[i + 1].getTime()) / (1000 * 60 * 60 * 24);
      intervals.push(daysDiff);
    }
    loadFrequencyDays = intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : null;
  }

  const daysSinceLastLoad = lastLoadDate
    ? Math.floor((Date.now() - lastLoadDate.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const churnStatus = calculateChurnStatus(daysSinceLastLoad);
  const churnRiskScore = calculateRiskScore(daysSinceLastLoad, loadFrequencyDays);

  return {
    lastLoadDate,
    loadFrequencyDays,
    churnRiskScore,
    churnStatus,
  };
}

export async function updateCustomerChurnMetrics(customerId: number): Promise<void> {
  const metrics = await calculateCustomerChurnMetrics(customerId);

  await prisma.customer.update({
    where: { id: customerId },
    data: {
      lastLoadDate: metrics.lastLoadDate,
      loadFrequencyDays: metrics.loadFrequencyDays,
      churnRiskScore: metrics.churnRiskScore,
      churnStatus: metrics.churnStatus,
    },
  });
}

export async function updateAllCustomerChurnMetrics(ventureId?: number): Promise<{
  processed: number;
  updated: number;
  errors: number;
}> {
  const customers = await prisma.customer.findMany({
    where: {
      isActive: true,
      ...(ventureId && { ventureId }),
    },
    select: { id: true },
  });

  let processed = 0;
  let updated = 0;
  let errors = 0;

  for (const customer of customers) {
    try {
      await updateCustomerChurnMetrics(customer.id);
      processed++;
      updated++;
    } catch (error) {
      console.error(`Error updating churn for customer ${customer.id}:`, error);
      processed++;
      errors++;
    }
  }

  return { processed, updated, errors };
}
