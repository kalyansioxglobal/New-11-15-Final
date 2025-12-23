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

describe("Dormant Customer Rule", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should find customers with old lastLoadDate and lastTouchAt", async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 30);

    const mockCustomers = [
      {
        id: 1,
        name: "Old Customer",
        assignedCsrId: 10,
        assignedSalesId: null,
        churnRiskScore: 70,
        loadFrequencyDays: 14,
        lastLoadDate: oldDate,
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

    expect(prisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ventureId: 1,
          isActive: true,
        }),
      })
    );
    expect(result.scanned).toBe(1);
  });

  it("should set high priority for high churn risk customers", async () => {
    const mockCustomers = [
      {
        id: 1,
        name: "High Risk Customer",
        assignedCsrId: null,
        assignedSalesId: 20,
        churnRiskScore: 85,
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
          priority: "CRITICAL",
        }),
      })
    );
  });

  it("should use Sales assignee when CSR not assigned", async () => {
    const mockCustomers = [
      {
        id: 1,
        name: "Test Customer",
        assignedCsrId: null,
        assignedSalesId: 25,
        churnRiskScore: 40,
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
          assignedTo: 25,
        }),
      })
    );
  });

  it("should include customer name in task title", async () => {
    const mockCustomers = [
      {
        id: 1,
        name: "Acme Corp",
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

    await runDormantCustomerRule({
      ventureId: 1,
      daysNoLoad: 21,
      daysNoTouch: 7,
    });

    expect(prisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: expect.stringContaining("Acme Corp"),
        }),
      })
    );
  });
});
