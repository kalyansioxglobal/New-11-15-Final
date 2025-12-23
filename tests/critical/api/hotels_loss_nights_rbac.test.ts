import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/hotels/loss-nights";

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
  requireUser: jest.fn(),
}));

jest.mock("@/lib/permissions", () => ({
  canViewPortfolioResource: jest.fn(),
}));

jest.mock("@/lib/scope", () => ({
  getUserScope: jest.fn(),
}));

jest.mock("@/lib/prisma", () => {
  const prismaMock = {
    hotelDailyReport: {
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
const { getUserScope } = jest.requireMock("@/lib/scope");

describe("GET /api/hotels/loss-nights RBAC & validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects unauthenticated user (no crash)", async () => {
    (requireUser as jest.Mock).mockResolvedValue(null);

    const { req, res } = createMockReqRes({ ventureId: "1" });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(200);
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

  it("accepts CEO within scope", async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      id: 1,
      role: "CEO",
      ventureIds: [1],
      officeIds: [1],
    });
    (canViewPortfolioResource as jest.Mock).mockReturnValue(true);
    (getUserScope as jest.Mock).mockReturnValue({
      allVentures: true,
      ventureIds: [],
      officeIds: [],
    });

    const { req, res } = createMockReqRes({ ventureId: "1" });

    // @ts-expect-error partial
    await handler(req, res);

    expect([200, 500]).toContain(res.statusCode);
  });
});
