import { prisma } from "@/lib/prisma";
import { TaskType, TaskStatus } from "@prisma/client";

export interface DormantRuleOptions {
  ventureId: number;
  daysNoLoad: number;
  daysNoTouch: number;
  dryRun?: boolean;
}

export interface QuoteExpiringRuleOptions {
  ventureId: number;
  hoursUntilExpiry: number;
  dryRun?: boolean;
}

export interface QuoteNoResponseRuleOptions {
  ventureId: number;
  dryRun?: boolean;
}

export interface TaskRuleResult {
  scanned: number;
  tasksCreated: number;
  tasksSkippedExisting: number;
  tasksSkippedNoAssignee: number;
}

export async function runDormantCustomerRule(
  options: DormantRuleOptions
): Promise<TaskRuleResult> {
  const { ventureId, daysNoLoad, daysNoTouch, dryRun = false } = options;

  const now = new Date();
  const noLoadCutoff = new Date(now.getTime() - daysNoLoad * 24 * 60 * 60 * 1000);
  const noTouchCutoff = new Date(now.getTime() - daysNoTouch * 24 * 60 * 60 * 1000);

  const customers = await prisma.customer.findMany({
    where: {
      ventureId,
      isActive: true,
      OR: [
        { lastLoadDate: null },
        { lastLoadDate: { lt: noLoadCutoff } },
      ],
      AND: [
        {
          OR: [
            { lastTouchAt: null },
            { lastTouchAt: { lt: noTouchCutoff } },
          ],
        },
      ],
    },
    select: {
      id: true,
      name: true,
      assignedCsrId: true,
      assignedSalesId: true,
      churnRiskScore: true,
      loadFrequencyDays: true,
      lastLoadDate: true,
    },
  });

  const result: TaskRuleResult = {
    scanned: customers.length,
    tasksCreated: 0,
    tasksSkippedExisting: 0,
    tasksSkippedNoAssignee: 0,
  };

  const customerIds = customers
    .filter((c) => c.assignedCsrId || c.assignedSalesId)
    .map((c) => c.id);

  const existingTasks = await prisma.task.findMany({
    where: {
      customerId: { in: customerIds },
      type: TaskType.DORMANT_CUSTOMER_FOLLOWUP,
      status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] },
    },
    select: { customerId: true },
  });

  const existingCustomerIds = new Set(existingTasks.map((t) => t.customerId));

  const dueAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tasksToCreate: any[] = [];

  for (const customer of customers) {
    const assigneeId = customer.assignedCsrId || customer.assignedSalesId;

    if (!assigneeId) {
      result.tasksSkippedNoAssignee++;
      continue;
    }

    if (existingCustomerIds.has(customer.id)) {
      result.tasksSkippedExisting++;
      continue;
    }

    let priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "MEDIUM";
    if (customer.churnRiskScore !== null) {
      if (customer.churnRiskScore >= 80) priority = "CRITICAL";
      else if (customer.churnRiskScore >= 60) priority = "HIGH";
      else if (customer.churnRiskScore >= 40) priority = "MEDIUM";
      else priority = "LOW";
    }

    tasksToCreate.push({
      ventureId,
      type: TaskType.DORMANT_CUSTOMER_FOLLOWUP,
      status: TaskStatus.OPEN,
      assignedTo: assigneeId,
      customerId: customer.id,
      title: `Follow up: ${customer.name} (dormant)`,
      description: `Customer has not been contacted recently. Last load date: ${customer.lastLoadDate?.toISOString().split("T")[0] || "never"}`,
      priority,
      dueDate: dueAt,
    });
  }

  if (!dryRun && tasksToCreate.length > 0) {
    await prisma.task.createMany({ data: tasksToCreate });
  }

  result.tasksCreated = tasksToCreate.length;
  return result;
}

export async function runQuoteExpiringRule(
  options: QuoteExpiringRuleOptions
): Promise<TaskRuleResult> {
  const { ventureId, hoursUntilExpiry, dryRun = false } = options;

  const now = new Date();
  const expiryCutoff = new Date(now.getTime() + hoursUntilExpiry * 60 * 60 * 1000);

  const quotes = await prisma.freightQuote.findMany({
    where: {
      ventureId,
      status: "SENT",
      expiresAt: {
        not: null,
        gt: now,
        lte: expiryCutoff,
      },
    },
    select: {
      id: true,
      salespersonUserId: true,
      expiresAt: true,
      customer: {
        select: { name: true },
      },
    },
  });

  const result: TaskRuleResult = {
    scanned: quotes.length,
    tasksCreated: 0,
    tasksSkippedExisting: 0,
    tasksSkippedNoAssignee: 0,
  };

  const quoteIds = quotes.filter((q) => q.salespersonUserId).map((q) => q.id);

  const existingTasks = await prisma.task.findMany({
    where: {
      quoteId: { in: quoteIds },
      type: TaskType.QUOTE_EXPIRING,
      status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] },
    },
    select: { quoteId: true },
  });

  const existingQuoteIds = new Set(existingTasks.map((t) => t.quoteId));
  const tasksToCreate: any[] = [];

  for (const quote of quotes) {
    if (!quote.salespersonUserId) {
      result.tasksSkippedNoAssignee++;
      continue;
    }

    if (existingQuoteIds.has(quote.id)) {
      result.tasksSkippedExisting++;
      continue;
    }

    tasksToCreate.push({
      ventureId,
      type: TaskType.QUOTE_EXPIRING,
      status: TaskStatus.OPEN,
      assignedTo: quote.salespersonUserId,
      quoteId: quote.id,
      title: `Quote #${quote.id} expiring soon - ${quote.customer?.name || "Unknown"}`,
      description: `Quote expires at ${quote.expiresAt?.toISOString()}`,
      priority: "HIGH",
      dueDate: quote.expiresAt,
    });
  }

  if (!dryRun && tasksToCreate.length > 0) {
    await prisma.task.createMany({ data: tasksToCreate });
  }

  result.tasksCreated = tasksToCreate.length;
  return result;
}

export async function runQuoteNoResponseRule(
  options: QuoteNoResponseRuleOptions
): Promise<TaskRuleResult> {
  const { ventureId, dryRun = false } = options;

  const now = new Date();
  const dueAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const quotes = await prisma.freightQuote.findMany({
    where: {
      ventureId,
      status: "NO_RESPONSE",
    },
    select: {
      id: true,
      salespersonUserId: true,
      customer: {
        select: { name: true },
      },
    },
  });

  const result: TaskRuleResult = {
    scanned: quotes.length,
    tasksCreated: 0,
    tasksSkippedExisting: 0,
    tasksSkippedNoAssignee: 0,
  };

  const quoteIds = quotes.filter((q) => q.salespersonUserId).map((q) => q.id);

  const existingTasks = await prisma.task.findMany({
    where: {
      quoteId: { in: quoteIds },
      type: TaskType.QUOTE_FOLLOWUP,
      status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] },
    },
    select: { quoteId: true },
  });

  const existingQuoteIds = new Set(existingTasks.map((t) => t.quoteId));
  const tasksToCreate: any[] = [];

  for (const quote of quotes) {
    if (!quote.salespersonUserId) {
      result.tasksSkippedNoAssignee++;
      continue;
    }

    if (existingQuoteIds.has(quote.id)) {
      result.tasksSkippedExisting++;
      continue;
    }

    tasksToCreate.push({
      ventureId,
      type: TaskType.QUOTE_FOLLOWUP,
      status: TaskStatus.OPEN,
      assignedTo: quote.salespersonUserId,
      quoteId: quote.id,
      title: `Follow up on Quote #${quote.id} - ${quote.customer?.name || "Unknown"} (no response)`,
      description: `Quote received no response. Consider reaching out to customer.`,
      priority: "MEDIUM",
      dueDate: dueAt,
    });
  }

  if (!dryRun && tasksToCreate.length > 0) {
    await prisma.task.createMany({ data: tasksToCreate });
  }

  result.tasksCreated = tasksToCreate.length;
  return result;
}
