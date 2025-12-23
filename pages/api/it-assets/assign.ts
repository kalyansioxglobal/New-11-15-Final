import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireLeadership } from "@/lib/apiAuth";
import { logAuditEvent } from "@/lib/audit";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireLeadership(req, res);
  if (!user) return;

  if (req.method !== "POST") return res.status(405).end();

  try {
    const { assetId, userId } = req.body;

    const id = Number(assetId);
    const assigneeId = Number(userId);

    if (!id || !assigneeId) {
      return res.status(400).json({ error: "VALIDATION_ERROR", detail: "assetId and userId are required" });
    }

    const existing = await prisma.iTAsset.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Asset not found" });
    }

    const asset = await prisma.iTAsset.update({
      where: { id },
      data: {
        assignedToUserId: assigneeId,
        assignedSince: new Date(),
        status: "ASSIGNED",
        history: {
          create: {
            action: "ASSIGNED",
            fromUserId: existing.assignedToUserId,
            toUserId: assigneeId,
          },
        },
      },
    });

    await logAuditEvent(req, user, {
      domain: "admin",
      action: "IT_ASSET_ASSIGN",
      entityType: "IT_ASSET",
      entityId: asset.id,
      metadata: { before: existing, after: asset },
    });

    res.json(asset);
  } catch (err: any) {
    console.error("IT asset assign error", err);
    res.status(500).json({ error: "Internal server error", detail: err.message || String(err) });
  }
}
