import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

type PeriodMetrics = {
  label: string;
  roomsSold: number;
  roomsAvailable: number;
  roomRevenue: number;
  totalRevenue: number;
  occupancyPct: number;
  adr: number;
  revpar: number;
  daysInPeriod: number;
};

type ComparisonResult = {
  mtd: PeriodMetrics;
  lyMtd: PeriodMetrics;
  ytd: PeriodMetrics;
  lyYtd: PeriodMetrics;
  mtdChange: {
    revenuePct: number;
    occupancyPts: number;
    adrPct: number;
    revparPct: number;
  };
  ytdChange: {
    revenuePct: number;
    occupancyPts: number;
    adrPct: number;
    revparPct: number;
  };
  dailyTrend: {
    date: string;
    occupancy: number;
    lyOccupancy: number | null;
    revenue: number;
    lyRevenue: number | null;
    adr: number;
    lyAdr: number | null;
    revpar: number;
    lyRevpar: number | null;
  }[];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { hotelId, ventureId } = req.query;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();

    const mtdStart = new Date(currentYear, currentMonth, 1);
    const mtdEnd = new Date(currentYear, currentMonth, currentDay);

    const ytdStart = new Date(currentYear, 0, 1);
    const ytdEnd = new Date(currentYear, currentMonth, currentDay);

    const lyMtdStart = new Date(currentYear - 1, currentMonth, 1);
    const lyMtdEnd = new Date(currentYear - 1, currentMonth, currentDay);

    const lyYtdStart = new Date(currentYear - 1, 0, 1);
    const lyYtdEnd = new Date(currentYear - 1, currentMonth, currentDay);

    const where: Record<string, unknown> = {};
    if (hotelId) {
      where.hotelId = Number(hotelId);
    } else if (ventureId) {
      where.ventureId = Number(ventureId);
    }

    const [mtdData, lyMtdData, ytdData, lyYtdData] = await Promise.all([
      prisma.hotelKpiDaily.findMany({
        where: { ...where, date: { gte: mtdStart, lte: mtdEnd } },
      }),
      prisma.hotelKpiDaily.findMany({
        where: { ...where, date: { gte: lyMtdStart, lte: lyMtdEnd } },
      }),
      prisma.hotelKpiDaily.findMany({
        where: { ...where, date: { gte: ytdStart, lte: ytdEnd } },
      }),
      prisma.hotelKpiDaily.findMany({
        where: { ...where, date: { gte: lyYtdStart, lte: lyYtdEnd } },
      }),
    ]);

    const last30Start = new Date(now);
    last30Start.setDate(last30Start.getDate() - 30);
    const lyLast30Start = new Date(last30Start);
    lyLast30Start.setFullYear(lyLast30Start.getFullYear() - 1);
    const lyLast30End = new Date(now);
    lyLast30End.setFullYear(lyLast30End.getFullYear() - 1);

    const [last30Data, lyLast30Data] = await Promise.all([
      prisma.hotelKpiDaily.findMany({
        where: { ...where, date: { gte: last30Start, lte: now } },
        orderBy: { date: "asc" },
      }),
      prisma.hotelKpiDaily.findMany({
        where: { ...where, date: { gte: lyLast30Start, lte: lyLast30End } },
        orderBy: { date: "asc" },
      }),
    ]);

    const aggregatePeriod = (
      data: typeof mtdData,
      label: string
    ): PeriodMetrics => {
      if (data.length === 0) {
        return {
          label,
          roomsSold: 0,
          roomsAvailable: 0,
          roomRevenue: 0,
          totalRevenue: 0,
          occupancyPct: 0,
          adr: 0,
          revpar: 0,
          daysInPeriod: 0,
        };
      }

      const roomsSold = data.reduce((sum, r) => sum + r.roomsSold, 0);
      const roomsAvailable = data.reduce((sum, r) => sum + r.roomsAvailable, 0);
      const roomRevenue = data.reduce((sum, r) => sum + r.roomRevenue, 0);
      const totalRevenue = data.reduce((sum, r) => sum + r.totalRevenue, 0);
      const occupancyPct =
        roomsAvailable > 0 ? (roomsSold / roomsAvailable) * 100 : 0;
      const adr = roomsSold > 0 ? roomRevenue / roomsSold : 0;
      const revpar = roomsAvailable > 0 ? roomRevenue / roomsAvailable : 0;

      return {
        label,
        roomsSold,
        roomsAvailable,
        roomRevenue,
        totalRevenue,
        occupancyPct,
        adr,
        revpar,
        daysInPeriod: data.length,
      };
    };

    const mtd = aggregatePeriod(mtdData, "MTD");
    const lyMtd = aggregatePeriod(lyMtdData, "LY MTD");
    const ytd = aggregatePeriod(ytdData, "YTD");
    const lyYtd = aggregatePeriod(lyYtdData, "LY YTD");

    const calcChange = (
      curr: PeriodMetrics,
      prev: PeriodMetrics
    ): {
      revenuePct: number;
      occupancyPts: number;
      adrPct: number;
      revparPct: number;
    } => {
      return {
        revenuePct:
          prev.roomRevenue > 0
            ? ((curr.roomRevenue - prev.roomRevenue) / prev.roomRevenue) * 100
            : 0,
        occupancyPts: curr.occupancyPct - prev.occupancyPct,
        adrPct: prev.adr > 0 ? ((curr.adr - prev.adr) / prev.adr) * 100 : 0,
        revparPct:
          prev.revpar > 0
            ? ((curr.revpar - prev.revpar) / prev.revpar) * 100
            : 0,
      };
    };

    const lyDataMap = new Map<string, (typeof lyLast30Data)[0]>();
    lyLast30Data.forEach((r) => {
      const dateKey = `${r.date.getMonth() + 1}-${r.date.getDate()}`;
      lyDataMap.set(dateKey, r);
    });

    const dailyTrend = last30Data.map((r) => {
      const dateKey = `${r.date.getMonth() + 1}-${r.date.getDate()}`;
      const lyRow = lyDataMap.get(dateKey);

      return {
        date: r.date.toISOString().split("T")[0],
        occupancy: r.occupancyPct,
        lyOccupancy: lyRow?.occupancyPct ?? null,
        revenue: r.roomRevenue,
        lyRevenue: lyRow?.roomRevenue ?? null,
        adr: r.adr,
        lyAdr: lyRow?.adr ?? null,
        revpar: r.revpar,
        lyRevpar: lyRow?.revpar ?? null,
      };
    });

    const result: ComparisonResult = {
      mtd,
      lyMtd,
      ytd,
      lyYtd,
      mtdChange: calcChange(mtd, lyMtd),
      ytdChange: calcChange(ytd, lyYtd),
      dailyTrend,
    };

    return res.status(200).json(result);
  } catch (error) {
    console.error("Hotel KPI comparison error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
