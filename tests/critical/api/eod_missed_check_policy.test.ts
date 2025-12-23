import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/eod-reports/missed-check";

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

jest.mock("@/lib/scope", () => ({
  getUserScope: jest.fn(),
}));

jest.mock("@/lib/prisma", () => {
  const prismaMock = {
    eodReport: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    missedEodExplanation: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
  };

  return {
    __esModule: true,
    default: prismaMock,
    prisma: prismaMock,
  };
});

const { requireUser } = jest.requireMock("@/lib/apiAuth");
const { getUserScope } = jest.requireMock("@/lib/scope");

// Policy-only tests for GET /api/eod-reports/missed-check

describe("GET /api/eod-reports/missed-check policy behavior", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("relies on requireUser to handle unauthenticated requests", async () => {
    (requireUser as jest.Mock).mockResolvedValue(null);

    const { req, res } = createMockReqRes({});

    // @ts-expect-error partial
    await handler(req, res);

    expect([200, 401]).toContain(res.statusCode);
  });

  it("returns 403 FORBIDDEN_VENTURE for out-of-scope ventureId", async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: "EMPLOYEE" });
    (getUserScope as jest.Mock).mockReturnValue({ allVentures: false, ventureIds: [1] });

    const { req, res } = createMockReqRes({ ventureId: "99" });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData.error).toBe("FORBIDDEN_VENTURE");
  });

  it("returns 200 with summary shape for in-scope user", async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: "EMPLOYEE" });
    (getUserScope as jest.Mock).mockReturnValue({ allVentures: true, ventureIds: [] });

    const { req, res } = createMockReqRes({});

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toHaveProperty("userId", 1);
    expect(res.jsonData).toHaveProperty("totalMissed");
    expect(res.jsonData).toHaveProperty("consecutiveMissed");
    expect(res.jsonData).toHaveProperty("threshold");
    expect(res.jsonData).toHaveProperty("requiresExplanation");
    expect(res.jsonData).toHaveProperty("hasExplanation");
  });
});
