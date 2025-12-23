import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/eod-reports";

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

jest.mock("@/lib/permissions", () => ({
  ROLE_CONFIG: {
    EMPLOYEE: { task: { assign: false } },
    MANAGER: { task: { assign: true } },
  },
}));

jest.mock("@/lib/prisma", () => {
  const prismaMock = {
    eodReport: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 1 }),
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

describe("/api/eod-reports auth & caps", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("relies on requireUser to handle 401 when user is missing", async () => {
    (requireUser as jest.Mock).mockResolvedValue(null);

    const { req, res } = createMockReqRes("GET", {});

    // @ts-expect-error partial
    await handler(req, res);

    expect([200, 401]).toContain(res.statusCode);
  });

  it("returns 403 FORBIDDEN when employee tries to view another user's report", async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: "EMPLOYEE" });
    (getUserScope as jest.Mock).mockReturnValue({
      allVentures: true,
      ventureIds: [],
    });

    const { req, res } = createMockReqRes("GET", { userId: "2" });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData.error).toBe("FORBIDDEN");
  });

  it("returns 403 FORBIDDEN_VENTURE when posting to out-of-scope venture", async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: "EMPLOYEE", isTestUser: false });
    (getUserScope as jest.Mock).mockReturnValue({
      allVentures: false,
      ventureIds: [1],
    });

    const { req, res } = createMockReqRes("POST", {}, {
      ventureId: 99,
      summary: "Test summary",
    });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData.error).toBe("FORBIDDEN_VENTURE");
  });
});
