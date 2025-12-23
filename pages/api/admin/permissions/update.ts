import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../lib/prisma";
import { requireAdminUser } from "../../../../lib/authGuard";
import { PermissionMatrixJson } from "../../../../lib/permissions";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const context = await requireAdminUser(req, res);
  if (!context) return;

  if (req.method !== "PUT") {
    res.setHeader("Allow", "PUT");
    res.status(405).end();
    return;
  }

  const { matrix } = req.body as { matrix: PermissionMatrixJson };

  if (!matrix) {
    res.status(400).json({ error: "matrix is required." });
    return;
  }

  try {
    const oldRecord = await prisma.permissionMatrix.findUnique({ where: { id: 1 } });

    const updated = await prisma.permissionMatrix.upsert({
      where: { id: 1 },
      update: { json: matrix },
      create: { id: 1, json: matrix },
    });

    await prisma.auditLog.create({
      data: {
        userId: context.dbUser.id,
        userRole: context.dbUser.role,
        domain: "permissions",
        action: oldRecord ? "update" : "create",
        entityType: "PermissionMatrix",
        entityId: "1",
        metadata: {
          previousValue: oldRecord?.json ?? null,
          newValue: matrix,
          changedBy: context.dbUser.email,
        },
      },
    });

    res.json({ matrix: updated.json });
  } catch (err: any) {
    console.error("Error updating permissions:", err);
    res.status(500).json({ error: "Failed to update permissions", detail: err.message });
  }
}
