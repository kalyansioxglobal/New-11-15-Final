import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/eod-reports/team";

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

jest.mock("@/lib/permissions", () => ({
  ROLE_CONFIG: {
    EMPLOYEE: { task: { assign: false } },
    MANAGER: { task: { assign: true } },
  },
}));

jest.mock("@/lib/prisma", () => {
  const prismaMock = {
    user: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    eodReport: {
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

// Policy-only tests to lock in existing EOD team visibility rules

describe("GET /api/eod-reports/team visibility policy", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("denies non-manager roles", async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: "EMPLOYEE" });
    (getUserScope as jest.Mock).mockReturnValue({ allVentures: true, ventureIds: [], officeIds: [] });

    const { req, res } = createMockReqRes({});

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData.error).toBe("FORBIDDEN");
  });

  it("allows manager roles and returns summary", async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: "MANAGER" });
    (getUserScope as jest.Mock).mockReturnValue({ allVentures: true, ventureIds: [], officeIds: [] });

    const { req, res } = createMockReqRes({});

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toHaveProperty("date");
    expect(res.jsonData).toHaveProperty("summary");
    expect(res.jsonData).toHaveProperty("team");
  });

  it("rejects out-of-scope venture for manager", async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: "MANAGER" });
    (getUserScope as jest.Mock).mockReturnValue({ allVentures: false, ventureIds: [1], officeIds: [] });

    const { req, res } = createMockReqRes({ ventureId: "99" });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData.error).toBe("FORBIDDEN_VENTURE");
  });

  it("returns empty summary when scoped manager has no ventures", async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: "MANAGER" });
    (getUserScope as jest.Mock).mockReturnValue({ allVentures: false, ventureIds: [], officeIds: [] });

    const { req, res } = createMockReqRes({});

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData.summary).toEqual({
      total: 0,
      submitted: 0,
      pending: 0,
      needsAttention: 0,
      withBlockers: 0,
    });
    expect(res.jsonData.team).toEqual([]);
  });

});
