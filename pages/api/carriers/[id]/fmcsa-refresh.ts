import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/apiAuth";
import { withRequestLogging } from "@/lib/requestLog";
import { syncCarrierFromFMCSAById } from "@/lib/logistics/fmcsaSync";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  const { id } = req.query;
  const carrierId = parseInt(id as string, 10);
  if (!id || Number.isNaN(carrierId)) {
    return res.status(400).json({ error: "carrier id is required" });
  }

  withRequestLogging(req, res, { user, ventureId: null, officeId: null }, {
    endpoint: "/carriers/[id]/fmcsa-refresh",
  });

  try {
    const snapshot = await syncCarrierFromFMCSAById(carrierId);
    if (!snapshot) {
      return res.status(404).json({ error: "Carrier not found or missing MC number" });
    }
    return res.status(200).json({ snapshot });
  } catch (err: any) {
    console.error("/api/carriers/[id]/fmcsa-refresh error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
