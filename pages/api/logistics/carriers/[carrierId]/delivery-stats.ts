import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/apiAuth";
import { getCarrierDeliveryStats } from "@/lib/logistics/deliveryStats";

function isAllowedRole(role: string): boolean {
  return ["CEO", "ADMIN", "COO", "DISPATCHER", "CSR", "VENTURE_HEAD"].includes(role);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await requireUser(req, res);
  if (!user) return;

  if (!isAllowedRole(user.role)) return res.status(403).json({ error: "FORBIDDEN" });

  const { carrierId, ventureId, since } = req.query;
  if (!carrierId || typeof carrierId !== "string") return res.status(400).json({ error: "carrierId is required" });
  const carrierIdNum = parseInt(carrierId, 10);
  if (isNaN(carrierIdNum)) return res.status(400).json({ error: "carrierId must be an integer" });

  // Parse optional parameters
  const options: any = {};
  
  if (ventureId && typeof ventureId === "string") {
    const parsed = parseInt(ventureId, 10);
    if (!isNaN(parsed)) options.ventureId = parsed;
  }
  
  if (since && typeof since === "string") {
    const parsedDate = new Date(since);
    if (!isNaN(parsedDate.getTime())) options.since = parsedDate;
  }

  try {
    const stats = await getCarrierDeliveryStats(carrierIdNum, options);
    return res.json(stats);
  } catch (err: any) {
    console.error("/api/logistics/carriers/[id]/delivery-stats error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}