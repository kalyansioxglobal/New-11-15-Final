import { buildFreightOpsDiagnosticsPrompt } from "@/lib/ai/freightOpsDiagnosticsAssistant";

jest.mock("@/lib/ai/aiClient", () => ({
  callFreightAssistant: jest.fn().mockResolvedValue("stubbed"),
}));

describe("freightOpsDiagnosticsAssistant", () => {
  it("includes log entries in the prompt", () => {
    const prompt = buildFreightOpsDiagnosticsPrompt({
      draftType: "sre_summary",
      recentLogSample: [
        { endpoint: "/api/x", outcome: "error", errorCode: "E123", durationMs: 450 },
      ],
      userId: 1,
    } as any);

    expect(prompt).toContain("/api/x");
    expect(prompt).toContain("E123");
  });
});
