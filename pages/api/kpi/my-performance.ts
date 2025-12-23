import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getEffectiveUser } from "@/lib/effectiveUser";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await getEffectiveUser(req, res);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayLoads, weekLoads, monthLoads, allTimeLoads, teamStats] = await Promise.all([
      prisma.load.findMany({
        where: {
          createdById: user.id,
          loadStatus: "COVERED",
          OR: [
            { dispatchDate: { gte: todayStart } },
            { dispatchDate: null, createdAt: { gte: todayStart } },
          ],
        },
        select: { id: true, marginAmount: true, marginPercentage: true, rate: true },
      }),
      prisma.load.findMany({
        where: {
          createdById: user.id,
          loadStatus: "COVERED",
          OR: [
            { dispatchDate: { gte: weekStart } },
            { dispatchDate: null, createdAt: { gte: weekStart } },
          ],
        },
        select: { id: true, marginAmount: true, marginPercentage: true, rate: true },
      }),
      prisma.load.findMany({
        where: {
          createdById: user.id,
          loadStatus: "COVERED",
          OR: [
            { dispatchDate: { gte: monthStart } },
            { dispatchDate: null, createdAt: { gte: monthStart } },
          ],
        },
        select: { id: true, marginAmount: true, marginPercentage: true, rate: true },
      }),
      prisma.load.aggregate({
        where: {
          createdById: user.id,
          loadStatus: "COVERED",
        },
        _count: { id: true },
        _sum: { marginAmount: true, rate: true },
        _avg: { marginPercentage: true },
      }),
      prisma.load.groupBy({
        by: ["createdById"],
        where: {
          loadStatus: "COVERED",
          createdById: { not: null },
          OR: [
            { dispatchDate: { gte: monthStart } },
            { dispatchDate: null, createdAt: { gte: monthStart } },
          ],
        },
        _count: { id: true },
        _sum: { marginAmount: true },
      }),
    ]);

    const calcStats = (loads: { marginAmount: number | null; rate: number | null }[]) => ({
      count: loads.length,
      totalMargin: loads.reduce((sum, l) => sum + (l.marginAmount || 0), 0),
      totalRevenue: loads.reduce((sum, l) => sum + (l.rate || 0), 0),
    });

    const todayStats = calcStats(todayLoads);
    const weekStats = calcStats(weekLoads);
    const monthStats = calcStats(monthLoads);

    const sortedTeam = teamStats
      .filter((t) => t.createdById !== null)
      .sort((a, b) => (b._sum.marginAmount || 0) - (a._sum.marginAmount || 0));

    const myRankIndex = sortedTeam.findIndex((t) => t.createdById === user.id);
    const hasLoadsThisMonth = myRankIndex >= 0;
    const myRank = hasLoadsThisMonth ? myRankIndex + 1 : null;
    const totalMembersWithLoads = sortedTeam.length;
    const teamAvgMargin = sortedTeam.length > 0
      ? sortedTeam.reduce((sum, t) => sum + (t._sum.marginAmount || 0), 0) / sortedTeam.length
      : 0;
    const teamAvgLoads = sortedTeam.length > 0
      ? sortedTeam.reduce((sum, t) => sum + t._count.id, 0) / sortedTeam.length
      : 0;
    const percentile = hasLoadsThisMonth && sortedTeam.length > 0
      ? Math.round(((sortedTeam.length - (myRankIndex + 1) + 1) / sortedTeam.length) * 100)
      : 0;

    const monthlyGoal = 50;
    const marginGoal = 25000;

    return res.status(200).json({
      data: {
        coveredLoads: {
          today: todayStats.count,
          week: weekStats.count,
          month: monthStats.count,
          allTime: allTimeLoads._count.id || 0,
        },
        margin: {
          today: Math.round(todayStats.totalMargin * 100) / 100,
          week: Math.round(weekStats.totalMargin * 100) / 100,
          month: Math.round(monthStats.totalMargin * 100) / 100,
          allTime: Math.round((allTimeLoads._sum.marginAmount || 0) * 100) / 100,
          avgPercentage: Math.round((allTimeLoads._avg.marginPercentage || 0) * 100) / 100,
        },
        ranking: {
          position: myRank,
          totalMembers: totalMembersWithLoads,
          percentile: Math.max(0, Math.min(100, percentile)),
          hasLoadsThisMonth,
        },
        comparison: {
          myMonthLoads: monthStats.count,
          teamAvgLoads: Math.round(teamAvgLoads * 10) / 10,
          myMonthMargin: Math.round(monthStats.totalMargin * 100) / 100,
          teamAvgMargin: Math.round(teamAvgMargin * 100) / 100,
          aboveAvgLoads: monthStats.count > teamAvgLoads,
          aboveAvgMargin: monthStats.totalMargin > teamAvgMargin,
        },
        goals: {
          loadsGoal: monthlyGoal,
          loadsProgress: monthStats.count,
          loadsPercentage: Math.min(100, Math.round((monthStats.count / monthlyGoal) * 100)),
          marginGoal: marginGoal,
          marginProgress: Math.round(monthStats.totalMargin * 100) / 100,
          marginPercentage: Math.min(100, Math.round((monthStats.totalMargin / marginGoal) * 100)),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching personal performance:", error);
    return res.status(500).json({ error: "Failed to fetch performance data" });
  }
}
