import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from "@/lib/scope";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) {
    return res.status(401).json({ error: "UNAUTHENTICATED" });
  }

  const scope = getUserScope(user);

  const ventureWhere: any = {
    isActive: true,
    type: { in: ["LOGISTICS", "TRANSPORT"] },
  };
  if (!scope.allVentures && scope.ventureIds.length > 0) {
    ventureWhere.id = { in: scope.ventureIds };
  }

  const officeWhere: any = { isActive: true };
  if (!scope.allOffices && scope.officeIds.length > 0) {
    officeWhere.id = { in: scope.officeIds };
  }

  const [ventures, offices] = await Promise.all([
    prisma.venture.findMany({
      where: ventureWhere,
      select: { id: true, name: true, type: true },
      orderBy: { name: "asc" },
    }),
    prisma.office.findMany({
      where: officeWhere,
      select: { id: true, name: true, ventureId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return res.json({ ventures, offices });
}
