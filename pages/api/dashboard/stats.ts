import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from "@/lib/scope";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  const now = new Date();
  const in30Days = new Date();
  in30Days.setDate(now.getDate() + 30);

  const scope = getUserScope(user);

  const ventureScopeFilter = !scope.allVentures && scope.ventureIds.length > 0
    ? { OR: [{ ventureId: { in: scope.ventureIds } }, { ventureId: null }] }
    : {};

  const officeScopeFilter = !scope.allOffices && scope.officeIds.length > 0
    ? { OR: [{ officeId: { in: scope.officeIds } }, { officeId: null }] }
    : {};

  const [openTasks, overdueTasks, activePolicies, expiringPolicies] =
    await Promise.all([
      prisma.task.count({
        where: {
          status: { in: ["OPEN", "IN_PROGRESS", "BLOCKED"] },
          ...ventureScopeFilter,
          ...officeScopeFilter,
        },
      }),
      prisma.task.count({
        where: {
          status: "OVERDUE",
          ...ventureScopeFilter,
          ...officeScopeFilter,
        },
      }),
      prisma.policy.count({
        where: {
          status: "ACTIVE",
          ...ventureScopeFilter,
          ...officeScopeFilter,
        },
      }),
      prisma.policy.count({
        where: {
          status: "ACTIVE",
          endDate: { gt: now, lte: in30Days },
          ...ventureScopeFilter,
          ...officeScopeFilter,
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
