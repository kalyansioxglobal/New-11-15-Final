import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/bpo/agent-kpi";

function createMockReqRes(query: any = {}): {
  req: Partial<NextApiRequest>;
  res: Partial<NextApiResponse> & { statusCode: number; jsonData: any };
} {
  const req: Partial<NextApiRequest> = { method: "GET", query };
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

jest.mock("@/lib/apiAuth", () => ({
  requireAdminPanelUser: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    bpoAgentMetric: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

const { requireAdminPanelUser } = jest.requireMock("@/lib/apiAuth");

describe("GET /api/bpo/agent-kpi limits", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (requireAdminPanelUser as jest.Mock).mockResolvedValue({ id: 1, role: "ADMIN" });
  });

  it("rejects missing dates", async () => {
    const { req, res } = createMockReqRes({});

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData.error).toBe("startDate and endDate are required");
  });

  it("rejects invalid dates", async () => {
    const { req, res } = createMockReqRes({ startDate: "bad", endDate: "also-bad" });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData.error).toBe("Invalid date range");
  });

  it("rejects range over max days", async () => {
    const { req, res } = createMockReqRes({ startDate: "2020-01-01", endDate: "2021-12-31" });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData.error).toBe("Date range too large");
  });
});
