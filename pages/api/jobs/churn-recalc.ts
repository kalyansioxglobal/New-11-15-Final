import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/apiAuth";
import { isGlobalAdmin } from "@/lib/scope";
import { runChurnRecalcJob } from "@/lib/jobs/churnRecalcJob";

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

  try {
    const result = await runChurnRecalcJob({ ventureId, dryRun });
    return res.status(200).json({
      ok: true,
      stats: result.stats,
      jobRunLogId: result.jobRunLogId,
      dryRun,
    });
  } catch (err: any) {
    console.error("/api/jobs/churn-recalc error", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
