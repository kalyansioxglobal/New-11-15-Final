import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/apiAuth";
import { isGlobalAdmin, getUserScope } from "@/lib/scope";
import { withRequestLogging } from "@/lib/requestLog";
import { runFMCSAAutosyncJob } from "@/lib/jobs/fmcsaAutosyncJob";
import { syncCarrierFromFMCSAById } from "@/lib/logistics/fmcsaSync";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  if (!isGlobalAdmin(user)) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }

  const scope = getUserScope(user);
  withRequestLogging(req, res, { user, ventureId: null, officeId: null }, {
    endpoint: "/jobs/fmcsa-sync",
  });

  const body = (req.body || {}) as {
    carrierId?: number;
    carrierIds?: number[];
    mode?: "all" | "batch" | "single";
  };

  try {
    if (body.carrierId) {
      const snapshot = await syncCarrierFromFMCSAById(body.carrierId);
      return res.status(200).json({ mode: "single", snapshot });
    }

    if (Array.isArray(body.carrierIds) && body.carrierIds.length > 0) {
      const snapshots = [] as any[];
      for (const id of body.carrierIds) {
        const snap = await syncCarrierFromFMCSAById(id);
        snapshots.push(snap);
      }
      return res.status(200).json({ mode: "batch", count: snapshots.length, snapshots });
    }

    // Default to full autosync across all carriers with MC numbers
    await runFMCSAAutosyncJob();
    return res.status(200).json({ mode: "all", scope });
  } catch (err: any) {
    console.error("/api/jobs/fmcsa-sync error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
