import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getEffectiveUser } from "@/lib/effectiveUser";
import { getUserScope } from "@/lib/scope";

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
    const { userId: rawUserId, ventureId: rawVentureId, from: rawFrom, to: rawTo } = req.query;

    if (!rawUserId || typeof rawUserId !== "string") {
      return res.status(400).json({ error: "Missing or invalid userId" });
    }
    if (!rawVentureId || typeof rawVentureId !== "string") {
      return res.status(400).json({ error: "Missing or invalid ventureId" });
    }

    const targetUserId = parseInt(rawUserId, 10);
    const ventureId = parseInt(rawVentureId, 10);

    if (!targetUserId || Number.isNaN(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ error: "Missing or invalid userId" });
    }
    if (!ventureId || Number.isNaN(ventureId) || ventureId <= 0) {
      return res.status(400).json({ error: "Missing or invalid ventureId" });
    }

    // RBAC: only leadership / finance can view other users' incentives
    if (
      user.role !== "CEO" &&
      user.role !== "ADMIN" &&
      user.role !== "COO" &&
      user.role !== "VENTURE_HEAD" &&
      user.role !== "FINANCE"
    ) {
      return res.status(403).json({ error: "Forbidden", detail: "Insufficient permissions for user incentives" });
    }

    const scope = getUserScope(user);
    const isGlobal = scope.allVentures;
    if (!isGlobal && !scope.ventureIds.includes(ventureId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

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
        detail: `Maximum allowed range is ${MAX_DAYS} days for user incentive history`,
      });
    }

    const rows = await prisma.incentiveDaily.findMany({
      where: {
        ventureId,
        userId: targetUserId,
        date: { gte: fromDay, lte: toDay },
      },
      orderBy: { date: "asc" },
    });

    type UserDailyItem = {
      date: string;
      amount: number;
      note: string | null;
    };

    const items: UserDailyItem[] = rows.map((r: (typeof rows)[number]) => {
      const day = r.date.toISOString().slice(0, 10);
      const breakdown = (r.breakdown as any) ?? null;
      const note: string | null = breakdown?.note ?? null;
      return {
        date: day,
        amount: r.amount ?? 0,
        note,
      };
    });

    const totalAmount = items.reduce(
      (sum: number, i: UserDailyItem) => sum + (i.amount ?? 0),
      0,
    );

    return res.status(200).json({
      userId: targetUserId,
      ventureId,
      from: fromDay.toISOString().slice(0, 10),
      to: toDay.toISOString().slice(0, 10),
      items,
      totalAmount,
    });
  } catch (error: any) {
    console.error("User daily incentives fetch failed", error);
    return res.status(500).json({ error: "Failed to fetch user incentives", detail: error.message });
  }
}
