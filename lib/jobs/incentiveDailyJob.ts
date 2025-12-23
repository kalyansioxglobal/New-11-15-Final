import { prisma } from "@/lib/prisma";
import { JobName } from "@prisma/client";
import { 
  calculateIncentivesForDay, 
  getDayBounds,
  type EngineIncentiveDaily 
} from "@/lib/incentives/engine";

export interface IncentiveDailyJobOptions {
  ventureId?: number;
  date?: string; // YYYY-MM-DD, defaults to yesterday
  dryRun?: boolean;
}

export interface IncentiveDailyJobResult {
  venturesProcessed: number;
  plansProcessed: number;
  usersAffected: number;
  totalDeleted: number;
  totalInserted: number;
  errors: string[];
}

function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().slice(0, 10);
}

/**
 * Processes all plans for a venture together, then does a single delete+insert
 * for the entire venture. This ensures multiple plans don't overwrite each other.
 */
async function commitVentureIncentivesIdempotent(
  ventureId: number,
  planIds: number[],
  date: string,
): Promise<{ deleted: number; inserted: number; items: EngineIncentiveDaily[] }> {
  const { day } = getDayBounds(date);
  const dayDate = new Date(`${day}T00:00:00.000Z`);

  // Calculate incentives for ALL plans first
  const allItems: EngineIncentiveDaily[] = [];
  for (const planId of planIds) {
    const planItems = await calculateIncentivesForDay(planId, date);
    allItems.push(...planItems);
  }

  // Delete existing records for this venture+date ONCE (idempotent clear)
  const deleteResult = await prisma.incentiveDaily.deleteMany({
    where: {
      ventureId,
      date: dayDate,
    },
  });

  const deleted = deleteResult.count;

  if (allItems.length === 0) {
    return { deleted, inserted: 0, items: [] };
  }

  // Group items by userId to aggregate all rule amounts for each user across all plans
  const userTotals = new Map<number, { 
    amount: number; 
    rules: { ruleId: number; planId: number; amount: number }[] 
  }>();
  
  for (const item of allItems) {
    const existing = userTotals.get(item.userId);
    if (existing) {
      existing.amount += item.amount;
      existing.rules.push({ ruleId: item.ruleId, planId: item.planId, amount: item.amount });
    } else {
      userTotals.set(item.userId, {
        amount: item.amount,
        rules: [{ ruleId: item.ruleId, planId: item.planId, amount: item.amount }],
      });
    }
  }

  // Create fresh records
  let inserted = 0;
  for (const [userId, data] of userTotals.entries()) {
    await prisma.incentiveDaily.create({
      data: {
        userId,
        ventureId,
        officeId: null,
        date: dayDate,
        amount: data.amount,
        currency: "USD",
        breakdown: { 
          rules: data.rules, 
          planIds: planIds,
          computedAt: new Date().toISOString() 
        },
        isTest: false,
      },
    });
    inserted += 1;
  }

  return { deleted, inserted, items: allItems };
}

export async function runIncentiveDailyJob(
  options: IncentiveDailyJobOptions = {}
): Promise<{ stats: IncentiveDailyJobResult; jobRunLogId: number }> {
  const { ventureId, dryRun = false } = options;
  const date = options.date || getYesterdayDate();
  const startedAt = new Date();

  const stats: IncentiveDailyJobResult = {
    venturesProcessed: 0,
    plansProcessed: 0,
    usersAffected: 0,
    totalDeleted: 0,
    totalInserted: 0,
    errors: [],
  };

  try {
    // Find all active ventures (or specific one)
    const ventureWhere: any = { isActive: true };
    if (ventureId) {
      ventureWhere.id = ventureId;
    }

    const ventures = await prisma.venture.findMany({
      where: ventureWhere,
      select: { id: true, name: true },
    });

    for (const venture of ventures) {
      // Find active incentive plans for this venture
      const plans = await prisma.incentivePlan.findMany({
        where: {
          ventureId: venture.id,
          isActive: true,
        },
        select: { id: true, name: true },
      });

      if (plans.length === 0) {
        continue; // No plans for this venture
      }

      stats.venturesProcessed += 1;
      stats.plansProcessed += plans.length;

      try {
        if (dryRun) {
          // In dry-run mode, just calculate without saving
          const uniqueUsers = new Set<number>();
          for (const plan of plans) {
            const items = await calculateIncentivesForDay(plan.id, date);
            items.forEach((i) => uniqueUsers.add(i.userId));
          }
          stats.usersAffected += uniqueUsers.size;
        } else {
          // Process ALL plans for this venture together (idempotent)
          const result = await commitVentureIncentivesIdempotent(
            venture.id,
            plans.map((p) => p.id),
            date
          );
          stats.totalDeleted += result.deleted;
          stats.totalInserted += result.inserted;
          stats.usersAffected += result.inserted;
        }
      } catch (err: any) {
        stats.errors.push(`Venture ${venture.id} (${venture.name}): ${err.message}`);
      }
    }
  } catch (err: any) {
    stats.errors.push(`Job error: ${err.message}`);
  }

  const status = stats.errors.length === 0 ? "SUCCESS" : "PARTIAL_FAILURE";

  const jobRunLog = await prisma.jobRunLog.create({
    data: {
      ventureId: ventureId || null,
      jobName: JobName.INCENTIVE_DAILY,
      status,
      startedAt,
      endedAt: new Date(),
      statsJson: JSON.stringify({ ...stats, date, dryRun }),
      error: stats.errors.length > 0 ? stats.errors.join("; ") : null,
    },
  });

  return { stats, jobRunLogId: jobRunLog.id };
}
