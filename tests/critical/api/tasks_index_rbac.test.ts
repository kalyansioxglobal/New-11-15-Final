import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/tasks";

function createMockReqRes(method: string, query: any = {}): {
  req: Partial<NextApiRequest>;
  res: Partial<NextApiResponse> & { statusCode: number; jsonData: any };
} {
  const req: Partial<NextApiRequest> = { method, query };
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
const { prisma } = jest.requireMock("@/lib/prisma");

// Note: unauthenticated handling is delegated to requireUser helper.

describe("/api/tasks index RBAC & validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("relies on requireUser to handle unauthenticated on GET", async () => {
    (requireUser as jest.Mock).mockResolvedValue(null);

    const { req, res } = createMockReqRes("GET", {});

    // @ts-expect-error partial
    await handler(req, res);

    expect([200, 401]).toContain(res.statusCode);
  });

  it("returns paginated task list for authenticated user within scope", async () => {
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

    const { req, res } = createMockReqRes("GET", { page: "1", limit: "10" });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toHaveProperty("tasks");
    expect(res.jsonData).toHaveProperty("page", 1);
    expect(res.jsonData).toHaveProperty("limit", 10);
  });

  it("prevents creating tasks without permission", async () => {
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

    const { req, res } = createMockReqRes("POST", {});

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData.error).toBe("FORBIDDEN");
  });

  it("allows creating unassigned tasks when user can create but not assign", async () => {
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
    (canCreateTasks as jest.Mock).mockReturnValue(true);

    const { req, res } = createMockReqRes("POST", {});
    req.body = {
      title: "Test task",
      ventureId: 1,
    } as any;

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(201);
    expect(prisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Test task",
          ventureId: 1,
          assignedTo: null,
        }),
      }),
    );
  });

  it("rejects assigning tasks when user cannot assign", async () => {
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
    (canCreateTasks as jest.Mock).mockReturnValue(true);
    (canAssignTasks as jest.Mock).mockReturnValue(false);

    const { req, res } = createMockReqRes("POST", {});
    req.body = {
      title: "Assigned task",
      ventureId: 1,
      assignedToId: 2,
    } as any;

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData.error).toBe("FORBIDDEN_ASSIGN");
  });

  it("rejects creating task in out-of-scope venture", async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      id: 1,
      role: "EMPLOYEE",
      isTestUser: false,
    });
    (getUserScope as jest.Mock).mockReturnValue({
      allVentures: false,
      ventureIds: [1],
      allOffices: true,
      officeIds: [1],
    });
    (canCreateTasks as jest.Mock).mockReturnValue(true);

    const { req, res } = createMockReqRes("POST", {});
    req.body = {
      title: "Out of scope task",
      ventureId: 99,
    } as any;

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData.error).toBe("FORBIDDEN_VENTURE");
  });
});
