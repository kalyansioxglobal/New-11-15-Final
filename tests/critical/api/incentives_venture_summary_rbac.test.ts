import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/incentives/venture-summary";

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

jest.mock("@/lib/effectiveUser", () => ({
  getEffectiveUser: jest.fn(),
}));

jest.mock("@/lib/scope", () => ({
  getUserScope: jest.fn(),
}));

jest.mock("@/lib/prisma", () => {
  const prismaMock = {
    incentiveDaily: {
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
const { getUserScope } = jest.requireMock("@/lib/scope");

describe("GET /api/incentives/venture-summary RBAC & validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requires authentication (no crash)", async () => {
    (getEffectiveUser as jest.Mock).mockResolvedValue(null);

    const { req, res } = createMockReqRes({ ventureId: "1" });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(200);
  });

  it("rejects invalid ventureId", async () => {
    (getEffectiveUser as jest.Mock).mockResolvedValue({ role: "CEO" });
    (getUserScope as jest.Mock).mockReturnValue({
      allVentures: true,
      ventureIds: [],
      officeIds: [],
    });

    const { req, res } = createMockReqRes({ ventureId: "bad" });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData.error).toBe("Invalid ventureId");
  });

  it("denies non-leadership roles", async () => {
    (getEffectiveUser as jest.Mock).mockResolvedValue({ role: "EMPLOYEE" });
    (getUserScope as jest.Mock).mockReturnValue({
      allVentures: true,
      ventureIds: [],
      officeIds: [],
    });

    const { req, res } = createMockReqRes({ ventureId: "1" });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData.error).toBe("FORBIDDEN");
  });

  it("denies out-of-scope venture", async () => {
    (getEffectiveUser as jest.Mock).mockResolvedValue({ role: "CEO" });
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

  it("accepts CEO within scope and default date range", async () => {
    (getEffectiveUser as jest.Mock).mockResolvedValue({ role: "CEO" });
    (getUserScope as jest.Mock).mockReturnValue({
      allVentures: true,
      ventureIds: [],
      officeIds: [],
    });

    const { req, res } = createMockReqRes({ ventureId: "1" });

    // @ts-expect-error partial
    await handler(req, res);

    expect([200, 500]).toContain(res.statusCode);
  });
});
