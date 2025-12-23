import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getEffectiveUser } from "@/lib/effectiveUser";

function parseDateParam(value: string | string[] | undefined): Date | null {
  if (!value || Array.isArray(value)) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await getEffectiveUser(req, res);
  if (!user) return;

  try {
    const { from: rawFrom, to: rawTo } = req.query;
    const now = new Date();

    let from = parseDateParam(rawFrom as string | undefined);
    let to = parseDateParam(rawTo as string | undefined);

    if (!from || !to) {
      to = new Date(now);
      const fromDate = new Date(now);
      fromDate.setDate(fromDate.getDate() - 29);
      from = fromDate;
    }

    if (!from || !to) {
      return res.status(400).json({ error: "Invalid date range" });
    }

    const fromDay = new Date(from.toISOString().slice(0, 10) + "T00:00:00.000Z");
    const toDay = new Date(to.toISOString().slice(0, 10) + "T23:59:59.999Z");

    const diffMs = toDay.getTime() - fromDay.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24) + 1;
    const MAX_DAYS = 90;
    if (diffDays > MAX_DAYS) {
      return res.status(400).json({
        error: "Date range too large",
        detail: `Maximum allowed range is ${MAX_DAYS} days for gamification window`,
      });
    }

    // Fetch this user's incentives in the window
    const rows = await prisma.incentiveDaily.findMany({
      where: {
        userId: user.id,
        date: { gte: fromDay, lte: toDay },
      },
      orderBy: { date: "asc" },
    });

    const items = rows.map((r: (typeof rows)[number]) => ({
      date: r.date.toISOString().slice(0, 10),
      amount: Number(r.amount ?? 0),
    }));

    const totalsAmount = items.reduce(
      (sum: number, r: (typeof items)[number]) => sum + r.amount,
      0,
    );
    const daysWithIncentives = items.filter((r: (typeof items)[number]) => r.amount > 0).length;

    // Compute streaks
    let currentStreak = 0;
    let longestStreak = 0;

    // We iterate from latest to oldest to compute current streak
    const byDateDesc = [...items].sort((a, b) => (a.date < b.date ? 1 : -1));

    for (const r of byDateDesc) {
      if (r.amount > 0) {
        currentStreak += 1;
      } else {
        if (currentStreak > 0) break;
      }
    }

    // Longest streak across the window (iterate ascending)
    let streak = 0;
    const byDateAsc = [...items].sort((a, b) => (a.date > b.date ? 1 : -1));
    for (const r of byDateAsc) {
      if (r.amount > 0) {
        streak += 1;
        if (streak > longestStreak) longestStreak = streak;
      } else {
        streak = 0;
      }
    }

    // Compute venture-relative rank (simple: compare total per user in same ventures)
    const ventureIds = Array.from(
      new Set(rows.map((r: (typeof rows)[number]) => r.ventureId).filter(Boolean)),
    );

    let rank = 1;
    let totalUsers = 1;
    let percentile = 100;

    if (ventureIds.length > 0) {
      const ventureId = ventureIds[0]!;

      const ventureRows = await prisma.incentiveDaily.findMany({
        where: {
          ventureId,
          date: { gte: fromDay, lte: toDay },
        },
        select: {
          userId: true,
          amount: true,
        },
      });

      const byUser = new Map<number, number>();
      for (const r of ventureRows) {
        const prev = byUser.get(r.userId) ?? 0;
        byUser.set(r.userId, prev + Number(r.amount ?? 0));
      }

      const totals = Array.from(byUser.entries()).sort((a, b) => b[1] - a[1]);
      totalUsers = totals.length || 1;
      const myIndex = totals.findIndex(([uid]) => uid === user.id);
      if (myIndex >= 0) {
        rank = myIndex + 1;
        percentile = Math.round((1 - myIndex / totalUsers) * 100);
      }
    }

    const badges: string[] = [];
    if (currentStreak >= 3) badges.push("Daily Starter");
    if (daysWithIncentives >= 10) badges.push("Consistent Performer");
    if (percentile >= 90) badges.push("Top Earner");

    return res.status(200).json({
      userId: user.id,
      window: {
        from: fromDay.toISOString().slice(0, 10),
        to: toDay.toISOString().slice(0, 10),
      },
      streaks: {
        current: currentStreak,
        longest: longestStreak,
      },
      totals: {
        amount: totalsAmount,
        days: daysWithIncentives,
      },
      rank: {
        rank,
        totalUsers,
        percentile,
      },
      badges,
    });
  } catch (error: any) {
    console.error("Gamification my incentives failed", error);
    return res
      .status(500)
      .json({ error: "Failed to load gamification data", detail: error.message });
  }
}
