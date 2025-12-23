import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/tasks/overdue-check";

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
    task: {
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
const { getUserScope } = jest.requireMock("@/lib/scope");

// Policy-only tests to ensure existing overdue-check behavior remains stable

describe("GET /api/tasks/overdue-check policy behavior", () => {
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

  it("denies checking another user when viewer is not global", async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: "EMPLOYEE" });
    (getUserScope as jest.Mock).mockReturnValue({ allVentures: false, ventureIds: [1], officeIds: [] });

    const { req, res } = createMockReqRes({ userId: "2" });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData.error).toBe("FORBIDDEN");
  });

  it("allows self-check and returns summary shape", async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: "EMPLOYEE" });
    (getUserScope as jest.Mock).mockReturnValue({ allVentures: false, ventureIds: [1], officeIds: [] });

    const { req, res } = createMockReqRes({});

    // @ts-expect-error partial
    await handler(req, res);

    // We only assert that the endpoint responds successfully and returns the
    // documented top-level fields; we do not assert specific thresholds.
    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toHaveProperty("userId", 1);
    expect(res.jsonData).toHaveProperty("totalOverdue");
    expect(res.jsonData).toHaveProperty("requiresExplanation");
    expect(res.jsonData).toHaveProperty("explained");
    expect(res.jsonData).toHaveProperty("tasks");
    expect(res.jsonData).toHaveProperty("thresholds");
  });
});
