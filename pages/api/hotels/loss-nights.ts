import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { requireUser } from '@/lib/apiAuth';
import { canViewPortfolioResource } from "@/lib/permissions";

import { getUserScope } from "../../../lib/scope";
import { logger } from "@/lib/logger";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  if (!canViewPortfolioResource(user, "HOTEL_LOSS_NIGHTS_VIEW")) {
  // RBAC: only hotel portfolio viewers can access high-loss nights across properties.

    return res.status(403).json({ error: "FORBIDDEN" });
  }

  logger.info("api_request", {
    endpoint: "/api/hotels/loss-nights",
    userId: user.id,
    userRole: user.role,
    outcome: "start",
  });

  try {
    const scope = getUserScope(user);

    const ventureId = req.query.ventureId
      ? Number(req.query.ventureId)
      : undefined;
    const hotelId = req.query.hotelId ? Number(req.query.hotelId) : undefined;
    const rawFrom = req.query.from as string | undefined;
    const rawTo = req.query.to as string | undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    const includeTest = req.query.includeTest === 'true';

    if (Number.isNaN(ventureId as number) && req.query.ventureId) {
      return res.status(400).json({ error: "Invalid ventureId" });
    }
    if (Number.isNaN(hotelId as number) && req.query.hotelId) {
      return res.status(400).json({ error: "Invalid hotelId" });
    }

    if (isNaN(limit) || limit <= 0 || limit > 500) {
      return res.status(400).json({ error: "Invalid limit" });
    }

    let from: Date | undefined;
    let to: Date | undefined;

    if (rawFrom) {
      const parsed = new Date(rawFrom);
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ error: "Invalid from date" });
      }
      from = parsed;
    }

    if (rawTo) {
      const parsed = new Date(rawTo);
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ error: "Invalid to date" });
      }
      to = parsed;
    }

    if (from && to) {
      const diffMs = to.getTime() - from.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24) + 1;
      const MAX_WINDOW_DAYS = 90;
      if (diffDays > MAX_WINDOW_DAYS) {
        return res.status(400).json({
          error: "Date range too large",
          detail: `Maximum allowed range is ${MAX_WINDOW_DAYS} days`,
        });
      }
    }

    const where: any = {
      highLossFlag: true,
      hotel: {
        ...(includeTest ? {} : { isTest: false }),
      },
    };

    if (hotelId) {
      if (isNaN(hotelId)) {
        return res.status(400).json({ error: "Invalid hotelId" });
      }
      where.hotelId = hotelId;
    }

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = from;
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    // Scope by venture access via hotel.ventureId
    if (ventureId) {
      where.hotel = { ...where.hotel, ventureId };
    } else if (!scope.allVentures) {
      where.hotel = { ...where.hotel, ventureId: { in: scope.ventureIds } };
    }

    const reports = await prisma.hotelDailyReport.findMany({
      where,
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            code: true,
            city: true,
            state: true,
            ventureId: true,
            venture: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { date: "desc" },
      take: limit,
    });

    const result = reports.map((r: (typeof reports)[number]) => {
      const lossRatio =
        r.total && r.total > 0 ? (r.lostDues ?? 0) / r.total : null;

      return {
        id: r.id,
        date: r.date,
        hotelId: r.hotelId,
        hotelName: r.hotel?.name ?? "Unknown",
        hotelCode: r.hotel?.code ?? null,
        city: r.hotel?.city ?? null,
        state: r.hotel?.state ?? null,
        ventureId: r.hotel?.ventureId ?? null,
        ventureName: r.hotel?.venture?.name ?? null,
        totalRoom: r.totalRoom,
        roomSold: r.roomSold,
        total: r.total,
        dues: r.dues,
        lostDues: r.lostDues,
        lossRatio,
        occupancy: r.occupancy,
        adr: r.adr,
        revpar: r.revpar,
        highLossFlag: r.highLossFlag,
      };
    });

    return res.status(200).json({ items: result });
  } catch (err) {
    logger.error("api_request_error", {
      endpoint: "/api/hotels/loss-nights",
      userId: user?.id,
      userRole: user?.role,
      outcome: "error",
    });
    console.error("loss-nights error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
