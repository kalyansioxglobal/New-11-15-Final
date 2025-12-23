import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireLeadership } from "@/lib/apiAuth";
import { logAuditEvent } from "@/lib/audit";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireLeadership(req, res);
  if (!user) return;

  if (req.method !== "POST") return res.status(405).end();

  try {
    const { assetId, notes } = req.body;

    const id = Number(assetId);
    if (!id) {
      return res.status(400).json({ error: "VALIDATION_ERROR", detail: "assetId is required" });
    }

    const existing = await prisma.iTAsset.findUnique({
      where: { id },
    });

    if (!existing) return res.status(404).json({ error: "Asset not found" });

    const asset = await prisma.iTAsset.update({
      where: { id },
      data: {
        assignedToUserId: null,
        assignedSince: null,
        status: "AVAILABLE",
        history: {
          create: {
            action: "RETURNED",
            fromUserId: existing.assignedToUserId,
            notes: notes || null,
          },
        },
      },
    });

    await logAuditEvent(req, user, {
      domain: "admin",
      action: "IT_ASSET_RETURN",
      entityType: "IT_ASSET",
      entityId: asset.id,
      metadata: { before: existing, after: asset },
    });

    res.json(asset);
  } catch (err: any) {
    console.error("IT asset return error", err);
    res.status(500).json({ error: "Internal server error", detail: err.message || String(err) });
  }
}
