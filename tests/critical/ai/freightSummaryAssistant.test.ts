import {
  buildFreightSummaryPrompt,
  generateFreightSummary,
} from "@/lib/ai/freightSummaryAssistant";

jest.mock("@/lib/ai/aiClient", () => ({
  callFreightAssistant: jest.fn().mockResolvedValue("stubbed summary"),
}));

const baseOptions = {
  userId: 1,
  metrics: {
    windowDays: 7,
    totalLoads: 10,
    coveredRate: 0.8,
    avgMargin: 200,
    topLanes: [
      { laneId: "TX-CA", origin: "TX", destination: "CA", loads: 5 },
    ],
    topShippers: [
      { id: 1, name: "Shipper A", healthScore: 70, riskLevel: "yellow" },
    ],
    topCarriers: [
      { id: 1, name: "Carrier A", laneAffinityScore: 80 },
    ],
    topCsrs: [
      { id: 1, name: "CSR A", performanceScore: 75 },
    ],
  },
  intelligence: {
    laneRisk: [
      { laneId: "TX-CA", score: 60, riskLevel: "medium" },
    ],
    shipperHealth: [
      { shipperId: 1, score: 70, riskLevel: "yellow" },
    ],
    carrierSignals: [
      { carrierId: 1, laneAffinityScore: 80, availabilityScore: 85 },
    ],
    csrPerformance: [
      { userId: 1, score: 75 },
    ],
  },
};

describe("freightSummaryAssistant", () => {
  it("builds a structured prompt including key sections", () => {
    const prompt = buildFreightSummaryPrompt(baseOptions);
    expect(prompt).toContain("[WINDOW]");
    expect(prompt).toContain("[TOP_LANES]");
    expect(prompt).toContain("[TOP_SHIPPERS]");
    expect(prompt).toContain("[LANE_RISK]");
  });

  it("calls aiClient and returns text", async () => {
    const text = await generateFreightSummary(baseOptions);
    expect(text).toBe("stubbed summary");
  });
});
