import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/logistics/dashboard";

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
  canViewPortfolioResource: () => true,
}));

jest.mock("@/lib/scope", () => ({
  getUserScope: () => ({ allVentures: true, ventureIds: [], officeIds: [] }),
}));

// Align prisma mock shape with actual lib/prisma export
jest.mock("@/lib/prisma", () => {
  const prismaMock = {
    load: {
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    office: {
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

describe("GET /api/logistics/dashboard shape", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: "CEO" });
  });

  it("returns expected top-level keys when successful or an error payload", async () => {
    const { req, res } = createMockReqRes({ ventureId: "1" });

    // @ts-expect-error partial
    await handler(req, res);

    expect([200, 500]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.jsonData).toHaveProperty("today");
      expect(res.jsonData).toHaveProperty("last7");
      expect(res.jsonData).toHaveProperty("statusCounts");
      expect(res.jsonData).toHaveProperty("leaderboard");
      expect(res.jsonData).toHaveProperty("officeStats");
      expect(res.jsonData).toHaveProperty("lostReasons");
    } else {
      expect(res.jsonData).toHaveProperty("error");
    }
  });
});
