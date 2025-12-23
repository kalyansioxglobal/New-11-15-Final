import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/admin/ai-templates/[id]";

jest.mock("@/lib/apiAuth", () => ({
  requireAdminUser: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/audit', () => ({
  logAuditEvent: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    aiDraftTemplate: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const { requireAdminUser } = jest.requireMock("@/lib/apiAuth");
const prisma = jest.requireMock("@/lib/prisma").default;

function createMockReqRes(
  method: string,
  body: any = {},
  query: any = {}
): {
  req: Partial<NextApiRequest>;
  res: Partial<NextApiResponse> & { statusCode: number; jsonData: any };
} {
  const req: Partial<NextApiRequest> = { method, body, query, headers: {} };
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

describe("/api/admin/ai-templates/[id] admin CRUD", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET returns template for valid id and admin", async () => {
    (requireAdminUser as jest.Mock).mockResolvedValue({ id: 1, role: "ADMIN" });
    (prisma.aiDraftTemplate.findUnique as jest.Mock).mockResolvedValue({ id: 1, name: "T1" });

    const { req, res } = createMockReqRes("GET", {}, { id: "1" });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toHaveProperty("template");
  });

  it("GET returns 404 for non-existing id", async () => {
    (requireAdminUser as jest.Mock).mockResolvedValue({ id: 1, role: "ADMIN" });
    (prisma.aiDraftTemplate.findUnique as jest.Mock).mockResolvedValue(null);

    const { req, res } = createMockReqRes("GET", {}, { id: "999" });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(404);
  });

  it("PUT updates template for admin", async () => {
    (requireAdminUser as jest.Mock).mockResolvedValue({ id: 1, role: "ADMIN" });
    (prisma.aiDraftTemplate.update as jest.Mock).mockResolvedValue({ id: 1, name: "Updated" });

    const { req, res } = createMockReqRes("PUT", { name: "Updated" }, { id: "1" });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(prisma.aiDraftTemplate.update).toHaveBeenCalled();
    expect(res.jsonData).toHaveProperty("template");
    const { logAuditEvent } = jest.requireMock('@/lib/audit');
    expect(logAuditEvent).toHaveBeenCalled();
  });

  it("DELETE removes template for admin", async () => {
    (requireAdminUser as jest.Mock).mockResolvedValue({ id: 1, role: "ADMIN" });
    (prisma.aiDraftTemplate.delete as jest.Mock).mockResolvedValue({});

    const { req, res } = createMockReqRes("DELETE", {}, { id: "1" });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(prisma.aiDraftTemplate.delete).toHaveBeenCalled();
    expect(res.jsonData).toHaveProperty("success", true);
    const { logAuditEvent } = jest.requireMock('@/lib/audit');
    expect(logAuditEvent).toHaveBeenCalled();
  });

  it("non-admin is forbidden", async () => {
    (requireAdminUser as jest.Mock).mockImplementation(async (_req: any, res: any) => {
      res.status(403);
      return null;
    });

    const { req, res } = createMockReqRes("GET", {}, { id: "1" });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(403);
  });
});
