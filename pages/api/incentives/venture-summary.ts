import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getEffectiveUser } from "@/lib/effectiveUser";
import { getUserScope } from "@/lib/scope";
import { logger } from "@/lib/logger";

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
  if (!user) {
    return;
  }

  logger.info("api_request", {
    endpoint: "/api/incentives/venture-summary",
    userId: user.id,
    userRole: user.role,
    outcome: "start",
  });

  try {
    const { ventureId: rawVentureId, from: rawFrom, to: rawTo } = req.query;

    if (!rawVentureId || typeof rawVentureId !== "string") {
      return res.status(400).json({ error: "Invalid ventureId" });
    }

    const ventureId = parseInt(rawVentureId, 10);
    if (!ventureId || Number.isNaN(ventureId) || ventureId <= 0) {
      return res.status(400).json({ error: "Invalid ventureId" });
    }

    // RBAC: only leadership / finance can view venture-level incentives
    // RBAC: leadership/finance only; capped at 90 days per venture to keep summary queries safe.

    if (
      user.role !== "CEO" &&
      user.role !== "ADMIN" &&
      user.role !== "COO" &&
      user.role !== "VENTURE_HEAD" &&
      user.role !== "FINANCE"
    ) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    const scope = getUserScope(user);
    const isGlobal = scope.allVentures;
    if (!isGlobal && !scope.ventureIds.includes(ventureId)) {
      return res.status(403).json({ error: "FORBIDDEN_VENTURE" });
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
        detail: `Maximum allowed range is ${MAX_DAYS} days for venture incentive summary`,
      });
    }

    const rows = await prisma.incentiveDaily.findMany({
      where: {
        ventureId,
        date: { gte: fromDay, lte: toDay },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    type VentureUserSummary = {
      userId: number;
      userName: string;
      email: string | null;
      role: string | null;
      totalAmount: number;
      daysWithIncentives: number;
    };

    const byUser = new Map<number, VentureUserSummary & { dates: Set<string> }>();

    for (const row of rows) {
      const u = row.user;
      if (!u) continue;

      const existing = byUser.get(u.id) ?? {
        userId: u.id,
        userName: u.fullName || `User #${u.id}`,
        email: u.email ?? null,
        role: u.role ?? null,
        totalAmount: 0,
        daysWithIncentives: 0,
        dates: new Set<string>(),
      };

      const day = row.date.toISOString().slice(0, 10);
      const amount = row.amount ?? 0;

      existing.totalAmount += amount;
      if (amount > 0) {
        existing.dates.add(day);
      }

      byUser.set(u.id, existing);
    }

    const items: VentureUserSummary[] = Array.from(byUser.values())
      .map((u) => ({
        userId: u.userId,
        userName: u.userName,
        email: u.email,
        role: u.role,
        totalAmount: u.totalAmount,
        daysWithIncentives: u.dates.size,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    const totalAmount = items.reduce((sum, i) => sum + i.totalAmount, 0);

    return res.status(200).json({
      ventureId,
      from: fromDay.toISOString().slice(0, 10),
      to: toDay.toISOString().slice(0, 10),
      items,
      totalAmount,
    });
  } catch (error: any) {
    logger.error("api_request_error", {
      endpoint: "/api/incentives/venture-summary",
      userId: user?.id,
      userRole: user?.role,
      outcome: "error",
    });
    console.error("Venture incentive summary failed", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
