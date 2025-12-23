import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { requireUser } from '@/lib/apiAuth';
import { canViewPortfolioResource } from "@/lib/permissions";

import { getUserScope } from "../../../lib/scope";

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

function subYears(date: Date, years: number): Date {
  return new Date(date.getFullYear() - years, date.getMonth(), date.getDate());
}

function differenceInCalendarDays(end: Date, start: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;
}

interface MetricRecord {
  date: Date;
  roomRevenue: number | null;
  roomsSold: number | null;
  totalRevenue: number | null;
}

function computePeriodMetrics(
  metrics: MetricRecord[],
  start: Date,
  end: Date,
  roomCount: number | null
) {
  const periodMetrics = metrics.filter((m) => {
    const d = new Date(m.date);
    return d >= start && d <= end;
  });

  const totalRoomRevenue = periodMetrics.reduce(
    (sum, m) => sum + (m.roomRevenue || m.totalRevenue || 0),
    0
  );
  const totalRoomsSold = periodMetrics.reduce(
    (sum, m) => sum + (m.roomsSold || 0),
    0
  );

  const daysInPeriod = differenceInCalendarDays(end, start);
  const roomsAvailable =
    roomCount && roomCount > 0 ? roomCount * daysInPeriod : null;

  const adr = totalRoomsSold > 0 ? totalRoomRevenue / totalRoomsSold : null;

  const occPct =
    roomsAvailable && roomsAvailable > 0
      ? (totalRoomsSold / roomsAvailable) * 100
      : null;

  const revpar =
    roomsAvailable && roomsAvailable > 0
      ? totalRoomRevenue / roomsAvailable
      : null;

  return {
    totalRoomRevenue,
    totalRoomsSold,
    adr,
    occPct,
    revpar,
  };
}

function pctChange(current: number | null, prev: number | null): number | null {
  if (current === null || current === undefined) return null;
  if (!prev || prev === 0) return null;
  return ((current - prev) / prev) * 100;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }

  const user = await requireUser(req, res);
  if (!user) return;
  if (!canViewPortfolioResource(user, "HOTEL_PORTFOLIO_VIEW")) {
    return res.status(403).json({ error: 'Forbidden', detail: 'Insufficient permissions for hotel snapshot' });
  }


  const scope = getUserScope(user);
  const ventureId = req.query.ventureId ? Number(req.query.ventureId) : undefined;

  try {
    const today = new Date();
    const thisMonthStart = startOfMonth(today);
    const thisYearStart = startOfYear(today);

    const lastYearSameDate = subYears(today, 1);
    const lastYearMTDStart = startOfMonth(lastYearSameDate);
    const lastYearYTDStart = startOfYear(lastYearSameDate);

    const includeTest = req.query.includeTest === 'true';
    
    const hotelWhere: any = { 
      status: "ACTIVE",
      ...(includeTest ? {} : { isTest: false }),
    };
    if (ventureId) {
      hotelWhere.ventureId = ventureId;
    } else if (!scope.allVentures) {
      hotelWhere.ventureId = { in: scope.ventureIds };
    }

    const hotels = await prisma.hotelProperty.findMany({
      where: hotelWhere,
      include: {
        kpis: true,
        venture: { select: { id: true, name: true } },
      },
    });

    const snapshot = hotels.map((hotel: (typeof hotels)[number]) => {
      const metrics: MetricRecord[] = (hotel.kpis || []).map((k: (typeof hotel.kpis)[number]) => ({
        date: k.date,
        roomRevenue: k.roomRevenue,
        roomsSold: k.roomsSold,
        totalRevenue: k.totalRevenue,
      }));
      const roomCount = hotel.rooms ?? null;

      const mtd = computePeriodMetrics(metrics, thisMonthStart, today, roomCount);
      const ytd = computePeriodMetrics(metrics, thisYearStart, today, roomCount);
      const lymtd = computePeriodMetrics(metrics, lastYearMTDStart, lastYearSameDate, roomCount);
      const lyytd = computePeriodMetrics(metrics, lastYearYTDStart, lastYearSameDate, roomCount);

      return {
        hotelId: hotel.id,
        name: hotel.name,
        code: hotel.code,
        city: hotel.city,
        state: hotel.state,
        rooms: hotel.rooms,
        venture: hotel.venture,

        MTD: mtd.totalRoomRevenue,
        YTD: ytd.totalRoomRevenue,
        LYMTD: lymtd.totalRoomRevenue,
        LYYTD: lyytd.totalRoomRevenue,
        MTD_DropPct: pctChange(mtd.totalRoomRevenue, lymtd.totalRoomRevenue),
        YTD_DropPct: pctChange(ytd.totalRoomRevenue, lyytd.totalRoomRevenue),

        ADR_MTD: mtd.adr,
        ADR_YTD: ytd.adr,
        ADR_LYMTD: lymtd.adr,
        ADR_LYYTD: lyytd.adr,
        ADR_MTD_ChangePct: pctChange(mtd.adr, lymtd.adr),
        ADR_YTD_ChangePct: pctChange(ytd.adr, lyytd.adr),

        OCC_MTD: mtd.occPct,
        OCC_YTD: ytd.occPct,
        OCC_LYMTD: lymtd.occPct,
        OCC_LYYTD: lyytd.occPct,
        OCC_MTD_ChangePct: pctChange(mtd.occPct, lymtd.occPct),
        OCC_YTD_ChangePct: pctChange(ytd.occPct, lyytd.occPct),

        REVPAR_MTD: mtd.revpar,
        REVPAR_YTD: ytd.revpar,
        REVPAR_LYMTD: lymtd.revpar,
        REVPAR_LYYTD: lyytd.revpar,
        REVPAR_MTD_ChangePct: pctChange(mtd.revpar, lymtd.revpar),
        REVPAR_YTD_ChangePct: pctChange(ytd.revpar, lyytd.revpar),

        totalRoomsSold_MTD: mtd.totalRoomsSold,
        totalRoomsSold_YTD: ytd.totalRoomsSold,
      };
    });

    const totalMTD = snapshot.reduce(
      (sum: number, h: (typeof snapshot)[number]) => sum + h.MTD,
      0,
    );
    const totalYTD = snapshot.reduce(
      (sum: number, h: (typeof snapshot)[number]) => sum + h.YTD,
      0,
    );
    const totalLYMTD = snapshot.reduce(
      (sum: number, h: (typeof snapshot)[number]) => sum + h.LYMTD,
      0,
    );
    const totalLYYTD = snapshot.reduce(
      (sum: number, h: (typeof snapshot)[number]) => sum + h.LYYTD,
      0,
    );

    const totalRoomsSoldMTD = snapshot.reduce(
      (sum: number, h: (typeof snapshot)[number]) => sum + h.totalRoomsSold_MTD,
      0,
    );
    const totalRoomsSoldYTD = snapshot.reduce(
      (sum: number, h: (typeof snapshot)[number]) => sum + h.totalRoomsSold_YTD,
      0,
    );

    const portfolioADR_MTD = totalRoomsSoldMTD > 0 ? totalMTD / totalRoomsSoldMTD : null;
    const portfolioADR_YTD = totalRoomsSoldYTD > 0 ? totalYTD / totalRoomsSoldYTD : null;

    return res.json({
      snapshot,
      totals: {
        MTD: totalMTD,
        YTD: totalYTD,
        LYMTD: totalLYMTD,
        LYYTD: totalLYYTD,
        MTD_DropPct: pctChange(totalMTD, totalLYMTD),
        YTD_DropPct: pctChange(totalYTD, totalLYYTD),
        ADR_MTD: portfolioADR_MTD,
        ADR_YTD: portfolioADR_YTD,
        totalRoomsSold_MTD: totalRoomsSoldMTD,
        totalRoomsSold_YTD: totalRoomsSoldYTD,
      },
    });
  } catch (err) {
    console.error("Snapshot API error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
