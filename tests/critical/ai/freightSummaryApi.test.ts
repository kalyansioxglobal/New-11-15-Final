import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/ai/freight-summary";

jest.mock("@/lib/prisma", () => {
  const prismaMock = {
    load: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    logisticsShipper: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    carrier: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  return { prisma: prismaMock };
});

jest.mock("@/lib/apiAuth", () => ({
  requireUser: jest.fn(),
}));

jest.mock("@/lib/scope", () => ({
  getUserScope: jest.fn().mockReturnValue({
    allVentures: true,
    ventureIds: [],
    allOffices: true,
    officeIds: [],
  }),
}));

jest.mock("@/lib/permissions", () => ({
  canViewPortfolioResource: jest.fn().mockReturnValue(true),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/lib/config/ai", () => ({
  aiConfig: {
    enabled: true,
    freightAssistantEnabled: true,
    freightAssistantModel: "test-model",
    maxTokensPerRequest: 2000,
    maxDailyCalls: 100,
  },
}));

jest.mock("@/lib/ai/freightSummaryAssistant", () => ({
  generateFreightSummary: jest.fn().mockResolvedValue("summary text"),
}));

function createMockReqRes(
  query: any = {},
): {
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

const { requireUser } = jest.requireMock("@/lib/apiAuth");

describe("GET /api/ai/freight-summary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects non-GET methods", async () => {
    const { req, res } = createMockReqRes({ ventureId: "1" });
    req.method = "POST";

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(405);
  });

  it("requires authentication", async () => {
    (requireUser as jest.Mock).mockResolvedValue(null);
    const { req, res } = createMockReqRes({ ventureId: "1" });

    // @ts-expect-error partial
    await handler(req, res);

    // requireUser handles response; handler should not crash
    expect(res.statusCode).toBe(200);
  });

  it("returns 400 when ventureId is missing", async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      id: 1,
      role: "CEO",
      ventureIds: [],
      officeIds: [],
      isTestUser: false,
      email: "x@example.com",
      fullName: "CEO",
    });

    const { req, res } = createMockReqRes({});

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData.error).toBe("ventureId is required");
  });

  it("returns summary payload when enabled and authorized", async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      id: 1,
      role: "CEO",
      ventureIds: [1],
      officeIds: [],
      isTestUser: false,
      email: "x@example.com",
      fullName: "CEO",
    });

    const { req, res } = createMockReqRes({ ventureId: "1" });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toHaveProperty("summary", "summary text");
    expect(res.jsonData).toHaveProperty("metrics");
    expect(res.jsonData).toHaveProperty("intelligence");
  });
});
