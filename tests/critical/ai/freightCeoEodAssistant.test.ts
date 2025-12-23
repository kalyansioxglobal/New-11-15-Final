import { buildFreightCeoEodPrompt } from "@/lib/ai/freightCeoEodAssistant";

jest.mock("@/lib/ai/aiClient", () => ({
  callFreightAssistant: jest.fn().mockResolvedValue("stubbed"),
}));

describe("freightCeoEodAssistant", () => {
  it("includes key metrics and intelligence in the prompt", () => {
    const prompt = buildFreightCeoEodPrompt({
      draftType: "daily_summary",
      metrics: {
        windowLabel: "last 7 days",
        totalLoads: 100,
        coveredRate: 0.9,
        avgMargin: 250,
        topLanes: [
          { laneId: "TX-CA", origin: "TX", destination: "CA", loads: 20 },
        ],
      },
      intelligence: {
        laneRisk: [{ laneId: "TX-CA", score: 60, riskLevel: "medium" }],
      },
      userId: 1,
    } as any);

    expect(prompt).toContain("last 7 days");
    expect(prompt).toContain("totalLoads: 100");
    expect(prompt).toContain("TX -> CA");
    expect(prompt).toContain("laneId=TX-CA");
  });
});
