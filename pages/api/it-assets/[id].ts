import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";
import { getUserScope } from "@/lib/scope";
import { logAuditEvent } from "@/lib/audit";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return res.status(401).json({ error: "UNAUTHENTICATED" });

  const id = Number(req.query.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const scope = getUserScope(user);

  if (req.method === "GET") {
    try {
      const asset = await prisma.iTAsset.findUnique({
        where: { id },
        include: {
          assignedToUser: { select: { id: true, fullName: true } },
          venture: { select: { id: true, name: true } },
          office: { select: { id: true, name: true } },
          files: true,
          history: {
            orderBy: { createdAt: "desc" },
          },
          incidents: {
            include: {
              reporterUser: { select: { id: true, fullName: true } },
              assignedToUser: { select: { id: true, fullName: true } },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!asset) return res.status(404).json({ error: "Not found" });

      // Enforce scope: user must have access to this venture/office unless global
      if (
        (!scope.allVentures && asset.ventureId && !scope.ventureIds.includes(asset.ventureId)) ||
        (!scope.allOffices && asset.officeId && !scope.officeIds.includes(asset.officeId))
      ) {
        return res.status(403).json({ error: "FORBIDDEN" });
      }

      return res.json(asset);
    } catch (err: any) {
      console.error("IT asset detail error", err);
      return res.status(500).json({ error: "Internal server error", detail: err.message || String(err) });
    }
  }

  if (req.method === "PATCH") {
    try {
      const existing = await prisma.iTAsset.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: "Not found" });

      if (
        (!scope.allVentures && existing.ventureId && !scope.ventureIds.includes(existing.ventureId)) ||
        (!scope.allOffices && existing.officeId && !scope.officeIds.includes(existing.officeId))
      ) {
        return res.status(403).json({ error: "FORBIDDEN" });
      }

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
      } = req.body;

      const data: any = {};
      if (tag !== undefined) data.tag = tag;
      if (type !== undefined) data.type = type;
      if (make !== undefined) data.make = make || null;
      if (model !== undefined) data.model = model || null;
      if (serialNumber !== undefined) data.serialNumber = serialNumber || null;
      if (status !== undefined) data.status = status.toUpperCase();
      if (purchaseDate !== undefined) {
        data.purchaseDate = purchaseDate ? new Date(purchaseDate) : null;
      }
      if (warrantyExpiry !== undefined) {
        data.warrantyExpiry = warrantyExpiry ? new Date(warrantyExpiry) : null;
      }
      if (notes !== undefined) data.notes = notes || null;

      if (assignedToUserId !== undefined) {
        data.assignedToUserId = assignedToUserId ? Number(assignedToUserId) : null;
        data.assignedSince = assignedSince ? new Date(assignedSince) : new Date();
      }

      const updated = await prisma.iTAsset.update({
        where: { id },
        data,
      });

      await logAuditEvent(req, user, {
        domain: "admin",
        action: "IT_ASSET_UPDATE",
        entityType: "IT_ASSET",
        entityId: updated.id,
        metadata: { before: existing, after: updated },
      });

      return res.json(updated);
    } catch (err: any) {
      console.error("IT asset update error", err);
      return res
        .status(500)
        .json({ error: "Internal server error", detail: err.message || String(err) });
    }
  }

  if (req.method === "DELETE") {
    try {
      const existing = await prisma.iTAsset.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: "Not found" });

      if (
        (!scope.allVentures && existing.ventureId && !scope.ventureIds.includes(existing.ventureId)) ||
        (!scope.allOffices && existing.officeId && !scope.officeIds.includes(existing.officeId))
      ) {
        return res.status(403).json({ error: "FORBIDDEN" });
      }

      const updated = await prisma.iTAsset.update({
        where: { id },
        data: { status: "RETIRED" },
      });

      await logAuditEvent(req, user, {
        domain: "admin",
        action: "IT_ASSET_RETIRE",
        entityType: "IT_ASSET",
        entityId: updated.id,
        metadata: { before: existing, after: updated },
      });

      return res.json(updated);
    } catch (err: any) {
      console.error("IT asset retire error", err);
      return res
        .status(500)
        .json({ error: "Internal server error", detail: err.message || String(err) });
    }
  }

  res.setHeader("Allow", ["GET", "PATCH", "DELETE"]);
  return res.status(405).json({ error: "Method not allowed" });
}
