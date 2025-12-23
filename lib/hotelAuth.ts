import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "./prisma";
import { getEffectiveUser } from "./effectiveUser";
import { DEFAULT_PERMISSION_MATRIX, PermissionMatrixJson } from "./permissions";

export async function requireHotelAccess(req: NextApiRequest, res: NextApiResponse) {
  const effectiveUser = await getEffectiveUser(req, res);
  if (!effectiveUser) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: effectiveUser.id },
  });

  if (!dbUser) {
    res.status(401).json({ error: "User not found" });
    return null;
  }

  let matrix: PermissionMatrixJson = DEFAULT_PERMISSION_MATRIX;
  const record = await prisma.permissionMatrix.findUnique({ where: { id: 1 } });
  if (record) matrix = record.json as PermissionMatrixJson;

  const hotelPerm = matrix[dbUser.role]?.hotels ?? "none";
  if (hotelPerm === "none") {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }

  return { dbUser, matrix, hotelPerm };
}
