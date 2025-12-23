import type { NextApiRequest, NextApiResponse } from "next";
import { runIncentiveDailyJob } from "@/lib/jobs/incentiveDailyJob";
import { logger } from "@/lib/logger";

const CRON_SECRET = process.env.CRON_SECRET;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  const querySecret = req.query.secret as string;
  const providedSecret = authHeader?.replace("Bearer ", "") || querySecret;

  if (CRON_SECRET && providedSecret !== CRON_SECRET) {
    logger.warn("cron_incentive_unauthorized", {
      meta: { ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress },
    });
    return res.status(401).json({ error: "Unauthorized" });
  }

  const startTime = Date.now();
  logger.info("cron_incentive_daily_start", {
    meta: { timestamp: new Date().toISOString() },
  });

  try {
    const result = await runIncentiveDailyJob({ dryRun: false });
    
    const duration = Date.now() - startTime;
    logger.info("cron_incentive_daily_complete", {
      meta: {
        duration,
        venturesProcessed: result.stats.venturesProcessed,
        plansProcessed: result.stats.plansProcessed,
        usersAffected: result.stats.usersAffected,
        inserted: result.stats.totalInserted,
        deleted: result.stats.totalDeleted,
        errors: result.stats.errors.length,
      },
    });

    return res.status(200).json({
      ok: true,
      duration,
      stats: result.stats,
      jobRunLogId: result.jobRunLogId,
    });
  } catch (err: any) {
    logger.error("cron_incentive_daily_failed", {
      meta: { error: err.message, stack: err.stack },
    });
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
