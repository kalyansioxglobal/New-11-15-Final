// pages/api/hotel-kpi/upsert.ts
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { withUser } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import { upsertHotelKpiDaily } from "@/lib/kpiHotel";

export default withUser(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  user
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (
      !dbUser ||
      (!hasPermission(dbUser, "adminPanel", "admin") &&
        dbUser.role !== "VENTURE_HEAD")
    ) {
      return res.status(403).json({
        error: "Forbidden: cannot upload KPIs",
      });
    }

    const {
      ventureId,
      hotelId,
      date,
      roomsAvailable,
      roomsSold,
      roomRevenue,
      otherRevenue,
      roomsOutOfOrder,
    } = req.body;

    if (!ventureId || !hotelId || !date) {
      return res.status(400).json({
        error: "ventureId, hotelId, and date are required",
      });
    }

    const parsedVentureId = Number(ventureId);
    const parsedHotelId = Number(hotelId);
    const parsedDate = new Date(date);
    parsedDate.setUTCHours(0, 0, 0, 0);

    if (
      !Number.isFinite(parsedVentureId) ||
      !Number.isFinite(parsedHotelId) ||
      isNaN(parsedDate.getTime())
    ) {
      return res
        .status(400)
        .json({ error: "Invalid ventureId, hotelId, or date" });
    }

    const kpi = await upsertHotelKpiDaily({
      ventureId: parsedVentureId,
      hotelId: parsedHotelId,
      date: parsedDate,
      roomsAvailable:
        roomsAvailable != null ? Number(roomsAvailable) : undefined,
      roomsSold:
        roomsSold != null ? Number(roomsSold) : undefined,
      roomRevenue:
        roomRevenue != null ? Number(roomRevenue) : undefined,
      otherRevenue:
        otherRevenue != null ? Number(otherRevenue) : undefined,
      roomsOutOfOrder:
        roomsOutOfOrder != null ? Number(roomsOutOfOrder) : undefined,
    });

    return res.status(200).json({ success: true, kpi });
  } catch (error) {
    console.error("Hotel KPI upsert error:", error);
    return res
      .status(500)
      .json({ error: "Failed to upsert hotel KPI" });
  }
});
