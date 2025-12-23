import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from "@/lib/scope";
import { VentureType, UserRole } from "@prisma/client";

const LEADERSHIP_ROLES: UserRole[] = ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "AUDITOR", "FINANCE"];
const IT_ROLES: UserRole[] = ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "HR_ADMIN"];
const ADMIN_ROLES: UserRole[] = ["CEO", "ADMIN", "COO", "HR_ADMIN", "FINANCE"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }

  const user = await requireUser(req, res);
  if (!user) return;

  const scope = getUserScope(user);
  const userRole = user.role as UserRole;

  try {
    let ventures;
    if (scope.allVentures) {
      ventures = await prisma.venture.findMany({
        where: { isActive: true },
        select: { type: true },
      });
    } else {
      ventures = await prisma.venture.findMany({
        where: {
          id: { in: scope.ventureIds },
          isActive: true,
        },
        select: { type: true },
      });
    }

    const types = [...new Set(ventures.map((v) => v.type))];

    const sectionMap: Record<VentureType, string> = {
      LOGISTICS: "freight",
      TRANSPORT: "freight",
      HOSPITALITY: "hospitality",
      BPO: "bpo",
      SAAS: "saas",
      HOLDINGS: "holdings",
      TESTING: "command_center",
    };

    const accessibleSections = [...new Set(types.map((t: VentureType) => sectionMap[t]))];
    
    const alwaysVisible: string[] = ["command_center"];
    
    if (LEADERSHIP_ROLES.includes(userRole) || types.length > 0) {
      alwaysVisible.push("operations");
    }
    
    if (IT_ROLES.includes(userRole)) {
      alwaysVisible.push("it");
    }
    
    if (ADMIN_ROLES.includes(userRole)) {
      alwaysVisible.push("admin");
    }
    
    const allAccessible = [...new Set([...alwaysVisible, ...accessibleSections])];

    return res.json({
      ventureTypes: types,
      accessibleSections: allAccessible,
    });
  } catch (err) {
    console.error("Error fetching venture types:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
