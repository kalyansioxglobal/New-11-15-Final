import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/incentives/plan";

function createMockReqRes(method: string, query: any = {}, body: any = {}): {
  req: Partial<NextApiRequest>;
  res: Partial<NextApiResponse> & { statusCode: number; jsonData: any };
} {
  const req: Partial<NextApiRequest> = { method, query, body, headers: {} };
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

jest.mock("@/lib/prisma", () => {
  const prismaMock = {
    incentivePlan: {
      findFirst: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({ id: 1 }),
      findUnique: jest.fn().mockResolvedValue({ id: 1, rules: [] }),
    },
    incentiveRule: {
      upsert: jest.fn().mockResolvedValue({ id: 1 }),
    },
  };

  return {
    __esModule: true,
    default: prismaMock,
    prisma: prismaMock,
  };
});

const { getEffectiveUser } = jest.requireMock("@/lib/effectiveUser");

describe("/api/incentives/plan happy and error paths", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    (getEffectiveUser as jest.Mock).mockResolvedValue(null);

    const { req, res } = createMockReqRes("GET", { ventureId: "1" });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.jsonData.error).toBe("Unauthorized");
  });

  it("returns 403 for non-leadership roles", async () => {
    (getEffectiveUser as jest.Mock).mockResolvedValue({ role: "EMPLOYEE" });

    const { req, res } = createMockReqRes("GET", { ventureId: "1" });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData.error).toBe("Forbidden");
  });

  it("validates ventureId", async () => {
    (getEffectiveUser as jest.Mock).mockResolvedValue({ role: "CEO" });

    const { req, res } = createMockReqRes("GET", { ventureId: "bad" });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData.error).toBe("Missing or invalid ventureId");
  });

  it("allows CEO to fetch plan (happy path, null when missing)", async () => {
    (getEffectiveUser as jest.Mock).mockResolvedValue({ role: "CEO" });

    const { req, res } = createMockReqRes("GET", { ventureId: "1" });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(200);
  });
});
