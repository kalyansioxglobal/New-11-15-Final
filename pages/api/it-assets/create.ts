import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";
import { getUserScope, isGlobalAdmin } from "@/lib/scope";
import { logAuditEvent } from "@/lib/audit";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return res.status(401).json({ error: "UNAUTHENTICATED" });

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const scope = getUserScope(user);
    const {
      tag,
      type,
      make,
      model,
      serialNumber,
      status,
      purchaseDate,
      warrantyExpiry,
      assignedToUserId,
      assignedSince,
      notes,
      ventureId,
      officeId,
    } = req.body;

    if (!tag || !type || !ventureId) {
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", detail: "tag, type, and ventureId are required" });
    }

    const vId = Number(ventureId);
    const oId = officeId ? Number(officeId) : null;

    if (!scope.allVentures && !scope.ventureIds.includes(vId)) {
      return res.status(403).json({ error: "FORBIDDEN_VENTURE" });
    }
    if (oId && !scope.allOffices && !scope.officeIds.includes(oId)) {
      return res.status(403).json({ error: "FORBIDDEN_OFFICE" });
    }

    const data: any = {
      tag,
      type,
      ventureId: vId,
      officeId: oId,
      make: make || null,
      model: model || null,
      serialNumber: serialNumber || null,
      status: (status || "AVAILABLE").toUpperCase(),
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
      notes: notes || null,
    };

    if (assignedToUserId) {
      data.assignedToUserId = Number(assignedToUserId);
      data.assignedSince = assignedSince ? new Date(assignedSince) : new Date();
    }

    const asset = await prisma.iTAsset.create({
      data,
    });

    await logAuditEvent(req, user, {
      domain: "admin",
      action: "IT_ASSET_CREATE",
      entityType: "IT_ASSET",
      entityId: asset.id,
      metadata: { asset },
    });

    return res.status(201).json(asset);
  } catch (err: any) {
    console.error("IT asset create error", err);
    return res
      .status(500)
      .json({ error: "Internal server error", detail: err.message || String(err) });
  }
}
