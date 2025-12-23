import type { NextApiRequest, NextApiResponse } from "next";

// We mock withUser so the exported handler is the raw function without auth wrapper
jest.mock("@/lib/api", () => {
  const actual = jest.requireActual("@/lib/api");
  return {
    ...actual,
    withUser: (fn: any) => fn,
  };
});

jest.mock("@/lib/ai/summarize", () => ({
  summarizeParentDashboard: jest.fn(),
}));

import handler from "@/pages/api/dashboard/parent";
import { summarizeParentDashboard } from "@/lib/ai/summarize";

function createMockReqRes(): {
  req: Partial<NextApiRequest>;
  res: Partial<NextApiResponse> & { statusCode: number; jsonData: any };
} {
  const req: Partial<NextApiRequest> = {
    method: "GET",
    query: {},
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

// NOTE: Guardrail check (manual):
// This API does not import or call any prisma create/update/delete inside
// AI-related logic. It only reads data then calls summarizeParentDashboard.

describe("GET /api/dashboard/parent - AI summary", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns payload with aiSummary as string or null (happy path)", async () => {
    (summarizeParentDashboard as jest.Mock).mockResolvedValue("AI summary text");

    const { req, res } = createMockReqRes();

    // @ts-expect-error partial req/res for test
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toBeDefined();
    // We don't assert exact shape of metrics here, only that aiSummary is present
    expect(res.jsonData).toHaveProperty("aiSummary");
    expect(
      typeof res.jsonData.aiSummary === "string" || res.jsonData.aiSummary === null,
    ).toBe(true);
  });

  it("swallows AI errors and returns aiSummary: null", async () => {
    (summarizeParentDashboard as jest.Mock).mockRejectedValue(new Error("AI failed"));

    const { req, res } = createMockReqRes();

    // @ts-expect-error partial req/res for test
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toBeDefined();
    expect(res.jsonData).toHaveProperty("aiSummary", null);
  });
});
