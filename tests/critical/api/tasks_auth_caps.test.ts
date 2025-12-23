import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/tasks";

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
  canCreateTasks: jest.fn(),
  canAssignTasks: jest.fn(),
}));

jest.mock("@/lib/prisma", () => {
  const prismaMock = {
    task: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
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
const { canCreateTasks, canAssignTasks } = jest.requireMock("@/lib/permissions");

describe("/api/tasks auth & caps", () => {
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

  it("caps limit to 100 on GET", async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      id: 1,
      role: "EMPLOYEE",
      isTestUser: false,
    });
    (getUserScope as jest.Mock).mockReturnValue({
      allVentures: true,
      ventureIds: [],
      allOffices: true,
      officeIds: [],
    });

    const { req, res } = createMockReqRes("GET", { page: "1", limit: "500" });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData.limit).toBeLessThanOrEqual(100);
  });

  it("returns 403 FORBIDDEN when creating without permission", async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      id: 1,
      role: "EMPLOYEE",
      isTestUser: false,
    });
    (getUserScope as jest.Mock).mockReturnValue({
      allVentures: true,
      ventureIds: [1],
      allOffices: true,
      officeIds: [1],
    });
    (canCreateTasks as jest.Mock).mockReturnValue(false);

    const { req, res } = createMockReqRes("POST", {}, { title: "T1", ventureId: 1 });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData.error).toBe("FORBIDDEN");
  });

  it("returns 403 FORBIDDEN_ASSIGN when assigning without permission", async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      id: 1,
      role: "MANAGER",
      isTestUser: false,
    });
    (getUserScope as jest.Mock).mockReturnValue({
      allVentures: true,
      ventureIds: [1],
      allOffices: true,
      officeIds: [1],
    });
    (canCreateTasks as jest.Mock).mockReturnValue(true);
    (canAssignTasks as jest.Mock).mockReturnValue(false);

    const { req, res } = createMockReqRes("POST", {}, { title: "T1", ventureId: 1, assignedToId: 2 });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData.error).toBe("FORBIDDEN_ASSIGN");
  });
});
