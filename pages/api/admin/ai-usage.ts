import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/apiAuth";
import prisma from "@/lib/prisma";

const ADMIN_ROLES = ["CEO", "ADMIN", "COO"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  if (!ADMIN_ROLES.includes(user.role)) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const usageLogs = await prisma.aiUsageLog.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const userEndpointMap = new Map<
      string,
      {
        userId: number;
        userEmail: string;
        userName: string;
        endpoint: string;
        totalCalls: number;
        successfulCalls: number;
        failedCalls: number;
        totalTokens: number;
        lastUsed: Date;
      }
    >();

    const dailyMap = new Map<
      string,
      {
        date: string;
        totalCalls: number;
        successfulCalls: number;
        failedCalls: number;
        userIds: Set<number>;
      }
    >();

    const errorMap = new Map<string, number>();

    for (const log of usageLogs) {
      const key = `${log.userId}:${log.endpoint}`;
      if (!userEndpointMap.has(key)) {
        userEndpointMap.set(key, {
          userId: log.userId,
          userEmail: log.user?.email || "Unknown",
          userName: log.user?.fullName || "Unknown",
          endpoint: log.endpoint,
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          totalTokens: 0,
          lastUsed: log.createdAt,
        });
      }
      const stat = userEndpointMap.get(key)!;
      stat.totalCalls++;
      if (log.success) {
        stat.successfulCalls++;
      } else {
        stat.failedCalls++;
      }
      stat.totalTokens += log.tokensEstimated || 0;
      if (log.createdAt > stat.lastUsed) {
        stat.lastUsed = log.createdAt;
      }

      const dateKey = log.createdAt.toISOString().split("T")[0];
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: dateKey,
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          userIds: new Set(),
        });
      }
      const dayStat = dailyMap.get(dateKey)!;
      dayStat.totalCalls++;
      if (log.success) {
        dayStat.successfulCalls++;
      } else {
        dayStat.failedCalls++;
      }
      dayStat.userIds.add(log.userId);

      if (!log.success && log.errorType) {
        errorMap.set(log.errorType, (errorMap.get(log.errorType) || 0) + 1);
      }
    }

    const userStats = Array.from(userEndpointMap.values())
      .sort((a, b) => b.totalCalls - a.totalCalls)
      .map((s) => ({
        ...s,
        lastUsed: s.lastUsed.toISOString(),
      }));

    const dailyStats = Array.from(dailyMap.values())
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((s) => ({
        date: s.date,
        totalCalls: s.totalCalls,
        successfulCalls: s.successfulCalls,
        failedCalls: s.failedCalls,
        uniqueUsers: s.userIds.size,
      }));

    const errorStats = Array.from(errorMap.entries())
      .map(([errorType, count]) => ({ errorType, count }))
      .sort((a, b) => b.count - a.count);

    return res.json({
      userStats,
      dailyStats,
      errorStats,
    });
  } catch (err) {
    console.error("Error fetching AI usage stats:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
