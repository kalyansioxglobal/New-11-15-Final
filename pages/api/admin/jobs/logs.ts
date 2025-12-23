import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/apiAuth";
import { isGlobalAdmin } from "@/lib/scope";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  if (!isGlobalAdmin(user)) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }

  try {
    const logs = await prisma.jobRunLog.findMany({
      orderBy: { startedAt: "desc" },
      take: 50,
    });

    return res.status(200).json({
      logs: logs.map((log) => ({
        id: log.id,
        jobType: log.jobName,
        status: log.status,
        startedAt: log.startedAt.toISOString(),
        finishedAt: log.endedAt?.toISOString() || null,
        stats: log.statsJson ? JSON.parse(log.statsJson) : null,
        errorMessage: log.error || null,
      })),
    });
  } catch (err: any) {
    console.error("/api/admin/jobs/logs error", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
