import { prisma } from "../lib/prisma";
import { runQuoteTimeoutJob } from "../lib/jobs/quoteTimeoutJob";
import { runChurnRecalcJob } from "../lib/jobs/churnRecalcJob";
import { runIncentiveDailyJob } from "../lib/jobs/incentiveDailyJob";
import { runKpiAggregationJob } from "../lib/jobs/kpiAggregationJob";
import {
  runDormantCustomerRule,
  runQuoteExpiringRule,
  runQuoteNoResponseRule,
} from "../lib/freight/taskRules";
import { JobName } from "@prisma/client";
import { runJobWithControl } from "../lib/jobs/jobRunner";
import { getNewYorkTime, getNextRunTimeSimple as getNextRunTime } from '@/lib/utils/timezone';

type ScheduledJob = {
  name: string;
  hour: number;
  minute: number;
  run: () => Promise<void>;
};

const TIMEZONE = "America/New_York";

const schedule: ScheduledJob[] = [
  {
    name: "Churn Recalculation",
    hour: 2,
    minute: 0,
    run: async () => {
      const jobKey = `CHURN_RECALC:${new Date().toISOString().split('T')[0]}`;
      await runJobWithControl(
        {
          jobName: JobName.CHURN_RECALC,
          jobKey,
          timeout: 3600000, // 1 hour
        },
        async () => {
          const result = await runChurnRecalcJob({ dryRun: false });
          console.log(`[${new Date().toISOString()}] Churn Recalc complete:`, {
            shipperUpdated: result.stats.shipperUpdated,
            customerUpdated: result.stats.customerUpdated,
            jobRunLogId: result.jobRunLogId,
          });
          return result;
        }
      );
    },
  },
  {
    name: "Quote Timeout",
    hour: 6,
    minute: 0,
    run: async () => {
      const jobKey = `QUOTE_TIMEOUT:${new Date().toISOString().split('T')[0]}`;
      await runJobWithControl(
        {
          jobName: JobName.QUOTE_TIMEOUT,
          jobKey,
          timeout: 3600000, // 1 hour
        },
        async () => {
          const result = await runQuoteTimeoutJob({ dryRun: false, limit: 5000 });
          console.log(`[${new Date().toISOString()}] Quote Timeout complete:`, {
            scanned: result.stats.scanned,
            updated: result.stats.updated,
            jobRunLogId: result.jobRunLogId,
          });
          return result;
        }
      );
    },
  },
  {
    name: "Task Generation",
    hour: 6,
    minute: 30,
    run: async () => {
      const jobKey = `TASK_GENERATION:${new Date().toISOString().split('T')[0]}`;
      await runJobWithControl(
        {
          jobName: JobName.TASK_GENERATION,
          jobKey,
          timeout: 3600000, // 1 hour
        },
        async () => {
          const ventures = await prisma.venture.findMany({
            where: { isActive: true },
            select: { id: true, name: true },
          });

          let venturesProcessed = 0;

          for (const venture of ventures) {
            console.log(`[${new Date().toISOString()}] Processing venture: ${venture.name}`);

            const dormantResult = await runDormantCustomerRule({
              ventureId: venture.id,
              daysNoLoad: 21,
              daysNoTouch: 7,
              dryRun: false,
            });

            const expiringResult = await runQuoteExpiringRule({
              ventureId: venture.id,
              hoursUntilExpiry: 24,
              dryRun: false,
            });

            const noResponseResult = await runQuoteNoResponseRule({
              ventureId: venture.id,
              dryRun: false,
            });

            console.log(`[${new Date().toISOString()}] Venture ${venture.name} tasks:`, {
              dormant: { created: dormantResult.tasksCreated, skipped: dormantResult.tasksSkippedExisting },
              expiring: { created: expiringResult.tasksCreated, skipped: expiringResult.tasksSkippedExisting },
              noResponse: { created: noResponseResult.tasksCreated, skipped: noResponseResult.tasksSkippedExisting },
            });
            
            venturesProcessed++;
          }

          console.log(`[${new Date().toISOString()}] Task Generation complete for ${venturesProcessed} ventures`);
          
          return { venturesProcessed };
        }
      );
    },
  },
  {
    name: "Incentive Daily Commit",
    hour: 7,
    minute: 0,
    run: async () => {
      const jobKey = `INCENTIVE_DAILY:${new Date().toISOString().split('T')[0]}`;
      await runJobWithControl(
        {
          jobName: JobName.INCENTIVE_DAILY,
          jobKey,
          timeout: 7200000, // 2 hours (incentive job can be long)
        },
        async () => {
          const result = await runIncentiveDailyJob({ dryRun: false });
          console.log(`[${new Date().toISOString()}] Incentive Daily Commit complete:`, {
            venturesProcessed: result.stats.venturesProcessed,
            plansProcessed: result.stats.plansProcessed,
            usersAffected: result.stats.usersAffected,
            totalInserted: result.stats.totalInserted,
            jobRunLogId: result.jobRunLogId,
          });
          if (result.stats.errors.length > 0) {
            console.warn(`[${new Date().toISOString()}] Incentive job had errors:`, result.stats.errors);
          }
          return result;
        }
      );
    },
  },
  {
    name: "KPI Aggregation",
    hour: 7,
    minute: 30,
    run: async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const jobKey = `KPI_AGGREGATION:${yesterday.toISOString().split('T')[0]}`;
      await runJobWithControl(
        {
          jobName: JobName.KPI_AGGREGATION,
          jobKey,
          timeout: 3600000, // 1 hour
        },
        async () => {
          const result = await runKpiAggregationJob({ dryRun: false, date: yesterday });
          console.log(`[${new Date().toISOString()}] KPI Aggregation complete:`, {
            venturesProcessed: result.stats.venturesProcessed,
            freightKpisUpdated: result.stats.freightKpisUpdated,
            jobRunLogId: result.jobRunLogId,
          });
          if (result.stats.errors.length > 0) {
            console.warn(`[${new Date().toISOString()}] KPI aggregation had errors:`, result.stats.errors);
          }
          return result;
        }
      );
    },
  },
];

function getNextScheduledJob(): { job: ScheduledJob; runAt: Date } | null {
  const ny = getNewYorkTime();
  const currentMinutes = ny.hour * 60 + ny.minute;

  const sortedSchedule = [...schedule].sort((a, b) => {
    const aMinutes = a.hour * 60 + a.minute;
    const bMinutes = b.hour * 60 + b.minute;
    return aMinutes - bMinutes;
  });

  for (const job of sortedSchedule) {
    const jobMinutes = job.hour * 60 + job.minute;
    if (jobMinutes > currentMinutes) {
      const runAt = getNextRunTime(job.hour, job.minute);
      return { job, runAt };
    }
  }

  const nextJob = sortedSchedule[0];
  const runAt = getNextRunTime(nextJob.hour, nextJob.minute);
  return { job: nextJob, runAt };
}

async function main() {
  console.log(`[${new Date().toISOString()}] Scheduled Jobs Runner started`);
  console.log(`Primary Timezone: ${TIMEZONE} (DST-aware)`);
  console.log("Schedule:");
  for (const job of schedule) {
    const timeStr = `${job.hour.toString().padStart(2, "0")}:${job.minute.toString().padStart(2, "0")}`;
    console.log(`  - ${job.name}: ${timeStr} ${TIMEZONE}`);
  }

  while (true) {
    const next = getNextScheduledJob();
    if (!next) {
      console.error("No scheduled jobs configured");
      break;
    }

    const waitMs = Math.max(0, next.runAt.getTime() - Date.now());
    const waitMinutes = Math.round(waitMs / 60000);
    const waitHours = Math.floor(waitMs / 3600000);
    const remainingMinutes = Math.round((waitMs % 3600000) / 60000);

    const waitStr = waitHours > 0
      ? `${waitHours}h ${remainingMinutes}m`
      : `${waitMinutes}m`;

    console.log(
      `[${new Date().toISOString()}] Next job: "${next.job.name}" at ${next.runAt.toISOString()} (in ${waitStr})`
    );

    await new Promise((resolve) => setTimeout(resolve, waitMs));

    console.log(`[${new Date().toISOString()}] Executing: ${next.job.name}`);
    await next.job.run();
  }
}

main().catch((err) => {
  console.error("Scheduler error:", err);
  process.exit(1);
});


