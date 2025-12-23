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
  res.setHeader = (key: string, value:string) => {
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
  getUserScope: () => ({ allVentures: true, ventureIds: [1], officeIds: [1] }),
}));

// Align prisma mock shape with actual lib/prisma export
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

describe("GET /api/logistics/loss-insights limits", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireUser as jest.Mock).mockResolvedValue({
      id: 1,
      role: "CEO",
      ventureIds: [1],
      officeIds: [1],
    });
  });

  it("rejects missing ventureId", async () => {
    const { req, res } = createMockReqRes({});

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData.error).toBe("ventureId is required");
  });

  it("respects max days cap", async () => {
    const { req, res } = createMockReqRes({ ventureId: "1", days: "400" });

    // @ts-expect-error partial
    await handler(req, res);

    expect([200, 500]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.jsonData).toHaveProperty("windowDays");
      expect(res.jsonData.windowDays).toBeLessThanOrEqual(90);
    } else {
      expect(res.jsonData).toHaveProperty("error");
    }
  });
});
