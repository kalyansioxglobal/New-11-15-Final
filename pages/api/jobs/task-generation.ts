import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/apiAuth";
import { isGlobalAdmin } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import { JobName } from "@prisma/client";
import {
  runDormantCustomerRule,
  runQuoteExpiringRule,
  runQuoteNoResponseRule,
} from "@/lib/freight/taskRules";

interface TaskGenerationRules {
  dormant?: { daysNoLoad: number; daysNoTouch: number };
  quoteExpiringHours?: number;
  quoteNoResponseFollowup?: boolean;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  if (!isGlobalAdmin(user)) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }

  const body = req.body || {};
  const ventureId = body.ventureId ? Number(body.ventureId) : undefined;
  const dryRun = body.dryRun === true;
  const rules: TaskGenerationRules = body.rules || {};

  if (!ventureId) {
    return res.status(400).json({ error: "ventureId is required" });
  }

  const startedAt = new Date();
  const stats: any = {};
  const errors: string[] = [];

  try {
    if (rules.dormant) {
      const dormantResult = await runDormantCustomerRule({
        ventureId,
        daysNoLoad: rules.dormant.daysNoLoad || 21,
        daysNoTouch: rules.dormant.daysNoTouch || 7,
        dryRun,
      });
      stats.dormant = dormantResult;
    }

    if (rules.quoteExpiringHours) {
      const quoteExpiringResult = await runQuoteExpiringRule({
        ventureId,
        hoursUntilExpiry: rules.quoteExpiringHours,
        dryRun,
      });
      stats.quoteExpiring = quoteExpiringResult;
    }

    if (rules.quoteNoResponseFollowup) {
      const quoteNoResponseResult = await runQuoteNoResponseRule({
        ventureId,
        dryRun,
      });
      stats.quoteNoResponse = quoteNoResponseResult;
    }

    const jobRunLog = await prisma.jobRunLog.create({
      data: {
        ventureId,
        jobName: JobName.TASK_GENERATION,
        status: errors.length > 0 ? "PARTIAL" : "SUCCESS",
        startedAt,
        endedAt: new Date(),
        statsJson: JSON.stringify({ ...stats, dryRun, rules }),
        error: errors.length > 0 ? errors.join("; ") : null,
      },
    });

    return res.status(200).json({
      ok: true,
      stats,
      jobRunLogId: jobRunLog.id,
      dryRun,
    });
  } catch (err: any) {
    const { logger } = await import("@/lib/logger");
    logger.error("task_generation_job_failed", {
      userId: user.id,
      ventureId,
      error: err?.message || String(err),
      stack: process.env.NODE_ENV !== 'production' ? err?.stack : undefined,
    });

    await prisma.jobRunLog.create({
      data: {
        ventureId,
        jobName: JobName.TASK_GENERATION,
        status: "ERROR",
        startedAt,
        endedAt: new Date(),
        statsJson: JSON.stringify({ stats, dryRun, rules }),
        error: err.message || "Unknown error",
      },
    });

    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
