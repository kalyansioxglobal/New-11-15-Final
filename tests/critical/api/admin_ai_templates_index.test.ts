import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/admin/ai-templates/index";

jest.mock("@/lib/apiAuth", () => ({
  requireAdminUser: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/lib/audit', () => ({
  logAuditEvent: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    aiDraftTemplate: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const { requireAdminUser } = jest.requireMock("@/lib/apiAuth");
const prisma = jest.requireMock("@/lib/prisma").default;

function createMockReqRes(method: string, body: any = {}, query: any = {}) {
  const req: Partial<NextApiRequest> = { method, body, query, headers: {} };
  const res: any = {};
  res.statusCode = 200;
  res.headers = {};
  res.setHeader = (k: string, v: string) => (res.headers[k] = v);
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.jsonData = null;
  res.json = (d: any) => { res.jsonData = d; return res; };
  return { req, res };
}

describe("/api/admin/ai-templates index", () => {
  beforeEach(() => jest.clearAllMocks());

  it("GET returns templates in scope for admin", async () => {
    (requireAdminUser as jest.Mock).mockResolvedValue({ id: 1, role: "ADMIN", ventureIds: [1], allVentures: false });
    (prisma.aiDraftTemplate.findMany as jest.Mock).mockResolvedValue([{ id: 1, name: "T1" }]);
    (prisma.aiDraftTemplate.count as jest.Mock).mockResolvedValue(1);

    const { req, res } = createMockReqRes("GET", {}, {});
    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toHaveProperty("templates");
  });

  it("POST creates when payload valid and in venture scope", async () => {
    (requireAdminUser as jest.Mock).mockResolvedValue({ id: 2, role: "ADMIN", ventureIds: [2], allVentures: false });
    (prisma.aiDraftTemplate.create as jest.Mock).mockResolvedValue({ id: 10, name: "New" });

    const { req, res } = createMockReqRes("POST", { name: "New", domain: "freight", body: "x", ventureId: 2 });
    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(201);
    expect(prisma.aiDraftTemplate.create).toHaveBeenCalled();
    const createArg = (prisma.aiDraftTemplate.create as jest.Mock).mock.calls[0][0];
    expect(createArg).toHaveProperty('data');
    expect(createArg.data).toMatchObject({ name: 'New', domain: 'freight' });
    // ensure venture connect present
    expect(createArg.data).toHaveProperty('venture');
    expect(createArg.data.venture).toEqual({ connect: { id: 2 } });

    const { logAuditEvent } = jest.requireMock('@/lib/audit');
    expect(logAuditEvent).toHaveBeenCalled();
  });

  it("POST rejects validation error", async () => {
    (requireAdminUser as jest.Mock).mockResolvedValue({ id: 2, role: "ADMIN", ventureIds: [2], allVentures: false });

    const { req, res } = createMockReqRes("POST", { name: "N", domain: "unknown", body: "", ventureId: 2 });
    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });
});
