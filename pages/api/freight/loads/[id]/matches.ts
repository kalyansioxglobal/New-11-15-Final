import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/apiAuth";
import { getMatchesForLoad } from "@/lib/logistics/matching";

function isAllowedRole(role: string): boolean {
  return ["CEO", "ADMIN", "COO", "DISPATCHER", "CSR", "VENTURE_HEAD"].includes(role);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await requireUser(req, res);
  if (!user) return;

  if (!isAllowedRole(user.role)) return res.status(403).json({ error: "FORBIDDEN" });

  const { id, onlyAuthorized, maxResults, includeFmcsaHealth, minOnTimePercentage, maxDistance, requireEquipmentMatch } = req.query;
  if (!id || typeof id !== "string") return res.status(400).json({ error: "id is required" });
  const loadId = parseInt(id, 10);
  if (isNaN(loadId)) return res.status(400).json({ error: "id must be an integer" });

  // Parse query parameters for matching options
  const options: any = {};
  
  if (onlyAuthorized === "true") {
    options.onlyAuthorizedCarriers = true;
  }
  
  if (maxResults && typeof maxResults === "string") {
    const parsed = parseInt(maxResults, 10);
    if (!isNaN(parsed) && parsed > 0) options.maxResults = parsed;
  }
  
  if (includeFmcsaHealth === "false") {
    options.includeFmcsaHealth = false;
  }
  
  if (minOnTimePercentage && typeof minOnTimePercentage === "string") {
    const parsed = parseFloat(minOnTimePercentage);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) options.minOnTimePercentage = parsed;
  }
  
  if (maxDistance && typeof maxDistance === "string") {
    const parsed = parseInt(maxDistance, 10);
    if (!isNaN(parsed) && parsed > 0) options.maxDistance = parsed;
  }
  
  if (requireEquipmentMatch === "true") {
    options.requireEquipmentMatch = true;
  }

  try {
    const results = await getMatchesForLoad(loadId, options);
    return res.json(results);
  } catch (err: any) {
    console.error("/api/freight/loads/[id]/matches error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
