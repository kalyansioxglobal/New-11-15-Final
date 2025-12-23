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
  if (!user) return;

  logger.info("api_request", {
    endpoint: "/api/incentives/user-timeseries",
    userId: user.id,
    userRole: user.role,
    outcome: "start",
  });

  try {
    const { userId: rawUserId, ventureId: rawVentureId, from: rawFrom, to: rawTo } = req.query;

    if (!rawUserId || typeof rawUserId !== "string") {
      return res.status(400).json({ error: "Invalid userId" });
    }
    if (!rawVentureId || typeof rawVentureId !== "string") {
      return res.status(400).json({ error: "Invalid ventureId" });
    }

    const targetUserId = parseInt(rawUserId, 10);
    const ventureId = parseInt(rawVentureId, 10);

    if (!targetUserId || Number.isNaN(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ error: "Invalid userId" });
    }
    if (!ventureId || Number.isNaN(ventureId) || ventureId <= 0) {
      return res.status(400).json({ error: "Invalid ventureId" });
    }

    // RBAC: only leadership / finance can view other users' incentives timeseries
    // Cap date window to 90 days to keep timeseries queries safe for production use.

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
    if (!scope.allVentures && !scope.ventureIds.includes(ventureId)) {
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
        detail: `Maximum allowed range is ${MAX_DAYS} days for user incentives timeseries`,
      });
    }

    // @ts-ignore - Prisma groupBy types have circular reference issue
    const grouped = await prisma.incentiveDaily.groupBy({
      by: ["date"],
      where: {
        ventureId,
        userId: targetUserId,
        date: { gte: fromDay, lte: toDay },
      },
      _sum: { amount: true },
      orderBy: { date: "asc" },
    });

    const points = grouped.map((g: any) => ({
      date: g.date.toISOString().slice(0, 10),
      amount: Number(g._sum?.amount ?? 0),
    }));

    return res.status(200).json({
      userId: targetUserId,
      ventureId,
      from: fromDay.toISOString().slice(0, 10),
      to: toDay.toISOString().slice(0, 10),
      points,
    });
  } catch (error: any) {
    logger.error("api_request_error", {
      endpoint: "/api/incentives/user-timeseries",
      userId: user?.id,
      userRole: user?.role,
      outcome: "error",
    });
    console.error("User incentives timeseries failed", error);
    return res.status(500).json({ error: "Failed to load user incentives timeseries" });
  }
}
