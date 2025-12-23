export type CsrFreightPerformanceInput = {
  userId: number;
  loadsSecured: number;
  totalQuotes: number;
  avgMargin: number; // monetary
  medianResponseMinutes: number;
  laneDiversity: number; // distinct lanes
  repeatShipperLoads: number;
  totalLoads: number;
};

export type CsrFreightPerformanceScore = {
  score: number;
  strengths: string[];
  weaknesses: string[];
};

// Compute an interpretable CSR/Sales freight performance score. All inputs
// are expected to be pre-aggregated from existing freight analytics queries.
export function computeCsrFreightPerformanceScore(
  input: CsrFreightPerformanceInput,
): CsrFreightPerformanceScore {
  const {
    loadsSecured,
    totalQuotes,
    avgMargin,
    medianResponseMinutes,
    laneDiversity,
    repeatShipperLoads,
    totalLoads,
  } = input;

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  const quoteToBook = totalQuotes > 0 ? loadsSecured / totalQuotes : 0;
  const quoteToBookScore = quoteToBook >= 0.6 ? 1 : quoteToBook >= 0.3 ? 0.6 : 0.2;
  if (quoteToBook >= 0.6) strengths.push("Strong quote-to-book ratio");
  else if (quoteToBook < 0.3) weaknesses.push("Low quote-to-book ratio");

  const marginScore = avgMargin <= 0 ? 0 : Math.min(1, avgMargin / 250);
  if (marginScore > 0.8) strengths.push("High average margin");
  else if (marginScore < 0.3) weaknesses.push("Thin margins on secured freight");

  const responseScore =
    medianResponseMinutes <= 10 ? 1 : medianResponseMinutes <= 30 ? 0.7 : 0.3;
  if (responseScore > 0.8) strengths.push("Fast response to opportunities");
  else if (responseScore < 0.5) weaknesses.push("Slow response to opportunities");

  const laneScore = Math.min(1, laneDiversity / 8);
  if (laneScore > 0.7) strengths.push("Good lane diversity");
  else if (laneScore < 0.3) weaknesses.push("Limited lane diversity");

  const retentionRatio = totalLoads > 0 ? repeatShipperLoads / totalLoads : 0;
  const retentionScore = retentionRatio >= 0.7 ? 1 : retentionRatio >= 0.4 ? 0.7 : 0.3;
  if (retentionScore > 0.8) strengths.push("Strong repeat-shipper retention");
  else if (retentionScore < 0.5) weaknesses.push("Weak repeat-shipper retention");

  const raw =
    0.25 * quoteToBookScore +
    0.25 * marginScore +
    0.2 * responseScore +
    0.15 * laneScore +
    0.15 * retentionScore;

  const bounded = Math.max(0, Math.min(1, raw));

  return {
    score: Math.round(bounded * 100),
    strengths,
    weaknesses,
  };
}
