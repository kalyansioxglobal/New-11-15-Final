export type MonthlyLoadBucket = {
  year: number;
  month: number; // 1–12
  loadCount: number;
};

export type ShipperSeasonalityInput = {
  shipperId: number;
  buckets: MonthlyLoadBucket[]; // last 6–12 months, pre-aggregated
};

export type ShipperSeasonalityResult = {
  seasonal: boolean;
  seasonType: "winter" | "summer" | "q4" | "q1" | null;
  expectedLoadFrequency: number;
  currentLoadFrequency: number;
  isNormalSeasonDip: boolean;
};

// Helper that detects simple, calendar-based seasonality patterns
// using pre-aggregated monthly load counts. This is intentionally
// conservative and explainable to avoid false churn positives.
export function analyzeShipperSeasonality(
  input: ShipperSeasonalityInput,
): ShipperSeasonalityResult {
  const { buckets } = input;
  if (buckets.length === 0) {
    return {
      seasonal: false,
      seasonType: null,
      expectedLoadFrequency: 0,
      currentLoadFrequency: 0,
      isNormalSeasonDip: false,
    };
  }

  const sorted = [...buckets].sort((a, b) => a.year === b.year ? a.month - b.month : a.year - b.year);
  const current = sorted[sorted.length - 1];

  const byQuarter: Record<string, { total: number; months: number }> = {};
  const bySeason: Record<string, { total: number; months: number }> = {};

  for (const b of sorted) {
    const quarter = getQuarterKey(b.month);
    const season = getSeasonKey(b.month);

    if (!byQuarter[quarter]) byQuarter[quarter] = { total: 0, months: 0 };
    byQuarter[quarter].total += b.loadCount;
    byQuarter[quarter].months += 1;

    if (!bySeason[season]) bySeason[season] = { total: 0, months: 0 };
    bySeason[season].total += b.loadCount;
    bySeason[season].months += 1;
  }

  const quarterAverages = Object.entries(byQuarter).map(([quarter, agg]) => ({
    quarter,
    avg: agg.total / Math.max(1, agg.months),
  }));
  const seasonAverages = Object.entries(bySeason).map(([season, agg]) => ({
    season,
    avg: agg.total / Math.max(1, agg.months),
  }));

  const dominantQuarter = quarterAverages.reduce((best, cur) => (cur.avg > best.avg ? cur : best), quarterAverages[0]);
  const dominantSeason = seasonAverages.reduce((best, cur) => (cur.avg > best.avg ? cur : best), seasonAverages[0]);

  const overallAvg =
    sorted.reduce((sum, b) => sum + b.loadCount, 0) /
    Math.max(1, sorted.length);

  const currentAvg = current.loadCount;

  const seasonalByQuarter = dominantQuarter.avg >= overallAvg * 1.4; // 40%+ above overall
  const seasonalBySeason = dominantSeason.avg >= overallAvg * 1.4;

  let seasonType: ShipperSeasonalityResult["seasonType"] = null;
  if (seasonalByQuarter) {
    if (dominantQuarter.quarter === "Q4") seasonType = "q4";
    else if (dominantQuarter.quarter === "Q1") seasonType = "q1";
  }
  if (!seasonType && seasonalBySeason) {
    if (dominantSeason.season === "winter") seasonType = "winter";
    else if (dominantSeason.season === "summer") seasonType = "summer";
  }

  const seasonal = seasonType !== null;

  const expectedLoadFrequency = seasonal ? dominantQuarter.avg : overallAvg;
  const isNormalSeasonDip =
    seasonal &&
    currentAvg < expectedLoadFrequency &&
    currentAvg >= expectedLoadFrequency * 0.4; // still within 60% dip

  return {
    seasonal,
    seasonType,
    expectedLoadFrequency: Number(expectedLoadFrequency.toFixed(2)),
    currentLoadFrequency: currentAvg,
    isNormalSeasonDip,
  };
}

function getQuarterKey(month: number): "Q1" | "Q2" | "Q3" | "Q4" {
  if (month <= 3) return "Q1";
  if (month <= 6) return "Q2";
  if (month <= 9) return "Q3";
  return "Q4";
}

function getSeasonKey(month: number): "winter" | "spring" | "summer" | "fall" {
  if (month === 12 || month <= 2) return "winter";
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  return "fall";
}
