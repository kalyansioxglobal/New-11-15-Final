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

  const { shipperId, laneId } = req.query;
  if (!shipperId || typeof shipperId !== "string") return res.status(400).json({ error: "shipperId is required" });
  if (!laneId || typeof laneId !== "string") return res.status(400).json({ error: "laneId is required" });

  const shipperIdInt = parseInt(shipperId, 10);
  const laneIdInt = parseInt(laneId, 10);
  if (isNaN(shipperIdInt) || isNaN(laneIdInt)) return res.status(400).json({ error: "Invalid ids" });

  try {
    if (req.method === "DELETE") {
      await prisma.shipperPreferredLane.deleteMany({ where: { id: laneIdInt, shipperId: shipperIdInt } });
      return res.json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("/api/freight/shippers/[shipperId]/preferred-lanes/[laneId] error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
