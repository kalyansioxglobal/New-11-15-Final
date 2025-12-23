import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/incentives/plan";

function createMockReqRes(method: string, query: any = {}): {
  req: Partial<NextApiRequest>;
  res: Partial<NextApiResponse> & { statusCode: number; jsonData: any };
} {
  const req: Partial<NextApiRequest> = { method, query };
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

jest.mock("@/lib/effectiveUser", () => ({
  getEffectiveUser: jest.fn(),
}));

const { getEffectiveUser } = jest.requireMock("@/lib/effectiveUser");

jest.mock("@/lib/prisma", () => ({
  prisma: {
    incentivePlan: {
      findFirst: jest.fn(),
    },
  },
}));

describe("GET /api/incentives/plan RBAC", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 403 for non-leadership roles", async () => {
    (getEffectiveUser as jest.Mock).mockResolvedValue({ role: "EMPLOYEE" });

    const { req, res } = createMockReqRes("GET", { ventureId: "1" });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData.error).toBe("Forbidden");
  });

  it("allows CEO access", async () => {
    (getEffectiveUser as jest.Mock).mockResolvedValue({ role: "CEO" });

    const { req, res } = createMockReqRes("GET", { ventureId: "1" });

    // @ts-expect-error partial
    await handler(req, res);

    expect([200, 500]).toContain(res.statusCode);
  });
});
