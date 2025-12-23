import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/apiAuth";
import { canManageUsers } from "@/lib/permissions";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  if (!canManageUsers(user.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    switch (req.method) {
      case "GET":
        return getRoles(req, res);
      case "POST":
        return createRole(req, res);
      case "PUT":
        return updateRole(req, res);
      case "DELETE":
        return deleteRole(req, res);
      default:
        res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
        return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error: any) {
    console.error("Admin roles API error:", error);
    return res.status(500).json({ error: "Internal server error", detail: error.message || String(error) });
  }
}

async function getRoles(req: NextApiRequest, res: NextApiResponse) {
  const { departmentId, ventureType } = req.query;

  const where: any = {};
  if (departmentId) {
    where.departmentId = Number(departmentId);
  }
  if (ventureType && typeof ventureType === "string") {
    where.department = { ventureType };
  }

  const roles = await prisma.jobRole.findMany({
    where,
    include: {
      department: {
        select: { id: true, name: true, ventureType: true },
      },
      _count: {
        select: { users: true },
      },
    },
    orderBy: [{ department: { name: "asc" } }, { name: "asc" }],
  });

  return res.status(200).json(roles);
}

async function createRole(req: NextApiRequest, res: NextApiResponse) {
  const { name, departmentId, isManager } = req.body;

  if (!name || !departmentId) {
    return res.status(400).json({ error: "name and departmentId are required" });
  }

  const role = await prisma.jobRole.create({
    data: {
      name,
      departmentId: Number(departmentId),
      isManager: isManager || false,
    },
    include: {
      department: true,
    },
  });

  return res.status(201).json(role);
}

async function updateRole(req: NextApiRequest, res: NextApiResponse) {
  const { id, name, departmentId, isManager } = req.body;

  if (!id) {
    return res.status(400).json({ error: "id is required" });
  }

  const role = await prisma.jobRole.update({
    where: { id: Number(id) },
    data: {
      ...(name && { name }),
      ...(departmentId && { departmentId: Number(departmentId) }),
      ...(typeof isManager === "boolean" && { isManager }),
    },
    include: {
      department: true,
    },
  });

  return res.status(200).json(role);
}

async function deleteRole(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: "id is required" });
  }

  const usersWithRole = await prisma.user.count({
    where: { jobRoleId: Number(id) },
  });

  if (usersWithRole > 0) {
    return res.status(400).json({
      error: `Cannot delete role: ${usersWithRole} user(s) are assigned to this role`,
    });
  }

  await prisma.jobRole.delete({
    where: { id: Number(id) },
  });

  return res.status(200).json({ success: true });
}
