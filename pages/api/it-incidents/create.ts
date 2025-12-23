import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { withUser } from "@/lib/api";
import { logAuditEvent } from "@/lib/audit";

export default withUser(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  user
) {
  if (req.method !== "POST") return res.status(405).end();

  const {
    assetId,
    title,
    description,
    severity,
    category,
    assignedToUserId,
  } = req.body;

  if (!title) {
    return res.status(400).json({ error: "VALIDATION_ERROR", detail: "title is required" });
  }

  let asset = null as any;
  let ventureId: number | null = null;
  let officeId: number | null = null;

  if (assetId) {
    const aId = Number(assetId);
    if (!Number.isNaN(aId)) {
      asset = await prisma.iTAsset.findUnique({ where: { id: aId } });
      if (!asset) {
        return res.status(400).json({ error: "INVALID_ASSET", detail: "Asset not found" });
      }
      ventureId = asset.ventureId;
      officeId = asset.officeId;
    }
  }

  const incident = await prisma.iTIncident.create({
    data: {
      ventureId: ventureId ?? user.ventureIds[0] ?? 0,
      officeId: officeId ?? user.officeIds[0] ?? null,
      assetId: asset ? asset.id : null,
      title,
      description: description || null,
      status: "OPEN",
      severity: (severity || "LOW").toUpperCase(),
      category: category || null,
      reporterUserId: user.id,
      assignedToUserId: assignedToUserId ? Number(assignedToUserId) : null,
    },
    include: {
      asset: { select: { id: true, tag: true, type: true } },
      reporterUser: { select: { id: true, fullName: true } },
      assignedToUser: { select: { id: true, fullName: true } },
    },
  });

  await logAuditEvent(req, user, {
    domain: "admin",
    action: "IT_INCIDENT_CREATE",
    entityType: "IT_INCIDENT",
    entityId: incident.id,
    metadata: { incident },
  });

  res.json(incident);
});
