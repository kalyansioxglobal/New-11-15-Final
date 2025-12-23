import type { NextApiRequest, NextApiResponse } from "next";
import listHandler from "@/pages/api/ai/templates/list";
import createHandler from "@/pages/api/ai/templates/create";
import updateHandler from "@/pages/api/ai/templates/update";
import deleteHandler from "@/pages/api/ai/templates/delete";

jest.mock("@/lib/apiAuth", () => ({
  requireUser: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/lib/scope", () => ({
  getUserScope: jest.fn().mockReturnValue({
    allVentures: false,
    allOffices: false,
    ventureIds: [1],
    officeIds: [],
  }),
}));

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    aiDraftTemplate: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const { requireUser } = jest.requireMock("@/lib/apiAuth");
const prisma = jest.requireMock("@/lib/prisma").default;

function createMockReqRes(
  method: string,
  body: any = {},
  query: any = {},
): {
  req: Partial<NextApiRequest>;
  res: Partial<NextApiResponse> & { statusCode: number; jsonData: any };
} {
  const req: Partial<NextApiRequest> = { method, body, query };
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

describe("/api/ai/templates CRUD RBAC & scoping", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("allows privileged user to list templates for domain within venture scope", async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      id: 1,
      role: "CEO",
      ventureIds: [1],
      officeIds: [],
    });

    (prisma.aiDraftTemplate.findMany as jest.Mock).mockResolvedValue([
      {
        id: 1,
        name: "Team Template",
        description: "desc",
        body: "body",
        isActive: true,
      },
    ]);

    const { req, res } = createMockReqRes("GET", {}, { domain: "freight" });

    // @ts-expect-error partial
    await listHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toHaveProperty("builtin");
    expect(res.jsonData).toHaveProperty("custom");
  });

  it("forbids non-privileged user from listing templates for restricted domain", async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      id: 2,
      role: "CONTRACTOR",
      ventureIds: [1],
      officeIds: [],
    });

    const { req, res } = createMockReqRes("GET", {}, { domain: "freight" });

    // @ts-expect-error partial
    await listHandler(req, res);

    expect(res.statusCode).toBe(403);
  });

  it("blocks create for non-privileged user", async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      id: 2,
      role: "CSR",
      ventureIds: [2],
      officeIds: [],
    });

    const { req, res } = createMockReqRes("POST", {
      domain: "hotel",
      ventureId: 2,
      name: "Template",
      body: "Safe body",
    });

    // @ts-expect-error partial
    await createHandler(req, res);

    // CSR should not manage hotel templates per domain-lead rules
    expect(res.statusCode).toBe(403);
  });

  it("allows CEO to create template within scoped venture", async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      id: 1,
      role: "CEO",
      ventureIds: [1],
      officeIds: [],
    });

    (prisma.aiDraftTemplate.create as jest.Mock).mockResolvedValue({
      id: 10,
      domain: "freight",
      ventureId: 1,
      name: "Template",
      description: null,
      body: "Safe body",
      isActive: true,
      createdById: 1,
    });

    const { req, res } = createMockReqRes("POST", {
      domain: "freight",
      ventureId: 1,
      name: "Template",
      body: "Safe body",
    });

    // @ts-expect-error partial
    await createHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(prisma.aiDraftTemplate.create).toHaveBeenCalled();
  });

  it("prevents cross-venture update/delete via ventureId spoofing", async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      id: 1,
      role: "CEO",
      ventureIds: [1],
      officeIds: [],
    });

    (prisma.aiDraftTemplate.findUnique as jest.Mock).mockResolvedValue({
      id: 99,
      domain: "freight",
      ventureId: 2,
      name: "Template",
      description: null,
      body: "body",
      isActive: true,
      createdById: 5,
    });

    const { req: updateReq, res: updateRes } = createMockReqRes("POST", {
      id: 99,
      name: "Updated",
      body: "Safe body",
    });

    // @ts-expect-error partial
    await updateHandler(updateReq, updateRes);

    expect(updateRes.statusCode).toBe(403);

    const { req: deleteReq, res: deleteRes } = createMockReqRes("POST", {
      id: 99,
    });

    // @ts-expect-error partial
    await deleteHandler(deleteReq, deleteRes);

    expect(deleteRes.statusCode).toBe(403);
  });
});
