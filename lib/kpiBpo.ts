// lib/kpiBpo.ts
import prisma from "./prisma";

export type BpoDailyMetricLike = {
  talkTimeMin?: number | null;
  handledCalls?: number | null;
  outboundCalls?: number | null;
  leadsCreated?: number | null;
  demosBooked?: number | null;
  salesClosed?: number | null;
  avgQaScore?: number | null;
  revenue?: number | null;
  cost?: number | null;
};

export type BpoKpiInput = {
  campaignId: number;
  date: Date;
  talkTimeMin?: number;
  handledCalls?: number;
  outboundCalls?: number;
  leadsCreated?: number;
  demosBooked?: number;
  salesClosed?: number;
  fteCount?: number;
  avgQaScore?: number;
  revenue?: number;
  cost?: number;
  isTest?: boolean;
};

export async function upsertBpoKpiDaily(
  input: BpoKpiInput
): Promise<BpoDailyMetricLike> {
  const {
    campaignId,
    date,
    talkTimeMin = 0,
    handledCalls = 0,
    outboundCalls = 0,
    leadsCreated = 0,
    demosBooked = 0,
    salesClosed = 0,
    fteCount,
    avgQaScore,
    revenue = 0,
    cost = 0,
    isTest = false,
  } = input;

  return prisma.bpoDailyMetric.upsert({
    where: {
      campaignId_date: {
        campaignId,
        date,
      },
    },
    update: {
      talkTimeMin,
      handledCalls,
      outboundCalls,
      leadsCreated,
      demosBooked,
      salesClosed,
      fteCount,
      avgQaScore,
      revenue,
      cost,
      isTest,
    },
    create: {
      campaignId,
      date,
      talkTimeMin,
      handledCalls,
      outboundCalls,
      leadsCreated,
      demosBooked,
      salesClosed,
      fteCount,
      avgQaScore,
      revenue,
      cost,
      isTest,
    },
  });
}

export function summarizeBpoKpis(rows: BpoDailyMetricLike[]) {
  let totalTalkTimeMin = 0;
  let totalHandledCalls = 0;
  let totalOutboundCalls = 0;
  let totalLeadsCreated = 0;
  let totalDemosBooked = 0;
  let totalSalesClosed = 0;
  let totalRevenue = 0;
  let totalCost = 0;
  let totalQaScoreWeighted = 0;
  let qaSamples = 0;

  for (const r of rows) {
    totalTalkTimeMin += r.talkTimeMin ?? 0;
    totalHandledCalls += r.handledCalls ?? 0;
    totalOutboundCalls += r.outboundCalls ?? 0;
    totalLeadsCreated += r.leadsCreated ?? 0;
    totalDemosBooked += r.demosBooked ?? 0;
    totalSalesClosed += r.salesClosed ?? 0;
    totalRevenue += r.revenue ?? 0;
    totalCost += r.cost ?? 0;
    if (r.avgQaScore && r.avgQaScore > 0) {
      totalQaScoreWeighted += r.avgQaScore;
      qaSamples++;
    }
  }

  const connectRate =
    totalOutboundCalls > 0
      ? (totalHandledCalls / totalOutboundCalls) * 100
      : 0;

  const conversionRate =
    totalOutboundCalls > 0
      ? (totalLeadsCreated / totalOutboundCalls) * 100
      : 0;

  const avgQaScore =
    qaSamples > 0 ? totalQaScoreWeighted / qaSamples : 0;

  const roi =
    totalCost > 0
      ? ((totalRevenue - totalCost) / totalCost) * 100
      : 0;

  return {
    totalTalkTimeMin,
    totalHandledCalls,
    totalOutboundCalls,
    totalLeadsCreated,
    totalDemosBooked,
    totalSalesClosed,
    totalRevenue,
    totalCost,
    connectRate,
    conversionRate,
    avgQaScore,
    roi,
  };
}
