import type { NextApiRequest, NextApiResponse } from "next";

jest.mock("@/lib/api", () => {
  const actual = jest.requireActual("@/lib/api");
  return {
    ...actual,
    withUser: (fn: any) => fn,
  };
});

jest.mock("@/lib/ai/summarize", () => ({
  summarizeIncentiveSimulation: jest.fn(),
}));

import handler from "@/pages/api/incentives/simulate/summary";
import { summarizeIncentiveSimulation } from "@/lib/ai/summarize";

function createMockReqRes(body: any): {
  req: Partial<NextApiRequest>;
  res: Partial<NextApiResponse> & { statusCode: number; jsonData: any };
} {
  const req: Partial<NextApiRequest> = {
    method: "POST",
    body,
  };
  const res: any = {};
  res.statusCode = 200;
  res.headers = {};
  res.setHeader = (key: string, value: string) => {
    res.headers[key] = value;
  };
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.jsonData = null;
  res.json = (data: any) => {
    res.jsonData = data;
    return res;
  };
  return { req, res };
}

// Manual guardrail note:
// This endpoint does not import prisma at all; it only validates input
// and calls summarizeIncentiveSimulation, which is read-only.

describe("POST /api/incentives/simulate/summary - validation", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns 400 when mode is missing", async () => {
    const { req, res } = createMockReqRes({});
    // @ts-expect-error partial req/res for test
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.jsonData.error).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when mode is invalid", async () => {
    const { req, res } = createMockReqRes({ mode: "foo" });
    // @ts-expect-error partial req/res for test
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.jsonData.error).toBe("VALIDATION_ERROR");
  });

  it("validates baseline for current_plan", async () => {
    const { req, res } = createMockReqRes({ mode: "current_plan" });
    // @ts-expect-error partial req/res for test
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.jsonData.error).toBe("VALIDATION_ERROR");
  });

  it("validates simulated for custom_rules", async () => {
    const { req, res } = createMockReqRes({ mode: "custom_rules" });
    // @ts-expect-error partial req/res for test
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.jsonData.error).toBe("VALIDATION_ERROR");
  });

  it("validates baseline+simulated for compare", async () => {
    const { req, res } = createMockReqRes({ mode: "compare", baseline: {} });
    // @ts-expect-error partial req/res for test
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.jsonData.error).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/incentives/simulate/summary - happy path and AI failure", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns 200 and summary from AI on happy path", async () => {
    (summarizeIncentiveSimulation as jest.Mock).mockResolvedValue("Insight text");

    const { req, res } = createMockReqRes({
      mode: "current_plan",
      baseline: { summary: {}, perRole: [] },
    });

    // @ts-expect-error partial req/res for test
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toEqual({ summary: "Insight text" });
    expect(summarizeIncentiveSimulation).toHaveBeenCalled();
  });

  it("returns 500 when AI throws (no side effects)", async () => {
    (summarizeIncentiveSimulation as jest.Mock).mockRejectedValue(
      new Error("AI failure"),
    );

    const { req, res } = createMockReqRes({
      mode: "current_plan",
      baseline: { summary: {}, perRole: [] },
    });

    // @ts-expect-error partial req/res for test
    await handler(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.jsonData.error).toBe("Internal server error");
  });
});
