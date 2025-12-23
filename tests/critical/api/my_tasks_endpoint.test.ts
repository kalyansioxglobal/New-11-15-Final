import { createMocks } from "node-mocks-http";
import handler from "@/pages/api/freight/tasks/index";

jest.mock("@/lib/apiAuth", () => ({
  requireUser: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    task: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import { requireUser } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

describe("My Tasks Endpoint", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 405 for non-GET requests", async () => {
    const { req, res } = createMocks({
      method: "POST",
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toEqual({ error: "Method not allowed" });
  });

  it("should return 400 if ventureId not provided", async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: "EMPLOYEE" });

    const { req, res } = createMocks({
      method: "GET",
      query: {},
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({ error: "ventureId is required" });
  });

  it("should return only tasks assigned to current user when mineOnly=true", async () => {
    const mockUser = { id: 42, role: "EMPLOYEE" };
    (requireUser as jest.Mock).mockResolvedValue(mockUser);

    const mockTasks = [
      {
        id: 1,
        title: "Test Task",
        description: null,
        type: "DORMANT_CUSTOMER_FOLLOWUP",
        status: "OPEN",
        priority: "MEDIUM",
        dueDate: new Date("2024-01-15"),
        createdAt: new Date("2024-01-01"),
        completedAt: null,
        customer: { id: 1, name: "Test Customer" },
        quote: null,
        load: null,
        assignedUser: { id: 42, fullName: "Test User" },
      },
    ];

    (prisma.task.findMany as jest.Mock).mockResolvedValue(mockTasks);
    (prisma.task.count as jest.Mock).mockResolvedValue(1);

    const { req, res } = createMocks({
      method: "GET",
      query: { ventureId: "1", mineOnly: "true" },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          assignedTo: 42,
        }),
      })
    );

    const data = JSON.parse(res._getData());
    expect(data.tasks).toHaveLength(1);
    expect(data.tasks[0].title).toBe("Test Task");
  });

  it("should filter by status when provided", async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: "EMPLOYEE" });
    (prisma.task.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.task.count as jest.Mock).mockResolvedValue(0);

    const { req, res } = createMocks({
      method: "GET",
      query: { ventureId: "1", status: "IN_PROGRESS" },
    });

    await handler(req, res);

    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "IN_PROGRESS",
        }),
      })
    );
  });

  it("should filter by type when provided", async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: "EMPLOYEE" });
    (prisma.task.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.task.count as jest.Mock).mockResolvedValue(0);

    const { req, res } = createMocks({
      method: "GET",
      query: { ventureId: "1", type: "QUOTE_FOLLOWUP" },
    });

    await handler(req, res);

    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: "QUOTE_FOLLOWUP",
        }),
      })
    );
  });
});
