import prisma from "@/lib/prisma";
import { DEFAULT_PERMISSION_MATRIX, PermissionMatrixJson } from "@/lib/permissions";

export async function getPermissionsData() {
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

  return {
    globalMatrix,
    ventureOverrides: ventureOverrides.map((vo) => ({
      ventureId: vo.ventureId,
      ventureName: vo.venture.name,
      ventureType: vo.venture.type,
      roleOverrides: vo.roleOverrides,
      isActive: vo.isActive,
      createdBy: vo.createdBy ? { id: vo.createdBy.id, name: vo.createdBy.fullName || vo.createdBy.email } : null,
      createdAt: vo.createdAt.toISOString(),
      updatedAt: vo.updatedAt.toISOString(),
    })),
    ventures: ventures.map((v) => ({ id: v.id, name: v.name, type: v.type })),
    defaultMatrix: DEFAULT_PERMISSION_MATRIX,
  };
}
