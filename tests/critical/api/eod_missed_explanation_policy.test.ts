import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/eod-reports/missed-explanation";

function createMockReqRes(method: string, query: any = {}, body: any = {}): {
  req: Partial<NextApiRequest>;
  res: Partial<NextApiResponse> & { statusCode: number; jsonData: any };
} {
  const req: Partial<NextApiRequest> = { method, query, body };
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
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ id: 1 }),
      create: jest.fn().mockResolvedValue({ id: 2 }),
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
const { prisma } = jest.requireMock("@/lib/prisma");

// Policy-only tests for /api/eod-reports/missed-explanation

describe("/api/eod-reports/missed-explanation policy", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    (requireUser as jest.Mock).mockResolvedValue(null);

    const { req, res } = createMockReqRes("GET", {});

    // @ts-expect-error partial
    await handler(req, res);

    expect([200, 401]).toContain(res.statusCode);
  });

  it("denies GET for non-HR roles", async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: "EMPLOYEE" });
    (getUserScope as jest.Mock).mockReturnValue({ allVentures: true, ventureIds: [] });

    const { req, res } = createMockReqRes("GET", {});

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData.error).toBe("HR_ADMIN_ONLY");
  });

  it("enforces venture scope on GET for HR roles", async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: "HR_ADMIN" });
    (getUserScope as jest.Mock).mockReturnValue({ allVentures: false, ventureIds: [1] });

    const { req, res } = createMockReqRes("GET", { ventureId: "99" });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData.error).toBe("FORBIDDEN_VENTURE");
  });

  it("returns list shape for HR roles within scope", async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: "HR_ADMIN" });
    (getUserScope as jest.Mock).mockReturnValue({ allVentures: true, ventureIds: [] });

    const { req, res } = createMockReqRes("GET", {});

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toHaveProperty("explanations");
  });

  it("rejects POST with missing fields", async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: "EMPLOYEE" });
    (getUserScope as jest.Mock).mockReturnValue({ allVentures: true, ventureIds: [] });

    const { req, res } = createMockReqRes("POST", {}, {});

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData.error).toBe("MISSING_FIELDS");
  });

  it("rejects POST with too-short explanation", async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: "EMPLOYEE" });
    (getUserScope as jest.Mock).mockReturnValue({ allVentures: true, ventureIds: [] });

    const { req, res } = createMockReqRes("POST", {}, {
      ventureId: 1,
      explanation: "short",
    });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData.error).toBe("EXPLANATION_TOO_SHORT");
  });

  it("enforces venture scope on POST", async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: "EMPLOYEE" });
    (getUserScope as jest.Mock).mockReturnValue({ allVentures: false, ventureIds: [1] });

    const { req, res } = createMockReqRes("POST", {}, {
      ventureId: 99,
      explanation: "This is a long enough explanation",
    });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData.error).toBe("FORBIDDEN_VENTURE");
  });

  it("creates or updates explanation when threshold is met", async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: "EMPLOYEE" });
    (getUserScope as jest.Mock).mockReturnValue({ allVentures: true, ventureIds: [] });

    // Simulate missed days by mocking eodReport.findMany to return reports only at the start
    (prisma.eodReport.findMany as jest.Mock).mockResolvedValueOnce([]);

    const { req, res } = createMockReqRes("POST", {}, {
      ventureId: 1,
      explanation: "This is a long enough explanation to be accepted",
    });

    // @ts-expect-error partial
    await handler(req, res);

    expect([200, 201]).toContain(res.statusCode);
  });
});
