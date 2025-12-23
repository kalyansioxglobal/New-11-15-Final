import { buildHotelOutreachPrompt } from "@/lib/ai/hotelOutreachAssistant";

jest.mock("@/lib/ai/aiClient", () => ({
  callFreightAssistant: jest.fn().mockResolvedValue("stubbed"),
}));

describe("hotelOutreachAssistant", () => {
  it("includes property and platform in the prompt", () => {
    const prompt = buildHotelOutreachPrompt({
      draftType: "ota_parity_issue",
      propertyName: "Hotel Sunrise",
      platform: "Booking.com",
      issueContext: "Parity mismatch on weekend rates.",
      notes: "VIP property; keep tone high-touch.",
      userId: 1,
    } as any);

    expect(prompt).toContain("Hotel Sunrise");
    expect(prompt).toContain("Booking.com");
    expect(prompt).toContain("Parity mismatch");
  });
});
