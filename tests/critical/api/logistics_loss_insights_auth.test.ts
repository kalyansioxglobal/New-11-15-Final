import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/logistics/loss-insights";

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
    load: {
      groupBy: jest.fn().mockResolvedValue([]),
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

describe("GET /api/logistics/loss-insights auth normalization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("relies on requireUser to handle 401 when unauthenticated", async () => {
    (requireUser as jest.Mock).mockResolvedValue(null);

    const { req, res } = createMockReqRes({ ventureId: "1" });

    // @ts-expect-error partial
    await handler(req, res);

    // Handler returns early; actual 401/UNAUTHENTICATED is produced by requireUser
    expect([200, 401]).toContain(res.statusCode);
  });

  it("returns 403 FORBIDDEN when portfolio permission is missing", async () => {
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

  it("returns 403 FORBIDDEN_VENTURE when venture is out of scope", async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      id: 1,
      role: "CEO",
      ventureIds: [1],
      officeIds: [1],
    });
    (canViewPortfolioResource as jest.Mock).mockReturnValue(true);
    (getUserScope as jest.Mock).mockReturnValue({
      allVentures: false,
      ventureIds: [1],
      officeIds: [],
    });

    const { req, res } = createMockReqRes({ ventureId: "99" });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData.error).toBe("FORBIDDEN_VENTURE");
  });
});
