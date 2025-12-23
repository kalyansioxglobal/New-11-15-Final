import { computeCarrierLaneAffinity } from "@/lib/freight-intelligence/carrierLaneAffinity";
import { computeCarrierAvailabilityScore } from "@/lib/freight-intelligence/carrierAvailabilityScore";
import { computeLaneRiskScore } from "@/lib/freight-intelligence/laneRiskScore";

describe("carrier and lane intelligence helpers", () => {
  it("computes higher affinity when carrier has strong history on lane", () => {
    const high = computeCarrierLaneAffinity({
      carrierId: 1,
      targetLane: { originState: "TX", destinationState: "CA" },
      history: [
        {
          carrierId: 1,
          lane: { originState: "TX", destinationState: "CA" },
          loadsMoved: 20,
          onTimePercentage: 95,
          averageMarginPerLoad: 300,
        },
      ],
    });

    const low = computeCarrierLaneAffinity({
      carrierId: 1,
      targetLane: { originState: "TX", destinationState: "CA" },
      history: [],
    });

    expect(high.score).toBeGreaterThan(low.score);
  });

  it("computes availability and lane risk without errors", () => {
    const availability = computeCarrierAvailabilityScore({
      carrierId: 1,
      recentLoads: 10,
      openCapacity: 5,
      falloffRate: 0.1,
      responseRate: 0.8,
    });

    const laneRisk = computeLaneRiskScore({
      originState: "TX",
      destinationState: "CA",
      historicalLoads: 30,
      winRate: 0.5,
      avgMargin: 200,
      avgFalloffRate: 0.1,
      avgLatePickupRate: 0.2,
    });

    expect(availability.score).toBeGreaterThanOrEqual(0);
    expect(laneRisk.score).toBeGreaterThanOrEqual(0);
  });
});
