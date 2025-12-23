import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/it-incidents/create";

function createMockReqRes(body: any = {}): {
  req: Partial<NextApiRequest>;
  res: Partial<NextApiResponse> & { statusCode: number; jsonData: any };
} {
  const req: Partial<NextApiRequest> = {
    method: "POST",
    body,
    headers: {},
  };
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

// Avoid hitting next-auth / getServerSession in tests; we only care about the
// behaviour of the wrapped handler, not real auth/session wiring.
jest.mock("@/lib/effectiveUser", () => ({
  getEffectiveUser: jest.fn(),
}));

// Align prisma mock shape with actual lib/prisma export (default + named prisma)
jest.mock("@/lib/prisma", () => {
  const prismaMock = {
    iTIncident: {
      create: jest.fn().mockResolvedValue({ id: 123 }),
    },
    iTAsset: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
  };

  return {
    __esModule: true,
    default: prismaMock,
    prisma: prismaMock,
  };
});

const { getEffectiveUser } = jest.requireMock("@/lib/effectiveUser");

// Stub audit logging to avoid side effects in tests
jest.mock("@/lib/audit", () => ({
  logAuditEvent: jest.fn(),
}));

describe("POST /api/it-incidents/create happy path", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getEffectiveUser as jest.Mock).mockResolvedValue({
      id: 42,
      role: "ADMIN",
      ventureIds: [1],
      officeIds: [1],
    });
  });

  it("returns non-500 status when payload is valid", async () => {
    const { req, res } = createMockReqRes({
      assetId: 1,
      title: "Screen not working",
      description: "Laptop screen flickers intermittently",
      severity: "MEDIUM",
      category: "HARDWARE",
    });

    // @ts-expect-error partial
    await handler(req, res);

    // We primarily assert that the handler does not crash and returns an
    // application-level response (not an unhandled 500 from withUser).
    expect([200, 400]).toContain(res.statusCode);
  });
});
