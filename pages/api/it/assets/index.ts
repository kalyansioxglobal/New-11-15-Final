import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";
import { getUserScope } from "@/lib/scope";
import { UserRole } from "@prisma/client";
import { logAuditEvent } from "@/lib/audit";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return res.status(401).json({ error: "UNAUTHENTICATED" });

  if (req.method === "GET") {
    try {
      const scope = getUserScope(user);
      const { page = "1", pageSize = "50", status, type, assignedToUserId, me, search, ventureId, officeId } =
        req.query;

      const pageNumRaw = parseInt(String(page), 10);
      const pageSizeParsed = parseInt(String(pageSize), 10);

      const pageNum = Number.isFinite(pageNumRaw) && pageNumRaw > 0 ? pageNumRaw : 1;
      const take =
        Number.isFinite(pageSizeParsed) && pageSizeParsed > 0 && pageSizeParsed <= 200
          ? pageSizeParsed
          : 50;
      const skip = (pageNum - 1) * take;

      const where: any = {};

      const employeeRoles: UserRole[] = ["EMPLOYEE", "CONTRACTOR", "CSR", "DISPATCHER", "CARRIER_TEAM"];
      const isEmployeeLike = employeeRoles.includes(user.role as UserRole);

      // Venture/office scoping (bypassed for employee-like users who are clamped to their own assets)
      if (ventureId && !isEmployeeLike) {
        const vId = Number(ventureId);
        if (!Number.isNaN(vId)) {
          if (!scope.allVentures && !scope.ventureIds.includes(vId)) {
            return res.status(403).json({ error: "FORBIDDEN_VENTURE" });
          }
          where.ventureId = vId;
        }
      } else if (!scope.allVentures && scope.ventureIds.length > 0 && !isEmployeeLike) {
        where.ventureId = { in: scope.ventureIds };
      }

      if (officeId && !isEmployeeLike) {
        const oId = Number(officeId);
        if (!Number.isNaN(oId)) {
          if (!scope.allOffices && !scope.officeIds.includes(oId)) {
            return res.status(403).json({ error: "FORBIDDEN_OFFICE" });
          }
          where.officeId = oId;
        }
      } else if (!scope.allOffices && scope.officeIds.length > 0 && !isEmployeeLike) {
        where.officeId = { in: scope.officeIds };
      }

      // Employee self-view and clamp
      if (isEmployeeLike) {
        where.assignedToUserId = user.id;
      } else if (me === "true") {
        where.assignedToUserId = user.id;
      } else if (assignedToUserId) {
        const assignedId = Number(assignedToUserId);
        if (!Number.isNaN(assignedId)) {
          where.assignedToUserId = assignedId;
        }
      }

      if (status && typeof status === "string") {
        where.status = status.toUpperCase();
      }

      if (type && typeof type === "string") {
        where.type = type;
      }

      if (search && typeof search === "string" && search.trim().length > 0) {
        const q = search.trim();
        where.OR = [
          { tag: { contains: q, mode: "insensitive" } },
          { serialNumber: { contains: q, mode: "insensitive" } },
          { make: { contains: q, mode: "insensitive" } },
          { model: { contains: q, mode: "insensitive" } },
        ];
      }

      const [assets, total] = await Promise.all([
        prisma.iTAsset.findMany({
          where,
          include: {
            assignedToUser: { select: { id: true, fullName: true } },
            venture: { select: { id: true, name: true } },
            office: { select: { id: true, name: true } },
          },
          orderBy: { id: "desc" },
          skip,
          take,
        }),
        prisma.iTAsset.count({ where }),
      ]);

      return res.status(200).json({
        items: assets,
        page: pageNum,
        pageSize: take,
        total,
        totalPages: Math.ceil(total / take) || 1,
      });
    } catch (err: any) {
      console.error("IT assets list error", err);
      return res.status(500).json({ error: "Internal server error", detail: err.message || String(err) });
    }
  }

  if (req.method === "POST") {
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

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Method not allowed" });
}
