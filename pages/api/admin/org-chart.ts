import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/apiAuth";
import prisma from "@/lib/prisma";

type OrgNode = {
  id: number;
  name: string;
  email: string;
  role: string;
  jobRole?: string;
  department?: string;
  avatarUrl?: string | null;
  children: OrgNode[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { ventureId, officeId, departmentId } = req.query;

    const where: any = {
      isActive: true,
    };

    if (ventureId) {
      where.ventures = {
        some: { ventureId: Number(ventureId) },
      };
    }
    if (officeId) {
      where.officeId = Number(officeId);
    }
    if (departmentId) {
      where.jobDepartmentId = Number(departmentId);
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        avatarUrl: true,
        reportsToId: true,
        jobRole: {
          select: { id: true, name: true },
        },
        jobDepartment: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ role: "asc" }, { fullName: "asc" }],
    });

    const userMap = new Map<number, OrgNode>();
    const roots: OrgNode[] = [];

    users.forEach((u: any) => {
      userMap.set(u.id, {
        id: u.id,
        name: u.fullName || u.email,
        email: u.email,
        role: u.role,
        jobRole: u.jobRole?.name,
        department: u.jobDepartment?.name,
        avatarUrl: u.avatarUrl,
        children: [],
      });
    });

    users.forEach((u: any) => {
      const node = userMap.get(u.id)!;
      if (u.reportsToId && userMap.has(u.reportsToId)) {
        userMap.get(u.reportsToId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    const departments = await prisma.jobDepartment.findMany({
      select: { id: true, name: true, ventureType: true },
      orderBy: { name: "asc" },
    });

    const summary = {
      totalUsers: users.length,
      byRole: users.reduce((acc: Record<string, number>, u: any) => {
        acc[u.role] = (acc[u.role] || 0) + 1;
        return acc;
      }, {}),
      byDepartment: users.reduce((acc: Record<string, number>, u: any) => {
        const dept = u.jobDepartment?.name || "Unassigned";
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      }, {}),
    };

    return res.status(200).json({
      tree: roots,
      flat: Array.from(userMap.values()),
      departments,
      summary,
    });
  } catch (error: any) {
    console.error("Org chart API error:", error);
    return res.status(500).json({ error: "Internal server error", detail: error.message || String(error) });
  }
}
