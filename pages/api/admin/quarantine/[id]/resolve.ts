import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { z } from "zod";

const resolveSchema = z.object({
  action: z.enum(["ATTACH_LOAD", "ATTACH_CARRIER", "DISCARD", "RESOLVE"]),
  loadId: z.number().optional(),
  carrierId: z.number().optional(),
  notes: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userId = parseInt((session.user as unknown as { id?: string }).id || "0", 10);
  const userRole = (session.user as unknown as { role?: string }).role;
  if (!["CEO", "ADMIN", "SUPER_ADMIN"].includes(userRole || "")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;
  const quarantineId = parseInt(id as string, 10);

  if (isNaN(quarantineId)) {
    return res.status(400).json({ error: "Invalid ID" });
  }

  const parsed = resolveSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
  }

  const { action, loadId, carrierId, notes } = parsed.data;

  const item = await prisma.webhookQuarantine.findUnique({ where: { id: quarantineId } });
  if (!item) {
    return res.status(404).json({ error: "Not found" });
  }

  if (item.status !== "PENDING") {
    return res.status(400).json({ error: "Item already resolved" });
  }

  let status = "RESOLVED";
  const updateData: Record<string, unknown> = {
    resolvedAt: new Date(),
    resolvedById: userId,
    notes: notes || item.notes,
  };

  if (action === "ATTACH_LOAD") {
    if (!loadId) {
      return res.status(400).json({ error: "loadId required for ATTACH_LOAD" });
    }
    const load = await prisma.load.findUnique({ where: { id: loadId } });
    if (!load) {
      return res.status(400).json({ error: "Load not found" });
    }
    updateData.attachedLoadId = loadId;
    status = "ATTACHED";
  } else if (action === "ATTACH_CARRIER") {
    if (!carrierId) {
      return res.status(400).json({ error: "carrierId required for ATTACH_CARRIER" });
    }
    const carrier = await prisma.carrier.findUnique({ where: { id: carrierId } });
    if (!carrier) {
      return res.status(400).json({ error: "Carrier not found" });
    }
    updateData.attachedCarrierId = carrierId;
    status = "ATTACHED";
  } else if (action === "DISCARD") {
    status = "DISCARDED";
  }

  updateData.status = status;

  const updated = await prisma.webhookQuarantine.update({
    where: { id: quarantineId },
    data: updateData,
  });

  return res.status(200).json(updated);
}
