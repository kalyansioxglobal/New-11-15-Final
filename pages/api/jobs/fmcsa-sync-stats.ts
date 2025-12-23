import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/apiAuth";
import { isGlobalAdmin } from "@/lib/scope";
import prisma from "@/lib/prisma";

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
    const [totalWithMc, syncedCount, lastSync] = await Promise.all([
      prisma.carrier.count({ where: { mcNumber: { not: null } } }),
      prisma.carrier.count({ where: { fmcsaLastSyncAt: { not: null } } }),
      prisma.carrier.findFirst({
        where: { fmcsaLastSyncAt: { not: null } },
        orderBy: { fmcsaLastSyncAt: "desc" },
        select: { fmcsaLastSyncAt: true },
      }),
    ]);

    return res.status(200).json({
      totalWithMc,
      syncedCount,
      lastSyncAt: lastSync?.fmcsaLastSyncAt || null,
    });
  } catch (err: any) {
    console.error("/api/jobs/fmcsa-sync-stats error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
