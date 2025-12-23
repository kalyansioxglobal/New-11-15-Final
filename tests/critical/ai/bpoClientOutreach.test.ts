import { buildBpoClientOutreachPrompt } from "@/lib/ai/bpoClientOutreachAssistant";

jest.mock("@/lib/ai/aiClient", () => ({
  callFreightAssistant: jest.fn().mockResolvedValue("stubbed"),
}));

describe("bpoClientOutreachAssistant", () => {
  it("includes client name and context in the prompt", () => {
    const prompt = buildBpoClientOutreachPrompt({
      draftType: "monthly_kpi",
      clientName: "Acme Corp",
      contextNotes: "Slightly below target on AHT, above on CSAT.",
      userId: 1,
    } as any);

    expect(prompt).toContain("Acme Corp");
    expect(prompt).toContain("Slightly below target");
  });
});
