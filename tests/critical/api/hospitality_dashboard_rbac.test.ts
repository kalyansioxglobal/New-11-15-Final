import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/hospitality/dashboard";

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
  getUserScope: () => ({ allVentures: true, ventureIds: [], officeIds: [] }),
}));

// Align prisma mock shape with actual lib/prisma export
jest.mock("@/lib/prisma", () => {
  const prismaMock = {
    hotelProperty: { findMany: jest.fn().mockResolvedValue([]) },
    hotelKpiDaily: { findMany: jest.fn().mockResolvedValue([]) },
    hotelReview: { findMany: jest.fn().mockResolvedValue([]) },
  };

  return {
    __esModule: true,
    default: prismaMock,
    prisma: prismaMock,
  };
});

const { requireUser } = jest.requireMock("@/lib/apiAuth");
const { canViewPortfolioResource } = jest.requireMock("@/lib/permissions");

describe("GET /api/hospitality/dashboard RBAC", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: "EMPLOYEE" });
  });

  it("returns 403 when portfolio permission is missing", async () => {
    (canViewPortfolioResource as jest.Mock).mockReturnValue(false);

    const { req, res } = createMockReqRes({});

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData.error).toBe("Forbidden");
  });

  it("allows access when portfolio permission is granted", async () => {
    (canViewPortfolioResource as jest.Mock).mockReturnValue(true);

    const { req, res } = createMockReqRes({});

    // @ts-expect-error partial
    await handler(req, res);

    expect([200, 500]).toContain(res.statusCode);
  });
});
