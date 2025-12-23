import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from '@/lib/apiAuth';
import { can } from "@/lib/permissions";
import { getUserScope } from "@/lib/scope";

// Task board handler
// - GET only: returns a board-style view of tasks (lanes by status) for the
//   current user’s scoped ventures/offices.
// - Auth: requireUser (401 UNAUTHENTICATED if missing).
// - Scoping:
//   * getUserScope(user) determines which ventures/offices the user may see.
//   * Optional query filters:
//     - ventureId: further restricts tasks to a single venture if the user has
//       permission via can(user, 'view', 'TASK', { ventureId }).
//     - officeId: similarly restricts to a single office with can(...{ officeId }).
//   * When no venture/office filter is provided, tasks default to all
//     scoped ventures/offices with a cap of 200 tasks.
// - RBAC:
//   * can(user, 'view', 'TASK', ...) is used for per-venture/office checks for
//     explicit filters. This does not change underlying task logic, only
//     visibility.

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

  const { ventureId, officeId, status } = req.query;

  const scope = getUserScope(user);

  const ventureWhere: any = scope.allVentures
    ? {}
    : { id: { in: scope.ventureIds } };

  const officeWhere: any = scope.allOffices
    ? {}
    : scope.officeIds.length > 0
    ? { id: { in: scope.officeIds } }
    : {};

  const taskWhere: any = {
    isTest: user.isTestUser,
  };

  if (ventureId) {
    const vid = parseInt(ventureId as string, 10);
    if (!can(user, "view", "TASK", { ventureId: vid })) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }
    taskWhere.ventureId = vid;
  } else if (!scope.allVentures && scope.ventureIds.length > 0) {
    taskWhere.ventureId = { in: scope.ventureIds };
  }

  if (officeId) {
    const oid = parseInt(officeId as string, 10);
    if (!can(user, "view", "TASK", { officeId: oid })) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }
    taskWhere.officeId = oid;
  } else if (!scope.allOffices && scope.officeIds.length > 0) {
    taskWhere.OR = [
      { officeId: null },
      { officeId: { in: scope.officeIds } },
    ];
  }

  if (status && status !== "all") {
    taskWhere.status = status;
  }

  const [tasks, ventures, offices] = await Promise.all([
    prisma.task.findMany({
      where: taskWhere,
      include: {
        venture: { select: { id: true, name: true } },
        office: { select: { id: true, name: true } },
        assignedUser: { select: { id: true, fullName: true } },
      },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
      take: 200,
    }),
    prisma.venture.findMany({
      where: {
        isActive: true,
        ...ventureWhere,
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.office.findMany({
      where: {
        isActive: true,
        ...officeWhere,
      },
      select: { id: true, name: true, ventureId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return res.json({
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate,
      venture: t.venture ? { id: t.venture.id, name: t.venture.name } : null,
      office: t.office ? { id: t.office.id, name: t.office.name } : null,
      assignee: t.assignedUser
        ? { id: t.assignedUser.id, name: t.assignedUser.fullName }
        : null,
    })),
    ventures,
    offices,
  });
}
