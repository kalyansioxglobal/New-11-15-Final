import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from "@/lib/scope";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return res.status(401).json({ error: "UNAUTHENTICATED" });

  const scope = getUserScope(user);
  const now = new Date();
  const in30Days = new Date();
  in30Days.setDate(now.getDate() + 30);

  const taskWhere: any = {
    isTest: user.isTestUser,
  };

  if (!scope.allVentures) {
    taskWhere.ventureId = { in: scope.ventureIds };
  }

  if (!scope.allOffices && scope.officeIds.length > 0) {
    taskWhere.OR = [
      { officeId: null },
      { officeId: { in: scope.officeIds } },
    ];
  }

  const policyWhere: any = {
    isTest: user.isTestUser,
  };

  if (!scope.allVentures) {
    policyWhere.ventureId = { in: scope.ventureIds };
  }

  if (!scope.allOffices && scope.officeIds.length > 0) {
    policyWhere.OR = [
      { officeId: null },
      { officeId: { in: scope.officeIds } },
    ];
  }

  const [openTasks, overdueTasks, activePolicies, expiringPolicies] =
    await Promise.all([
      prisma.task.count({
        where: {
          ...taskWhere,
          status: { in: ["OPEN", "IN_PROGRESS", "BLOCKED"] },
        },
      }),
      prisma.task.count({
        where: {
          ...taskWhere,
          status: "OVERDUE",
        },
      }),
      prisma.policy.count({
        where: {
          ...policyWhere,
          status: "ACTIVE",
        },
      }),
      prisma.policy.count({
        where: {
          ...policyWhere,
          status: "ACTIVE",
          endDate: { gt: now, lte: in30Days },
        },
      }),
    ]);

  return res.json({
    openTasks,
    overdueTasks,
    activePolicies,
    expiringPolicies,
  });
}
