import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../../lib/prisma";
import { getAuthUser } from "../../../../../lib/authGuard";
import { isSuperAdmin, isVentureHead, UserRole, canManageUsersMatrix, DEFAULT_PERMISSION_MATRIX, PermissionMatrixJson } from "../../../../../lib/permissions";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const dbUser = await getAuthUser(req, res);
  if (!dbUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let matrix: PermissionMatrixJson = DEFAULT_PERMISSION_MATRIX;
  const matrixRecord = await prisma.permissionMatrix.findUnique({ where: { id: 1 } });
  if (matrixRecord) matrix = matrixRecord.json as PermissionMatrixJson;

  if (!canManageUsersMatrix(dbUser.role, matrix)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const ventureId = parseInt(req.query.ventureId as string, 10);
  if (isNaN(ventureId)) {
    res.status(400).json({ error: "Invalid ventureId" });
    return;
  }

  const venture = await prisma.venture.findUnique({
    where: { id: ventureId },
    select: { id: true, name: true, type: true },
  });

  if (!venture) {
    res.status(404).json({ error: "Venture not found" });
    return;
  }

  const userRole = dbUser.role as UserRole;
  const isAdmin = isSuperAdmin(userRole);
  const isVentureManager = isVentureHead({ role: userRole });
  const userVentureIds = dbUser.ventures?.map((v) => v.ventureId) || [];
  const hasVentureAccess = userVentureIds.includes(ventureId);

  if (!isAdmin && !(isVentureManager && hasVentureAccess)) {
    res.status(403).json({ error: "Insufficient permissions for this venture" });
    return;
  }

  switch (req.method) {
    case "GET":
      return handleGet(res, ventureId, venture);
    case "PUT":
      return handlePut(req, res, ventureId, venture, dbUser);
    case "DELETE":
      if (!isAdmin) {
        res.status(403).json({ error: "Only admins can delete venture overrides" });
        return;
      }
      return handleDelete(res, ventureId, venture, dbUser);
    default:
      res.setHeader("Allow", "GET, PUT, DELETE");
      res.status(405).end();
  }
}

async function handleGet(
  res: NextApiResponse,
  ventureId: number,
  venture: { id: number; name: string; type: string }
) {
  const override = await prisma.venturePermissionOverride.findUnique({
    where: { ventureId },
    include: {
      createdBy: { select: { id: true, fullName: true, email: true } },
    },
  });

  res.json({
    ventureId,
    ventureName: venture.name,
    ventureType: venture.type,
    roleOverrides: override?.roleOverrides ?? null,
    isActive: override?.isActive ?? false,
    createdBy: override?.createdBy
      ? { id: override.createdBy.id, name: override.createdBy.fullName || override.createdBy.email }
      : null,
    createdAt: override?.createdAt ?? null,
    updatedAt: override?.updatedAt ?? null,
  });
}

async function handlePut(
  req: NextApiRequest,
  res: NextApiResponse,
  ventureId: number,
  venture: { id: number; name: string; type: string },
  dbUser: { id: number; email: string; role: UserRole }
) {
  const { roleOverrides, isActive = true } = req.body;

  if (!roleOverrides || typeof roleOverrides !== "object") {
    res.status(400).json({ error: "roleOverrides object is required" });
    return;
  }

  try {
    const existingOverride = await prisma.venturePermissionOverride.findUnique({
      where: { ventureId },
    });

    const updated = await prisma.venturePermissionOverride.upsert({
      where: { ventureId },
      update: { roleOverrides, isActive },
      create: { ventureId, roleOverrides, isActive, createdById: dbUser.id },
    });

    await prisma.auditLog.create({
      data: {
        userId: dbUser.id,
        userRole: dbUser.role,
        ventureId,
        domain: "permissions",
        action: existingOverride ? "update_venture_override" : "create_venture_override",
        entityType: "VenturePermissionOverride",
        entityId: String(ventureId),
        metadata: {
          ventureName: venture.name,
          previousValue: existingOverride?.roleOverrides ?? null,
          newValue: roleOverrides,
          changedBy: dbUser.email,
        },
      },
    });

    res.json({
      ventureId,
      ventureName: venture.name,
      roleOverrides: updated.roleOverrides,
      isActive: updated.isActive,
      updatedAt: updated.updatedAt,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Error updating venture permission override:", err);
    res.status(500).json({ error: "Failed to update venture permission override", detail: errorMessage });
  }
}

async function handleDelete(
  res: NextApiResponse,
  ventureId: number,
  venture: { id: number; name: string; type: string },
  dbUser: { id: number; email: string; role: UserRole }
) {
  try {
    const existingOverride = await prisma.venturePermissionOverride.findUnique({
      where: { ventureId },
    });

    if (!existingOverride) {
      res.status(404).json({ error: "No override found for this venture" });
      return;
    }

    await prisma.venturePermissionOverride.delete({
      where: { ventureId },
    });

    await prisma.auditLog.create({
      data: {
        userId: dbUser.id,
        userRole: dbUser.role,
        ventureId,
        domain: "permissions",
        action: "delete_venture_override",
        entityType: "VenturePermissionOverride",
        entityId: String(ventureId),
        metadata: {
          ventureName: venture.name,
          previousValue: existingOverride.roleOverrides,
          changedBy: dbUser.email,
        },
      },
    });

    res.json({ success: true, message: "Venture permission override deleted" });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Error deleting venture permission override:", err);
    res.status(500).json({ error: "Failed to delete venture permission override", detail: errorMessage });
  }
}
