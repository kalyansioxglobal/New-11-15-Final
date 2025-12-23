// pages/api/hotel-kpi/bulk-upsert.ts
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
        error: "Forbidden: cannot bulk upload KPIs",
      });
    }

    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res
        .status(400)
        .json({ error: "rows must be a non-empty array" });
    }

    let updated = 0;
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      try {
        const {
          ventureId,
          hotelId,
          date,
          roomsAvailable,
          roomsSold,
          roomRevenue,
          otherRevenue,
          roomsOutOfOrder,
        } = row;

        if (!ventureId || !hotelId || !date) {
          errors.push({
            index: i,
            error: "Missing ventureId, hotelId, or date",
          });
          continue;
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
          errors.push({
            index: i,
            error: "Invalid ventureId, hotelId, or date",
          });
          continue;
        }

        await upsertHotelKpiDaily({
          ventureId: parsedVentureId,
          hotelId: parsedHotelId,
          date: parsedDate,
          roomsAvailable:
            roomsAvailable != null
              ? Number(roomsAvailable)
              : undefined,
          roomsSold:
            roomsSold != null ? Number(roomsSold) : undefined,
          roomRevenue:
            roomRevenue != null ? Number(roomRevenue) : undefined,
          otherRevenue:
            otherRevenue != null ? Number(otherRevenue) : undefined,
          roomsOutOfOrder:
            roomsOutOfOrder != null
              ? Number(roomsOutOfOrder)
              : undefined,
        });

        updated++;
      } catch (innerErr: any) {
        console.error(
          `hotel-kpi/bulk-upsert row ${i} error:`,
          innerErr
        );
        errors.push({
          index: i,
          error: innerErr?.message || "Unknown error",
        });
      }
    }

    return res.status(200).json({ success: true, updated, errors });
  } catch (error) {
    console.error("Hotel KPI bulk upsert error:", error);
    return res.status(500).json({
      error: "Failed to bulk upsert hotel KPIs",
    });
  }
});
