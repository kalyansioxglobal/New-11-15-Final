export type NumericRow = Record<string, number | null>;

export function summarizeNumericRows(rows: NumericRow[], fields: string[]) {
  const totals: Record<string, number> = {};
  const averages: Record<string, number> = {};

  for (const field of fields) {
    const values = rows.map((r) => r[field] ?? 0);
    const sum = values.reduce((a, b) => a + b, 0);
    totals[field] = sum;
    averages[field] = values.length ? sum / values.length : 0;
  }

  return { totals, averages };
}

export function summarizeWithMinMax(rows: NumericRow[], fields: string[]) {
  const result: Record<string, { total: number; avg: number; min: number; max: number }> = {};

  for (const field of fields) {
    const values = rows.map((r) => r[field] ?? 0);
    const sum = values.reduce((a, b) => a + b, 0);
    result[field] = {
      total: sum,
      avg: values.length ? sum / values.length : 0,
      min: values.length ? Math.min(...values) : 0,
      max: values.length ? Math.max(...values) : 0,
    };
  }

  return result;
}

export function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function percentOf(part: number, whole: number): number {
  if (whole === 0) return 0;
  return (part / whole) * 100;
}

export const FREIGHT_SUMMARY_FIELDS = [
  "loadsInbound",
  "loadsQuoted",
  "loadsCovered",
  "loadsLost",
  "totalRevenue",
  "totalCost",
  "totalProfit",
  "activeShippers",
  "newShippers",
  "activeCarriers",
  "newCarriers",
] as const;

export const HOTEL_SUMMARY_FIELDS = [
  "roomsSold",
  "roomsAvailable",
  "roomRevenue",
  "otherRevenue",
  "totalRevenue",
  "grossOperatingProfit",
  "cancellations",
  "noShows",
  "walkins",
  "complaints",
  "roomsOutOfOrder",
] as const;

export const BPO_SUMMARY_FIELDS = [
  "talkTimeMin",
  "handledCalls",
  "revenue",
] as const;

export function summarizeFreightKpi(rows: NumericRow[]) {
  const { totals, averages } = summarizeNumericRows(rows, [...FREIGHT_SUMMARY_FIELDS]);
  
  return {
    totals,
    averages: {
      ...averages,
      avgMarginPct: totals.totalRevenue > 0 
        ? (totals.totalProfit / totals.totalRevenue) * 100 
        : 0,
      coverRatio: totals.loadsQuoted > 0 
        ? (totals.loadsCovered / totals.loadsQuoted) * 100 
        : 0,
      lossRatio: totals.loadsQuoted > 0 
        ? (totals.loadsLost / totals.loadsQuoted) * 100 
        : 0,
    },
    days: rows.length,
  };
}

export function summarizeHotelKpi(rows: NumericRow[]) {
  const { totals, averages } = summarizeNumericRows(rows, [...HOTEL_SUMMARY_FIELDS]);
  
  const occupancyPct = totals.roomsAvailable > 0 
    ? (totals.roomsSold / totals.roomsAvailable) * 100 
    : 0;
  const adr = totals.roomsSold > 0 
    ? totals.roomRevenue / totals.roomsSold 
    : 0;
  const revpar = totals.roomsAvailable > 0 
    ? totals.totalRevenue / totals.roomsAvailable 
    : 0;
  const goppar = totals.roomsAvailable > 0 
    ? totals.grossOperatingProfit / totals.roomsAvailable 
    : 0;

  return {
    totals,
    averages: {
      ...averages,
      occupancyPct,
      adr,
      revpar,
      goppar,
    },
    days: rows.length,
  };
}

export function summarizeBpoKpi(rows: NumericRow[]) {
  const { totals, averages } = summarizeNumericRows(rows, [...BPO_SUMMARY_FIELDS]);
  
  return {
    totals,
    averages: {
      ...averages,
      aht: totals.handledCalls > 0 
        ? totals.talkTimeMin / totals.handledCalls 
        : 0,
    },
    days: rows.length,
  };
}
