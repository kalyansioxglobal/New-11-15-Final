// pages/api/hotel-kpi/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { withUser, parseDateRange } from "@/lib/api";
import { getUserScope } from "@/lib/scope";
import { summarizeHotelKpis } from "@/lib/kpiHotel";
import { getTeamAttendanceContext } from "@/lib/attendanceKpi";

export default withUser(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  user
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { hotelId, ventureId } = req.query;
    const scope = getUserScope(user);
    const where: any = {};

    if (ventureId && typeof ventureId === "string") {
      const parsedVentureId = parseInt(ventureId, 10);
      if (isNaN(parsedVentureId) || parsedVentureId <= 0) {
        return res.status(400).json({
          error: "ventureId must be a valid positive integer",
        });
      }

      if (
        !scope.allVentures &&
        !scope.ventureIds.includes(parsedVentureId)
      ) {
        return res
          .status(403)
          .json({ error: "Forbidden: no access to this venture" });
      }

      where.ventureId = parsedVentureId;
    } else if (hotelId && typeof hotelId === "string") {
      const parsedHotelId = parseInt(hotelId, 10);
      if (isNaN(parsedHotelId) || parsedHotelId <= 0) {
        return res.status(400).json({
          error: "hotelId must be a valid positive integer",
        });
      }

      const hotel = await prisma.hotelProperty.findUnique({
        where: { id: parsedHotelId },
        select: { ventureId: true },
      });

      if (!hotel) {
        return res.status(404).json({ error: "Hotel not found" });
      }

      if (
        !scope.allVentures &&
        !scope.ventureIds.includes(hotel.ventureId)
      ) {
        return res.status(403).json({
          error: "Forbidden: no access to this hotel",
        });
      }

      where.hotelId = parsedHotelId;
    } else {
      return res.status(400).json({
        error: "hotelId or ventureId is required",
      });
    }

    const { from, to } = parseDateRange(req.query as any);

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = from;
      if (to) where.date.lte = to;
    }

    const rows = await prisma.hotelKpiDaily.findMany({
      where,
      orderBy: { date: "desc" },
      take: 90,
    });

    const summary = summarizeHotelKpis(rows);

    let attendance = null;
    const includeAttendance = req.query.includeAttendance === "true";
    const targetVentureId = where.ventureId;
    
    if (includeAttendance && from && to && targetVentureId) {
      const teamMembers = await prisma.user.findMany({
        where: {
          isActive: true,
          isTestUser: user.isTestUser,
          ventures: { some: { ventureId: targetVentureId } },
        },
        select: { id: true },
      });
      
      if (teamMembers.length > 0) {
        attendance = await getTeamAttendanceContext(
          teamMembers.map((m: { id: number }) => m.id),
          from,
          to,
          { ventureId: targetVentureId, isTest: user.isTestUser }
        );
      }
    }

    return res.status(200).json({ summary, rows, attendance });
  } catch (error) {
    console.error("Hotel KPI fetch error:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch hotel KPIs" });
  }
});
