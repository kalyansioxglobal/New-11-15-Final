import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../lib/prisma";
import { requireAdminUser } from "../../../../lib/authGuard";
import { DEFAULT_PERMISSION_MATRIX, PermissionMatrixJson } from "../../../../lib/permissions";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const context = await requireAdminUser(req, res);
  if (!context) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).end();
    return;
  }

  try {
    let globalMatrix: PermissionMatrixJson = DEFAULT_PERMISSION_MATRIX;

    const globalRecord = await prisma.permissionMatrix.findUnique({ where: { id: 1 } });
    if (globalRecord) {
      globalMatrix = globalRecord.json as PermissionMatrixJson;
    }

    const ventureOverrides = await prisma.venturePermissionOverride.findMany({
      where: { isActive: true },
      include: {
        venture: { select: { id: true, name: true, type: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { venture: { name: "asc" } },
    });

    const ventures = await prisma.venture.findMany({
      where: { isActive: true, isTest: false },
      select: { id: true, name: true, type: true },
      orderBy: { name: "asc" },
    });

    res.json({
      matrix: globalMatrix,
      ventureOverrides: ventureOverrides.map((vo: typeof ventureOverrides[number]) => ({
        ventureId: vo.ventureId,
        ventureName: vo.venture.name,
        ventureType: vo.venture.type,
        roleOverrides: vo.roleOverrides,
        isActive: vo.isActive,
        createdBy: vo.createdBy ? { id: vo.createdBy.id, name: vo.createdBy.fullName || vo.createdBy.email } : null,
        createdAt: vo.createdAt,
        updatedAt: vo.updatedAt,
      })),
      ventures,
      defaultMatrix: DEFAULT_PERMISSION_MATRIX,
    });
  } catch (err: any) {
    console.error("Error fetching permissions:", err);
    res.status(500).json({ error: "Failed to fetch permissions", detail: err.message });
  }
}
