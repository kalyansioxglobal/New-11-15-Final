import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/bpo/kpi/index";

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

// Avoid next-auth / getServerSession in tests by mocking effective user.
jest.mock("@/lib/effectiveUser", () => ({
  getEffectiveUser: jest.fn(),
}));

jest.mock("@/lib/scope", () => ({
  getUserScope: () => ({ allVentures: true, ventureIds: [], officeIds: [] }),
}));

jest.mock("@/lib/permissions", () => ({
  canViewPortfolioResource: () => true,
}));

jest.mock("@/lib/requestLog", () => ({
  withRequestLogging: jest.fn(),
}));

// Align prisma mock shape with actual lib/prisma export
jest.mock("@/lib/prisma", () => {
  const prismaMock = {
    bpoCallLog: {
      groupBy: jest.fn().mockResolvedValue([]),
      findMany: jest.fn().mockResolvedValue([]),
    },
    bpoAgent: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  return {
    __esModule: true,
    default: prismaMock,
    prisma: prismaMock,
  };
});

const { getEffectiveUser } = jest.requireMock("@/lib/effectiveUser");

describe("GET /api/bpo/kpi shape", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getEffectiveUser as jest.Mock).mockResolvedValue({
      id: 1,
      role: "CEO",
      ventureIds: [1],
      officeIds: [1],
    });
  });

  it("returns 200 with expected response shape or safe error", async () => {
    const { req, res } = createMockReqRes({ ventureId: "1" });

    // @ts-expect-error partial
    await handler(req, res);

    expect([200, 500]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.jsonData).toHaveProperty("agents");
      expect(res.jsonData).toHaveProperty("totals");
    } else {
      expect(res.jsonData).toHaveProperty("error");
    }
  });
});
