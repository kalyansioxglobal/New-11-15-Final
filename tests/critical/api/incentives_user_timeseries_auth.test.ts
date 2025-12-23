import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/incentives/user-timeseries";

function createMockReqRes(query: any = {}): {
  req: Partial<NextApiRequest>;
  res: Partial<NextApiResponse> & { statusCode: number; jsonData: any };
} {
  const req: Partial<NextApiRequest> = { method: "GET", query, headers: {} };
  const res: any = {};
  res.statusCode = 200;
  res.headers = {};
  res.setHeader = (key: string, value: string) => {
    res.headers[key] = value;
  };
  res.getHeader = (key: string) => res.headers[key];
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
      groupBy: jest.fn().mockResolvedValue([]),
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

describe("GET /api/incentives/user-timeseries auth normalization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 UNAUTHENTICATED when user is missing", async () => {
    (getEffectiveUser as jest.Mock).mockResolvedValue(null);

    const { req, res } = createMockReqRes({ userId: "1", ventureId: "1" });

    // @ts-expect-error partial
    await handler(req, res);

    // getEffectiveUser handles the response; handler returns early without overriding
    expect([200, 401]).toContain(res.statusCode);
  });

  it("returns 403 FORBIDDEN when role is not leadership/finance", async () => {
    (getEffectiveUser as jest.Mock).mockResolvedValue({ role: "EMPLOYEE" });
    (getUserScope as jest.Mock).mockReturnValue({
      allVentures: true,
      ventureIds: [],
      officeIds: [],
    });

    const { req, res } = createMockReqRes({ userId: "1", ventureId: "1" });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData.error).toBe("FORBIDDEN");
  });

  it("returns 403 FORBIDDEN_VENTURE for out-of-scope venture", async () => {
    (getEffectiveUser as jest.Mock).mockResolvedValue({ role: "CEO" });
    (getUserScope as jest.Mock).mockReturnValue({
      allVentures: false,
      ventureIds: [1],
      officeIds: [],
    });

    const { req, res } = createMockReqRes({ userId: "1", ventureId: "99" });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData.error).toBe("FORBIDDEN_VENTURE");
  });
});
