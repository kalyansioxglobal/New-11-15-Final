import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { requireAdminPanelUser } from "@/lib/apiAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireAdminPanelUser(req, res);
  if (!user) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const {
      hotelId,
      startDate,
      endDate,
      page = "1",
      pageSize = "50",
      includeTest,
    } = req.query;

    const includeTestData = includeTest === 'true';
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const take = Math.min(200, Math.max(1, parseInt(String(pageSize), 10) || 50));
    const skip = (pageNum - 1) * take;

    const hotelFilter: Record<string, unknown> = {};
    if (!includeTestData) {
      hotelFilter.isTest = false;
    }

    const where: Record<string, unknown> = {
      highLossFlag: true,
    };

    if (hotelId && typeof hotelId === "string") {
      where.hotelId = Number(hotelId);
    }

    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) dateFilter.gte = new Date(String(startDate));
      if (endDate) dateFilter.lte = new Date(String(endDate));
      where.date = dateFilter;
    }

    if (Object.keys(hotelFilter).length > 0) {
      where.hotel = hotelFilter;
    }

    const [rows, total] = await Promise.all([
      prisma.hotelDailyReport.findMany({
        where,
        skip,
        take,
        orderBy: { date: "desc" },
        select: {
          id: true,
          hotelId: true,
          date: true,
          roomSold: true,
          totalRoom: true,
          total: true,
          highLossFlag: true,
        },
      }),
      prisma.hotelDailyReport.count({ where }),
    ]);

    const items = rows.map((r: (typeof rows)[number]) => ({
      id: r.id,
      hotelId: r.hotelId,
      date: r.date,
      roomsSold: r.roomSold,
      roomsAvailable: r.totalRoom,
      roomRevenue: r.total,
      highLossFlag: r.highLossFlag,
    }));

    return res.status(200).json({
      items,
      total,
      page: pageNum,
      pageSize: take,
      totalPages: Math.ceil(total / take),
    });
  } catch (err) {
    console.error("High-loss reports error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
