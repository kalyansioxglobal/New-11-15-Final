import { analyzeShipperSeasonality } from "@/lib/freight-intelligence/shipperSeasonality";

describe("analyzeShipperSeasonality", () => {
  it("returns non-seasonal result for empty input", () => {
    const result = analyzeShipperSeasonality({ shipperId: 1, buckets: [] });
    expect(result.seasonal).toBe(false);
    expect(result.seasonType).toBeNull();
    expect(result.expectedLoadFrequency).toBe(0);
  });

  it("detects Q4 seasonality when Q4 volumes are dominant", () => {
    const result = analyzeShipperSeasonality({
      shipperId: 1,
      buckets: [
        { year: 2024, month: 7, loadCount: 2 },
        { year: 2024, month: 8, loadCount: 3 },
        { year: 2024, month: 10, loadCount: 10 },
        { year: 2024, month: 11, loadCount: 18 },
        { year: 2024, month: 12, loadCount: 20 },
      ],
    });

    expect(result.seasonal).toBe(true);
    expect(result.seasonType).toBe("q4");
    expect(result.expectedLoadFrequency).toBeGreaterThan(10);
  });
});
