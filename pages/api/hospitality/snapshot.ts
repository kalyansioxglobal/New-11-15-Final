import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { requireAdminPanelUser } from "@/lib/apiAuth";

type MetricBlock = {
  roomRevenue: number;
  roomsSold: number;
  roomsAvailable: number;
  adr: number;
  revpar: number;
  occupancy: number;
};

type SnapshotResponse = {
  hotelId: number | null;
  hotelName?: string;
  mtd: MetricBlock;
  ytd: MetricBlock;
  lymtd: MetricBlock;
  lyytd: MetricBlock;
  mtdChangeVsLy: number | null;
  ytdChangeVsLy: number | null;
};

function buildMetrics(rows: { total: number | null; roomSold: number | null; totalRoom: number | null }[]): MetricBlock {
  const roomRevenue = rows.reduce((sum, r) => sum + (r.total ?? 0), 0);
  const roomsSold = rows.reduce((sum, r) => sum + (r.roomSold ?? 0), 0);
  const roomsAvailable = rows.reduce((sum, r) => sum + (r.totalRoom ?? 0), 0);

  const adr = roomsSold > 0 ? roomRevenue / roomsSold : 0;
  const revpar = roomsAvailable > 0 ? roomRevenue / roomsAvailable : 0;
  const occupancy = roomsAvailable > 0 ? roomsSold / roomsAvailable : 0;

  return { roomRevenue, roomsSold, roomsAvailable, adr, revpar, occupancy };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireAdminPanelUser(req, res);
  if (!user) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const { date, hotelId } = req.query;

    const today = date ? new Date(String(date)) : new Date();
    const year = today.getUTCFullYear();
    const month = today.getUTCMonth();

    const periodStartMtd = new Date(Date.UTC(year, month, 1));
    const periodEndMtd = new Date(Date.UTC(year, month + 1, 1));

    const periodStartYtd = new Date(Date.UTC(year, 0, 1));
    const periodEndYtd = new Date(Date.UTC(year + 1, 0, 1));

    const lyYear = year - 1;
    const periodStartLyMtd = new Date(Date.UTC(lyYear, month, 1));
    const periodEndLyMtd = new Date(Date.UTC(lyYear, month + 1, 1));

    const periodStartLyYtd = new Date(Date.UTC(lyYear, 0, 1));
    const periodEndLyYtd = new Date(Date.UTC(lyYear + 1, 0, 1));

    const includeTest = req.query.includeTest === 'true';
    
    const buildWhere = (dateRange: { gte: Date; lt: Date }) => {
      const where: any = {
        date: dateRange,
      };
      if (hotelId) {
        where.hotelId = Number(hotelId);
      }
      if (!includeTest) {
        where.hotel = { isTest: false };
      }
      return where;
    };

    const [mtdRows, ytdRows, lyMtdRows, lyYtdRows] = await Promise.all([
      prisma.hotelDailyReport.findMany({
        where: buildWhere({ gte: periodStartMtd, lt: periodEndMtd }),
        select: { total: true, roomSold: true, totalRoom: true },
      }),
      prisma.hotelDailyReport.findMany({
        where: buildWhere({ gte: periodStartYtd, lt: periodEndYtd }),
        select: { total: true, roomSold: true, totalRoom: true },
      }),
      prisma.hotelDailyReport.findMany({
        where: buildWhere({ gte: periodStartLyMtd, lt: periodEndLyMtd }),
        select: { total: true, roomSold: true, totalRoom: true },
      }),
      prisma.hotelDailyReport.findMany({
        where: buildWhere({ gte: periodStartLyYtd, lt: periodEndLyYtd }),
        select: { total: true, roomSold: true, totalRoom: true },
      }),
    ]);

    const mtd = buildMetrics(mtdRows);
    const ytd = buildMetrics(ytdRows);
    const lymtd = buildMetrics(lyMtdRows);
    const lyytd = buildMetrics(lyYtdRows);

    const mtdChangeVsLy =
      lymtd.roomRevenue > 0
        ? (mtd.roomRevenue - lymtd.roomRevenue) / lymtd.roomRevenue
        : null;

    const ytdChangeVsLy =
      lyytd.roomRevenue > 0
        ? (ytd.roomRevenue - lyytd.roomRevenue) / lyytd.roomRevenue
        : null;

    const resp: SnapshotResponse = {
      hotelId: hotelId ? Number(hotelId) : null,
      mtd,
      ytd,
      lymtd,
      lyytd,
      mtdChangeVsLy,
      ytdChangeVsLy,
    };

    return res.status(200).json(resp);
  } catch (err) {
    console.error("Hospitality snapshot error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
