export type LaneRiskInput = {
  laneId?: string;
  originState: string;
  destinationState: string;
  historicalLoads: number;
  winRate: number; // 0–1, loads won vs quoted
  avgMargin: number; // monetary
  avgFalloffRate: number; // 0–1
  avgLatePickupRate: number; // 0–1
};

export type LaneRiskScore = {
  score: number;
  riskLevel: "low" | "medium" | "high";
  signals: {
    demandSignal: number;
    pricingSignal: number;
    reliabilityRisk: number;
    competitionSignal: number;
  };
};

// Compute a simple lane risk score. Higher score = higher risk.
// This helper is pure and can be fed by existing analytics queries in
// /api/logistics/dashboard and related endpoints.
export function computeLaneRiskScore(input: LaneRiskInput): LaneRiskScore {
  const { historicalLoads, winRate, avgMargin, avgFalloffRate, avgLatePickupRate } = input;

  const demandSignal = historicalLoads < 10 ? 0.6 : historicalLoads < 50 ? 0.3 : 0.1;
  const pricingSignal = avgMargin < 100 ? 0.6 : avgMargin < 300 ? 0.3 : 0.1;
  const reliabilityRisk = Math.min(1, (avgFalloffRate + avgLatePickupRate) / 2);
  const competitionSignal = winRate < 0.3 ? 0.6 : winRate < 0.6 ? 0.3 : 0.1;

  const raw =
    0.25 * demandSignal +
    0.25 * pricingSignal +
    0.3 * reliabilityRisk +
    0.2 * competitionSignal;

  const bounded = Math.max(0, Math.min(1, raw));
  const score = Math.round(bounded * 100);

  let riskLevel: "low" | "medium" | "high" = "low";
  if (score >= 70) riskLevel = "high";
  else if (score >= 40) riskLevel = "medium";

  return {
    score,
    riskLevel,
    signals: {
      demandSignal: Number((demandSignal * 100).toFixed(1)),
      pricingSignal: Number((pricingSignal * 100).toFixed(1)),
      reliabilityRisk: Number((reliabilityRisk * 100).toFixed(1)),
      competitionSignal: Number((competitionSignal * 100).toFixed(1)),
    },
  };
}
