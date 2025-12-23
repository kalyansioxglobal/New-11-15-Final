import { computeCsrFreightPerformanceScore } from "@/lib/freight-intelligence/csrFreightPerformanceScore";

describe("computeCsrFreightPerformanceScore", () => {
  it("identifies strengths for high-performing CSR", () => {
    const result = computeCsrFreightPerformanceScore({
      userId: 1,
      loadsSecured: 60,
      totalQuotes: 80,
      avgMargin: 300,
      medianResponseMinutes: 5,
      laneDiversity: 10,
      repeatShipperLoads: 50,
      totalLoads: 60,
    });

    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.strengths.length).toBeGreaterThan(0);
  });

  it("identifies weaknesses for low-performing CSR", () => {
    const result = computeCsrFreightPerformanceScore({
      userId: 2,
      loadsSecured: 10,
      totalQuotes: 80,
      avgMargin: 50,
      medianResponseMinutes: 45,
      laneDiversity: 2,
      repeatShipperLoads: 5,
      totalLoads: 20,
    });

    expect(result.score).toBeLessThan(60);
    expect(result.weaknesses.length).toBeGreaterThan(0);
  });
});
