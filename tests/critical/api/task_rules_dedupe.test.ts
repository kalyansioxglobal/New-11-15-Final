import { runDormantCustomerRule } from "@/lib/freight/taskRules";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    customer: {
      findMany: jest.fn(),
    },
    task: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

describe("Task Rules Deduplication", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should not create duplicate tasks for same customer", async () => {
    const mockCustomers = [
      {
        id: 1,
        name: "Test Customer",
        assignedCsrId: 10,
        assignedSalesId: null,
        churnRiskScore: 50,
        loadFrequencyDays: null,
        lastLoadDate: null,
      },
    ];

    (prisma.customer.findMany as jest.Mock).mockResolvedValue(mockCustomers);
    (prisma.task.findFirst as jest.Mock).mockResolvedValue({ id: 100 });

    const result = await runDormantCustomerRule({
      ventureId: 1,
      daysNoLoad: 21,
      daysNoTouch: 7,
    });

    expect(result.tasksSkippedExisting).toBe(1);
    expect(result.tasksCreated).toBe(0);
    expect(prisma.task.create).not.toHaveBeenCalled();
  });

  it("should create task if no existing OPEN task exists", async () => {
    const mockCustomers = [
      {
        id: 1,
        name: "Test Customer",
        assignedCsrId: 10,
        assignedSalesId: null,
        churnRiskScore: 50,
        loadFrequencyDays: null,
        lastLoadDate: null,
      },
    ];

    (prisma.customer.findMany as jest.Mock).mockResolvedValue(mockCustomers);
    (prisma.task.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.task.create as jest.Mock).mockResolvedValue({ id: 1 });

    const result = await runDormantCustomerRule({
      ventureId: 1,
      daysNoLoad: 21,
      daysNoTouch: 7,
    });

    expect(result.tasksCreated).toBe(1);
    expect(prisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "DORMANT_CUSTOMER_FOLLOWUP",
          customerId: 1,
          assignedTo: 10,
        }),
      })
    );
  });

  it("should skip customer with no assignee", async () => {
    const mockCustomers = [
      {
        id: 1,
        name: "Unassigned Customer",
        assignedCsrId: null,
        assignedSalesId: null,
        churnRiskScore: 50,
        loadFrequencyDays: null,
        lastLoadDate: null,
      },
    ];

    (prisma.customer.findMany as jest.Mock).mockResolvedValue(mockCustomers);

    const result = await runDormantCustomerRule({
      ventureId: 1,
      daysNoLoad: 21,
      daysNoTouch: 7,
    });

    expect(result.tasksSkippedNoAssignee).toBe(1);
    expect(result.tasksCreated).toBe(0);
    expect(prisma.task.findFirst).not.toHaveBeenCalled();
  });

  it("should prefer CSR over Sales for assignment", async () => {
    const mockCustomers = [
      {
        id: 1,
        name: "Test Customer",
        assignedCsrId: 10,
        assignedSalesId: 20,
        churnRiskScore: 50,
        loadFrequencyDays: null,
        lastLoadDate: null,
      },
    ];

    (prisma.customer.findMany as jest.Mock).mockResolvedValue(mockCustomers);
    (prisma.task.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.task.create as jest.Mock).mockResolvedValue({ id: 1 });

    await runDormantCustomerRule({
      ventureId: 1,
      daysNoLoad: 21,
      daysNoTouch: 7,
    });

    expect(prisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assignedTo: 10,
        }),
      })
    );
  });
});
