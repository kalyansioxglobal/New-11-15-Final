export type ShipperHealthInput = {
  shipperId: number;
  lastLoads: number; // count of recent loads
  avgMargin: number; // monetary
  expectedFrequency: number; // expected loads per period
  actualFrequency: number; // actual loads per period
  responseRate: number; // 0–1
  csrTouchpoints: number; // recent CSR interactions
  laneDiversity: number; // distinct lanes count
  cancellations: number; // recent cancelled loads
  latePickups: number; // recent late pickups
};

export type ShipperHealthScore = {
  score: number;
  riskLevel: "green" | "yellow" | "red";
  contributingFactors: {
    marginSignal: number;
    volumeSignal: number;
    responseSignal: number;
    retentionSignal: number;
    reliabilityPenalty: number;
  };
};

// Pure helper that estimates a shipper health score from pre-aggregated
// operational metrics. Higher score = healthier shipper.
export function computeShipperHealthScore(input: ShipperHealthInput): ShipperHealthScore {
  const {
    avgMargin,
    expectedFrequency,
    actualFrequency,
    responseRate,
    csrTouchpoints,
    laneDiversity,
    cancellations,
    latePickups,
  } = input;

  const marginSignal = avgMargin <= 0 ? 0 : Math.min(1, avgMargin / 300);

  const volumeRatio = expectedFrequency > 0 ? actualFrequency / expectedFrequency : 1;
  const volumeSignal = volumeRatio >= 1
    ? 1
    : volumeRatio >= 0.7
    ? 0.7
    : volumeRatio >= 0.4
    ? 0.4
    : 0.1;

  const responseSignal = Math.max(0, Math.min(1, responseRate));

  const retentionBase = Math.min(1, laneDiversity / 5);
  const engagementBoost = Math.min(0.3, csrTouchpoints / 20);
  const retentionSignal = Math.max(0, Math.min(1, retentionBase + engagementBoost));

  const reliabilityEvents = cancellations + latePickups;
  const reliabilityPenalty = Math.min(1, reliabilityEvents / 10);

  const raw =
    0.3 * marginSignal +
    0.25 * volumeSignal +
    0.2 * responseSignal +
    0.2 * retentionSignal -
    0.25 * reliabilityPenalty;

  const bounded = Math.max(0, Math.min(1, raw));
  const score = Math.round(bounded * 100);

  let riskLevel: "green" | "yellow" | "red" = "green";
  if (score < 40) riskLevel = "red";
  else if (score < 70) riskLevel = "yellow";

  return {
    score,
    riskLevel,
    contributingFactors: {
      marginSignal: Number((marginSignal * 100).toFixed(1)),
      volumeSignal: Number((volumeSignal * 100).toFixed(1)),
      responseSignal: Number((responseSignal * 100).toFixed(1)),
      retentionSignal: Number((retentionSignal * 100).toFixed(1)),
      reliabilityPenalty: Number((reliabilityPenalty * 100).toFixed(1)),
    },
  };
}
