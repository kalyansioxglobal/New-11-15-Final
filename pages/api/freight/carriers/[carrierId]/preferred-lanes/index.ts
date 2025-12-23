import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { requireUser } from "@/lib/apiAuth";
import prisma from "@/lib/prisma";

const CreateLaneSchema = z.object({
  origin: z.string().min(1),
  destination: z.string().min(1),
  radius: z.number().int().optional(),
});

function isAllowedRole(role: string): boolean {
  return ["CEO", "ADMIN", "COO", "DISPATCHER", "CSR", "VENTURE_HEAD"].includes(role);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  if (!isAllowedRole(user.role)) return res.status(403).json({ error: "FORBIDDEN" });

  const { carrierId } = req.query;
  if (!carrierId || typeof carrierId !== "string") return res.status(400).json({ error: "carrierId is required" });
  const carrierIdInt = parseInt(carrierId, 10);
  if (isNaN(carrierIdInt)) return res.status(400).json({ error: "carrierId must be an integer" });

  try {
    if (req.method === "GET") {
      const lanes = await prisma.carrierPreferredLane.findMany({ where: { carrierId: carrierIdInt }, orderBy: { createdAt: "desc" } });
      return res.json({ lanes });
    }

    if (req.method === "POST") {
      const parsed = CreateLaneSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid body", details: parsed.error.errors });

      const lane = await prisma.carrierPreferredLane.create({ data: { carrierId: carrierIdInt, origin: parsed.data.origin, destination: parsed.data.destination, radius: parsed.data.radius ?? 200 } });
      return res.status(201).json({ lane });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("/api/freight/carriers/[carrierId]/preferred-lanes error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
