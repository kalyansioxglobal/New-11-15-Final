export type Lane = {
  originState: string;
  destinationState: string;
  distanceMiles?: number | null;
};

export type CarrierLaneHistory = {
  carrierId: number;
  lane: Lane;
  loadsMoved: number;
  onTimePercentage?: number | null;
  averageMarginPerLoad?: number | null;
};

export type CarrierLaneAffinityInput = {
  carrierId: number;
  targetLane: Lane;
  history: CarrierLaneHistory[];
};

export type CarrierLaneAffinityScore = {
  score: number;
  signals: {
    historyMatchCount: number;
    avgOnTimePerformance: number;
    avgMarginQuality: number;
    laneExactMatch: boolean;
    laneRegionMatch: boolean;
  };
};

// Compute a simple, explainable affinity score between a carrier and a lane.
// This is **read-only**, operates only on provided inputs, and does not hit the DB.
// Existing freight queries that aggregate carrier performance by lane can feed
// CarrierLaneHistory entries into this helper in a future wave.
export function computeCarrierLaneAffinity(
  input: CarrierLaneAffinityInput,
): CarrierLaneAffinityScore {
  const { targetLane, history } = input;

  const isExactLane = (lane: Lane) =>
    lane.originState === targetLane.originState &&
    lane.destinationState === targetLane.destinationState;

  const isRegionalLane = (lane: Lane) =>
    lane.originState === targetLane.originState ||
    lane.destinationState === targetLane.destinationState;

  const relevant = history.filter((h) => isRegionalLane(h.lane));

  if (relevant.length === 0) {
    return {
      score: 0,
      signals: {
        historyMatchCount: 0,
        avgOnTimePerformance: 0,
        avgMarginQuality: 0,
        laneExactMatch: false,
        laneRegionMatch: false,
      },
    };
  }

  let totalLoads = 0;
  let weightedOnTime = 0;
  let weightedMargin = 0;
  let exactMatchLoads = 0;

  for (const h of relevant) {
    const loads = Math.max(1, h.loadsMoved);
    totalLoads += loads;

    if (h.onTimePercentage != null) {
      weightedOnTime += loads * h.onTimePercentage;
    }

    if (h.averageMarginPerLoad != null) {
      weightedMargin += loads * h.averageMarginPerLoad;
    }

    if (isExactLane(h.lane)) {
      exactMatchLoads += loads;
    }
  }

  const avgOnTime = totalLoads > 0 ? weightedOnTime / totalLoads : 0;
  const avgMargin = totalLoads > 0 ? weightedMargin / totalLoads : 0;

  // Simple, interpretable scoring: 0–100
  const historyFactor = Math.min(1, totalLoads / 50); // cap at 50 loads
  const onTimeFactor = avgOnTime / 100; // assume 0–100%
  const marginFactor = avgMargin > 0 ? Math.min(1, avgMargin / 500) : 0; // scaled margin
  const exactLaneBoost = exactMatchLoads > 0 ? 0.15 : 0;

  const rawScore =
    0.4 * historyFactor +
    0.35 * onTimeFactor +
    0.25 * marginFactor +
    exactLaneBoost;

  const score = Math.round(Math.max(0, Math.min(1, rawScore)) * 100);

  return {
    score,
    signals: {
      historyMatchCount: totalLoads,
      avgOnTimePerformance: Number(avgOnTime.toFixed(1)),
      avgMarginQuality: Number(avgMargin.toFixed(2)),
      laneExactMatch: exactMatchLoads > 0,
      laneRegionMatch: true,
    },
  };
}
