import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/apiAuth";
import { isGlobalAdmin } from "@/lib/scope";
import { syncFmcsaCarriersBulk } from "@/lib/logistics/fmcsaSync";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  if (!isGlobalAdmin(user)) {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }

  const body = req.body || {};
  const limit = typeof body.limit === "number" ? body.limit : 2000;
  const offset = typeof body.offset === "number" ? body.offset : 0;

  const log = await prisma.fmcsaSyncLog.create({
    data: {
      offsetStart: offset,
      limit,
      status: "running",
    },
  });

  try {
    const result = await syncFmcsaCarriersBulk({ limit, offset });

    const totalCarriers = await prisma.carrier.count({
      where: { fmcsaLastSyncAt: { not: null } },
    });

    await prisma.fmcsaSyncLog.update({
      where: { id: log.id },
      data: {
        finishedAt: new Date(),
        offsetEnd: result.nextOffset ?? null,
        fetched: result.fetched,
        imported: result.imported,
        updated: result.updated,
        skipped: result.skipped,
        status: "success",
        totalCarriersAfter: totalCarriers,
      },
    });

    return res.status(200).json({
      ok: true,
      logId: log.id,
      fetched: result.fetched,
      imported: result.imported,
      updated: result.updated,
      skipped: result.skipped,
      nextOffset: result.nextOffset,
    });
  } catch (err: any) {
    logger.error("fmcsa_sync_api_error", {
      meta: { error: err.message, stack: err.stack },
    });

    await prisma.fmcsaSyncLog.update({
      where: { id: log.id },
      data: {
        finishedAt: new Date(),
        status: "error",
        errorText: err instanceof Error ? err.message : String(err),
      },
    });

    const errorMessage = err.message?.includes("FMCSA_FULL_FILE")
      ? err.message
      : "FMCSA sync failed";

    return res.status(500).json({
      ok: false,
      error: errorMessage,
    });
  }
}
