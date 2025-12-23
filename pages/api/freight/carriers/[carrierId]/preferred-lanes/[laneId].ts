import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/apiAuth";
import prisma from "@/lib/prisma";

function isAllowedRole(role: string): boolean {
  return ["CEO", "ADMIN", "COO", "DISPATCHER", "CSR", "VENTURE_HEAD"].includes(role);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  if (!isAllowedRole(user.role)) return res.status(403).json({ error: "FORBIDDEN" });

  const { carrierId, laneId } = req.query;
  if (!carrierId || typeof carrierId !== "string") return res.status(400).json({ error: "carrierId is required" });
  if (!laneId || typeof laneId !== "string") return res.status(400).json({ error: "laneId is required" });

  const carrierIdInt = parseInt(carrierId, 10);
  const laneIdInt = parseInt(laneId, 10);
  if (isNaN(carrierIdInt) || isNaN(laneIdInt)) return res.status(400).json({ error: "Invalid ids" });

  try {
    if (req.method === "DELETE") {
      await prisma.carrierPreferredLane.deleteMany({ where: { id: laneIdInt, carrierId: carrierIdInt } });
      return res.json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("/api/freight/carriers/[carrierId]/preferred-lanes/[laneId] error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
