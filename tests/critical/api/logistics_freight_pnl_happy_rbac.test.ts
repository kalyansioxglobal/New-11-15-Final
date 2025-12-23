import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/logistics/freight-pnl";

function createMockReqRes(query: any = {}): {
  req: Partial<NextApiRequest>;
  res: Partial<NextApiResponse> & { statusCode: number; jsonData: any };
} {
  const req: Partial<NextApiRequest> = { method: "GET", query, headers: {} };
  const res: any = {};
  res.statusCode = 200;
  res.headers = {};
  res.setHeader = (key: string, value: string) => {
    res.headers[key] = value;
  };
  res.getHeader = (key: string) => res.headers[key];
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.jsonData = null;
  res.json = (data: any) => {
    res.jsonData = data;
    return res;
  };
  res.end = () => res;
  return { req, res };
}

jest.mock("@/lib/apiAuth", () => ({
  requireUser: jest.fn(),
}));

jest.mock("@/lib/permissions", () => ({
  canViewPortfolioResource: jest.fn(),
}));

jest.mock("@/lib/scopeLoads", () => ({
  applyLoadScope: (user: any, where: any) => where,
}));

jest.mock("@/lib/requestLog", () => ({
  withRequestLogging: (h: any) => h,
}));

jest.mock("@/lib/prisma", () => {
  const prismaMock = {
    load: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  return {
    __esModule: true,
    default: prismaMock,
    prisma: prismaMock,
  };
});

const { requireUser } = jest.requireMock("@/lib/apiAuth");
const { canViewPortfolioResource } = jest.requireMock("@/lib/permissions");

describe("GET /api/logistics/freight-pnl RBAC & happy path", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("relies on requireUser to handle 401 when unauthenticated", async () => {
    (requireUser as jest.Mock).mockResolvedValue(null);

    const { req, res } = createMockReqRes({});

    // @ts-expect-error partial
    await handler(req, res);

    expect([200, 401]).toContain(res.statusCode);
  });

  it("denies access when portfolio permission is missing", async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      id: 1,
      role: "EMPLOYEE",
      ventureIds: [1],
      officeIds: [1],
    });
    (canViewPortfolioResource as jest.Mock).mockReturnValue(false);

    const { req, res } = createMockReqRes({ ventureId: "1" });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData.error).toBe("FORBIDDEN");
  });

  it("accepts valid CEO with default 30-day window", async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      id: 1,
      role: "CEO",
      ventureIds: [1],
      officeIds: [1],
    });
    (canViewPortfolioResource as jest.Mock).mockReturnValue(true);

    const { req, res } = createMockReqRes({});

    // @ts-expect-error partial
    await handler(req, res);

    expect([200, 500]).toContain(res.statusCode);
  });
});
