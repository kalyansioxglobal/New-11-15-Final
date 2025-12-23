import { freightTemplates, hotelTemplates, bpoTemplates, opsDiagnosticsTemplates, tonePresets } from "@/lib/ai/templates";

describe("AI templates and tones", () => {
  it("exposes freight, hotel, bpo, and ops templates", () => {
    expect(freightTemplates.length).toBeGreaterThan(0);
    expect(hotelTemplates.length).toBeGreaterThan(0);
    expect(bpoTemplates.length).toBeGreaterThan(0);
    expect(opsDiagnosticsTemplates.length).toBeGreaterThan(0);
  });

  it("exposes tone presets including neutral, friendly, professional_firm", () => {
    const ids = tonePresets.map((t) => t.id);
    expect(ids).toEqual(expect.arrayContaining(["neutral", "friendly", "professional_firm"]));
  });
});
