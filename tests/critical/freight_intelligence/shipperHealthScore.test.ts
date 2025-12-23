import { computeShipperHealthScore } from "@/lib/freight-intelligence/shipperHealthScore";

describe("computeShipperHealthScore", () => {
  it("returns green high score for strong shipper", () => {
    const result = computeShipperHealthScore({
      shipperId: 1,
      lastLoads: 50,
      avgMargin: 400,
      expectedFrequency: 10,
      actualFrequency: 12,
      responseRate: 0.95,
      csrTouchpoints: 15,
      laneDiversity: 6,
      cancellations: 0,
      latePickups: 1,
    });

    expect(result.riskLevel).toBe("green");
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it("returns red low score for risky shipper", () => {
    const result = computeShipperHealthScore({
      shipperId: 2,
      lastLoads: 5,
      avgMargin: 50,
      expectedFrequency: 10,
      actualFrequency: 3,
      responseRate: 0.3,
      csrTouchpoints: 0,
      laneDiversity: 1,
      cancellations: 5,
      latePickups: 3,
    });

    expect(result.riskLevel).toBe("red");
    expect(result.score).toBeLessThan(40);
  });
});
