/**
 * KPI Aggregation Job
 * 
 * Aggregates KPIs from source data (Loads, HotelReviews, BpoCallLogs, etc.)
 * and updates daily KPI records.
 */

import { prisma } from '@/lib/prisma';
import { upsertFreightKpiDaily } from '@/lib/kpiFreight';
import { logger } from '@/lib/logger';
import { JobName } from '@prisma/client';

export interface KpiAggregationJobOptions {
  ventureId?: number;
  date?: Date;
  dryRun?: boolean;
}

export interface KpiAggregationJobResult {
  venturesProcessed: number;
  freightKpisUpdated: number;
  errors: string[];
}

/**
 * Aggregate freight KPIs for a given venture and date
 */
async function aggregateFreightKpisForDate(
  ventureId: number,
  date: Date
): Promise<void> {
  const startOfDay = new Date(date);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setUTCHours(23, 59, 59, 999);

  // Aggregate loads
  const loads = await prisma.load.findMany({
    where: {
      ventureId,
      createdAt: { gte: startOfDay, lte: endOfDay },
    },
    select: {
      status: true,
      billAmount: true,
      costAmount: true,
      billingDate: true,
    },
  });

  const loadsInbound = loads.length;
  const loadsQuoted = loads.filter(l => l.status === 'QUOTED' || l.status === 'COVERED' || l.status === 'DELIVERED').length;
  const loadsCovered = loads.filter(l => l.status === 'COVERED' || l.status === 'DELIVERED').length;
  const loadsLost = loads.filter(l => l.status === 'LOST').length;

  // Aggregate revenue and cost from delivered loads
  const deliveredLoads = loads.filter(l => l.status === 'DELIVERED' && l.billingDate);
  const totalRevenue = deliveredLoads.reduce((sum, l) => sum + (l.billAmount || 0), 0);
  const totalCost = deliveredLoads.reduce((sum, l) => sum + (l.costAmount || 0), 0);

  // Get shipper/carrier counts (from churn job if available, otherwise count active)
  const activeShippers = await prisma.logisticsShipper.count({
    where: {
      ventureId,
      isActive: true,
      isTest: false,
    },
  });

  const activeCarriers = await prisma.carrierVentureStats.count({
    where: {
      ventureId,
      recentLoadsDelivered: { gt: 0 },
    },
  });

  // Upsert KPI record
  await upsertFreightKpiDaily({
    ventureId,
    date: startOfDay,
    loadsInbound,
    loadsQuoted,
    loadsCovered,
    loadsLost,
    totalRevenue,
    totalCost,
    activeShippers,
    activeCarriers,
  });
}

/**
 * Run KPI aggregation job
 */
export async function runKpiAggregationJob(
  options: KpiAggregationJobOptions = {}
): Promise<{ stats: KpiAggregationJobResult; jobRunLogId: number }> {
  const { ventureId, date, dryRun = false } = options;
  const startedAt = new Date();
  const errors: string[] = [];

  const stats: KpiAggregationJobResult = {
    venturesProcessed: 0,
    freightKpisUpdated: 0,
    errors: [],
  };

  let status = 'SUCCESS';

  try {
    const targetDate = date || (() => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setUTCHours(0, 0, 0, 0);
      return yesterday;
    })();

    if (dryRun) {
      const ventureCount = await prisma.venture.count({
        where: {
          isActive: true,
          isTest: false,
          ...(ventureId && { id: ventureId }),
        },
      });
      stats.venturesProcessed = ventureCount;
      return {
        stats,
        jobRunLogId: 0,
      };
    }

    // Get ventures to process
    const ventures = await prisma.venture.findMany({
      where: {
        isActive: true,
        isTest: false,
        ...(ventureId && { id: ventureId }),
        type: { in: ['LOGISTICS', 'TRANSPORT'] }, // Only freight ventures
      },
      select: { id: true, name: true },
    });

    for (const venture of ventures) {
      try {
        await aggregateFreightKpisForDate(venture.id, targetDate);
        stats.freightKpisUpdated++;
        stats.venturesProcessed++;
      } catch (err: any) {
        const errorMsg = `Venture ${venture.name} (${venture.id}): ${err.message || 'Unknown error'}`;
        errors.push(errorMsg);
        stats.errors.push(errorMsg);
        logger.error('kpi_aggregation_venture_failed', {
          ventureId: venture.id,
          ventureName: venture.name,
          date: targetDate.toISOString(),
          error: err.message || String(err),
        });
      }
    }

    if (errors.length > 0) {
      status = 'PARTIAL';
    }
  } catch (err: any) {
    status = 'ERROR';
    const errorMsg = err.message || 'Unknown error';
    errors.push(errorMsg);
    stats.errors.push(errorMsg);
    logger.error('kpi_aggregation_job_failed', {
      ventureId,
      date: date?.toISOString(),
      error: errorMsg,
      stack: process.env.NODE_ENV !== 'production' ? (err as Error).stack : undefined,
    });
  }

  // Create job run log
  const jobRunLog = await prisma.jobRunLog.create({
    data: {
      jobName: JobName.KPI_AGGREGATION,
      status,
      startedAt,
      endedAt: new Date(),
      statsJson: JSON.stringify({ ...stats, jobType: 'KPI_AGGREGATION' }),
      error: errors.length > 0 ? errors.join('; ') : null,
    },
  });

  return {
    stats,
    jobRunLogId: jobRunLog.id,
  };
}

