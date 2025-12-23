// lib/kpiFreight.ts
import prisma from "./prisma";

export type FreightKpiDailyLike = {
  loadsInbound: number;
  loadsCovered: number;
  totalRevenue: number;
  totalProfit: number;
};

export type FreightKpiInput = {
  ventureId: number;
  date: Date;
  loadsInbound?: number;
  loadsQuoted?: number;
  loadsCovered?: number;
  loadsLost?: number;
  totalRevenue?: number;
  totalCost?: number;
  totalProfit?: number;
  avgMarginPct?: number;
  activeShippers?: number;
  newShippers?: number;
  churnedShippers?: number;
  reactivatedShippers?: number;
  atRiskShippers?: number;
  activeCarriers?: number;
  newCarriers?: number;
};

export async function upsertFreightKpiDaily(
  input: FreightKpiInput
): Promise<FreightKpiDailyLike> {
  const {
    ventureId,
    date,
    loadsInbound = 0,
    loadsQuoted = 0,
    loadsCovered = 0,
    loadsLost = 0,
    totalRevenue = 0,
    totalCost: inputTotalCost,
    totalProfit,
    avgMarginPct,
    activeShippers = 0,
    newShippers = 0,
    churnedShippers = 0,
    reactivatedShippers = 0,
    atRiskShippers = 0,
    activeCarriers = 0,
    newCarriers = 0,
  } = input;

  // Explicit null handling: ensure totalCost is a number (default to 0 if null/undefined)
  const totalCost = inputTotalCost ?? 0;

  const profit =
    typeof totalProfit === "number"
      ? totalProfit
      : totalRevenue - totalCost;

  const marginPct =
    typeof avgMarginPct === "number"
      ? avgMarginPct
      : totalRevenue > 0
      ? (profit / totalRevenue) * 100
      : 0;

  return prisma.freightKpiDaily.upsert({
    where: {
      ventureId_date: {
        ventureId,
        date,
      },
    },
    update: {
      loadsInbound,
      loadsQuoted,
      loadsCovered,
      loadsLost,
      totalRevenue,
      totalCost,
      totalProfit: profit,
      avgMarginPct: marginPct,
      activeShippers,
      newShippers,
      churnedShippers,
      reactivatedShippers,
      atRiskShippers,
      activeCarriers,
      newCarriers,
    },
    create: {
      ventureId,
      date,
      loadsInbound,
      loadsQuoted,
      loadsCovered,
      loadsLost,
      totalRevenue,
      totalCost,
      totalProfit: profit,
      avgMarginPct: marginPct,
      activeShippers,
      newShippers,
      churnedShippers,
      reactivatedShippers,
      atRiskShippers,
      activeCarriers,
      newCarriers,
    },
  });
}

export function summarizeFreightKpis(rows: FreightKpiDailyLike[]) {
  let totalLoadsInbound = 0;
  let totalLoadsCovered = 0;
  let totalRevenue = 0;
  let totalProfit = 0;

  for (const r of rows) {
    totalLoadsInbound += r.loadsInbound;
    totalLoadsCovered += r.loadsCovered;
    totalRevenue += r.totalRevenue;
    totalProfit += r.totalProfit;
  }

  const coverageRate =
    totalLoadsInbound > 0
      ? (totalLoadsCovered / totalLoadsInbound) * 100
      : 0;

  const overallMarginPct =
    totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  return {
    totalLoadsInbound,
    totalLoadsCovered,
    totalRevenue,
    totalProfit,
    coverageRate,
    overallMarginPct,
    lowCoverage: coverageRate < 70,
    lowMargin: overallMarginPct < 10,
  };
}
