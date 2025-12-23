import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/apiAuth";
import { isGlobalAdmin } from "@/lib/scope";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  if (!isGlobalAdmin(user)) {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }

  try {
    const lastRun = await prisma.fmcsaSyncLog.findFirst({
      orderBy: { startedAt: "desc" },
    });

    const recentRuns = await prisma.fmcsaSyncLog.findMany({
      orderBy: { startedAt: "desc" },
      take: 10,
    });

    const totalFmcsaCarriers = await prisma.carrier.count({
      where: { fmcsaLastSyncAt: { not: null } },
    });

    return res.status(200).json({
      ok: true,
      summary: lastRun
        ? {
            lastRunAt: lastRun.startedAt,
            lastFinishedAt: lastRun.finishedAt,
            lastStatus: lastRun.status,
            lastFetched: lastRun.fetched,
            lastImported: lastRun.imported,
            lastUpdated: lastRun.updated,
            lastSkipped: lastRun.skipped,
            lastOffsetStart: lastRun.offsetStart,
            lastOffsetEnd: lastRun.offsetEnd,
            lastError: lastRun.errorText,
          }
        : null,
      totalFmcsaCarriers,
      recentRuns: recentRuns.map((r) => ({
        id: r.id,
        startedAt: r.startedAt,
        finishedAt: r.finishedAt,
        status: r.status,
        fetched: r.fetched,
        imported: r.imported,
        updated: r.updated,
        skipped: r.skipped,
        offsetStart: r.offsetStart,
        offsetEnd: r.offsetEnd,
        totalCarriersAfter: r.totalCarriersAfter,
        errorText: r.errorText,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      error: "Failed to fetch FMCSA sync status",
    });
  }
}
