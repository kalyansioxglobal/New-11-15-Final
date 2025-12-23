export type CarrierAvailabilityInput = {
  carrierId: number;
  recentLoads: number; // loads in the last N days
  openCapacity: number; // manually observed or derived capacity units
  falloffRate: number; // percentage of falloffs / cancellations (0–1)
  responseRate: number; // percentage of responses to offers (0–1)
};

export type CarrierAvailabilityScore = {
  score: number;
  signals: {
    recentActivity: number;
    capacitySignal: number;
    reliabilityPenalty: number;
    responsiveness: number;
  };
};

// Read-only helper that estimates how "available" a carrier is likely to be
// based on simple, aggregated signals. This is intentionally simple and
// transparent so it can be inspected and tuned in future waves.
export function computeCarrierAvailabilityScore(
  input: CarrierAvailabilityInput,
): CarrierAvailabilityScore {
  const { recentLoads, openCapacity, falloffRate, responseRate } = input;

  const activityScore = Math.min(1, recentLoads / 20); // cap at 20 recent loads
  const capacityScore = Math.min(1, openCapacity / 10); // cap at 10 units
  const reliabilityPenalty = Math.min(1, falloffRate); // 0–1
  const responsiveness = Math.max(0, Math.min(1, responseRate));

  const rawScore =
    0.35 * activityScore +
    0.3 * capacityScore +
    0.25 * responsiveness -
    0.3 * reliabilityPenalty;

  const bounded = Math.max(0, Math.min(1, rawScore));

  return {
    score: Math.round(bounded * 100),
    signals: {
      recentActivity: Number((activityScore * 100).toFixed(1)),
      capacitySignal: Number((capacityScore * 100).toFixed(1)),
      reliabilityPenalty: Number((reliabilityPenalty * 100).toFixed(1)),
      responsiveness: Number((responsiveness * 100).toFixed(1)),
    },
  };
}
