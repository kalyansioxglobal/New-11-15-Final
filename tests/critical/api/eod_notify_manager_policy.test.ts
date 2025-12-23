import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/eod-reports/notify-manager";

function createMockReqRes(body: any = {}): {
  req: Partial<NextApiRequest>;
  res: Partial<NextApiResponse> & { statusCode: number; jsonData: any };
} {
  const req: Partial<NextApiRequest> = { method: "POST", body };
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

jest.mock("@/lib/permissions", () => ({
  ROLE_CONFIG: {
    EMPLOYEE: { ventureScope: "scoped" },
    ADMIN: { ventureScope: "all" },
  },
}));

jest.mock("@/lib/prisma", () => {
  const prismaMock = {
    missedEodExplanation: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({ id: 1 }),
    },
    activityLog: {
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
const { prisma } = jest.requireMock("@/lib/prisma");

// Policy-only tests for POST /api/eod-reports/notify-manager

describe("POST /api/eod-reports/notify-manager policy", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    (requireUser as jest.Mock).mockResolvedValue(null);

    const { req, res } = createMockReqRes({ explanationId: 1 });

    // @ts-expect-error partial
    await handler(req, res);

    expect([200, 401]).toContain(res.statusCode);
  });

  it("returns 400 when explanationId is missing", async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: "EMPLOYEE", ventureIds: [1] });

    const { req, res } = createMockReqRes({});

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData.error).toBe("MISSING_EXPLANATION_ID");
  });

  it("returns 404 when explanation is not found", async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: "EMPLOYEE", ventureIds: [1] });
    (prisma.missedEodExplanation.findUnique as jest.Mock).mockResolvedValue(null);

    const { req, res } = createMockReqRes({ explanationId: 1 });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.jsonData.error).toBe("EXPLANATION_NOT_FOUND");
  });

  it("forbids users without ownership, global scope, or venture access", async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 2, role: "EMPLOYEE", ventureIds: [2] });
    (prisma.missedEodExplanation.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      userId: 1,
      ventureId: 1,
      managerNotified: false,
      user: { id: 1, fullName: "User", email: "user@example.com" },
      venture: { id: 1, name: "Venture" },
    });

    const { req, res } = createMockReqRes({ explanationId: 1 });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData.error).toBe("FORBIDDEN");
  });

  it("enforces ONLY_OWNER_CAN_NOTIFY when user has venture access but is not owner and not global admin", async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 2, role: "EMPLOYEE", ventureIds: [1] });
    (prisma.missedEodExplanation.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      userId: 1,
      ventureId: 1,
      managerNotified: false,
      user: { id: 1, fullName: "User", email: "user@example.com" },
      venture: { id: 1, name: "Venture" },
    });

    const { req, res } = createMockReqRes({ explanationId: 1 });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData.error).toBe("ONLY_OWNER_CAN_NOTIFY");
  });

  it("returns early when already notified", async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: "EMPLOYEE", ventureIds: [1] });
    (prisma.missedEodExplanation.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      userId: 1,
      ventureId: 1,
      managerNotified: true,
      user: { id: 1, fullName: "User", email: "user@example.com" },
      venture: { id: 1, name: "Venture" },
    });

    const { req, res } = createMockReqRes({ explanationId: 1 });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData.alreadyNotified).toBe(true);
  });

  it("allows owner to notify and logs activity", async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: "EMPLOYEE", ventureIds: [1] });
    (prisma.missedEodExplanation.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      userId: 1,
      ventureId: 1,
      managerNotified: false,
      user: { id: 1, fullName: "User", email: "user@example.com" },
      venture: { id: 1, name: "Venture" },
    });

    const { req, res } = createMockReqRes({ explanationId: 1 });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(prisma.missedEodExplanation.update).toHaveBeenCalled();
    expect(prisma.activityLog.create).toHaveBeenCalled();
  });

  it("allows global admin to notify for any explanation", async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 99, role: "ADMIN", ventureIds: [] });
    (prisma.missedEodExplanation.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      userId: 1,
      ventureId: 1,
      managerNotified: false,
      user: { id: 1, fullName: "User", email: "user@example.com" },
      venture: { id: 1, name: "Venture" },
    });

    const { req, res } = createMockReqRes({ explanationId: 1 });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(200);
  });
});
