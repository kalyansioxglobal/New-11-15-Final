import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";
import { getUserScope } from "@/lib/scope";
import { ROLE_CONFIG } from "@/lib/permissions";

const LOST_DUES_ABS_THRESHOLD = 500;
const LOST_DUES_RATIO_THRESHOLD = 0.1;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await requireUser(req, res);
  if (!user) return;

  const hotelId = Number(req.query.id);
  if (!hotelId || isNaN(hotelId)) {
    return res.status(400).json({ error: "Invalid hotel ID" });
  }

  const hotel = await prisma.hotelProperty.findUnique({
    where: { id: hotelId },
    select: { id: true, ventureId: true, rooms: true },
  });

  if (!hotel) {
    return res.status(404).json({ error: "Hotel not found" });
  }

  const scope = getUserScope(user);
  if (!scope.allVentures && !scope.ventureIds.includes(hotel.ventureId)) {
    return res.status(403).json({ error: "Access denied to this hotel's venture" });
  }

  if (req.method === "POST") {
    const roleConfig = ROLE_CONFIG[user.role];
    if (!roleConfig.canUploadKpis) {
      return res.status(403).json({ error: "Permission denied - cannot upload KPI data" });
    }

    try {
      const {
        date,
        roomsSold,
        roomsAvailable,
        roomRevenue,
        cash,
        credit,
        online,
        refund,
        dues,
        lostDues,
        otherRevenue,
      } = req.body;

      if (!date) {
        return res.status(400).json({ error: "Date is required" });
      }

      const parsedDate = new Date(date);
      parsedDate.setUTCHours(0, 0, 0, 0);

      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: "Invalid date format" });
      }

      const sold = Number(roomsSold) || 0;
      const availableInput = Number(roomsAvailable);
      const available = !isNaN(availableInput) && availableInput > 0 ? availableInput : hotel.rooms || 0;
      
      if (available <= 0) {
        return res.status(400).json({ error: "Rooms available must be greater than 0" });
      }
      
      if (sold > available) {
        return res.status(400).json({ error: "Rooms sold cannot exceed rooms available" });
      }

      const roomRev = Number(roomRevenue) || 0;
      const otherRev = Number(otherRevenue) || 0;
      const totalRev = roomRev + otherRev;
      const cashAmt = Number(cash) || 0;
      const creditAmt = Number(credit) || 0;
      const onlineAmt = Number(online) || 0;
      const refundAmt = Number(refund) || 0;
      const duesAmt = Number(dues) || 0;
      const lostDuesAmt = Number(lostDues) || 0;

      const paymentTotal = cashAmt + creditAmt + onlineAmt;

      const occupancyPct = available > 0 ? (sold / available) * 100 : 0;
      const adr = sold > 0 ? roomRev / sold : 0;
      const revpar = available > 0 ? roomRev / available : 0;

      let highLossFlag = false;
      if (lostDuesAmt > 0 && roomRev > 0) {
        const ratio = lostDuesAmt / roomRev;
        if (lostDuesAmt >= LOST_DUES_ABS_THRESHOLD || ratio >= LOST_DUES_RATIO_THRESHOLD) {
          highLossFlag = true;
        }
      }

      await prisma.$transaction([
        prisma.hotelKpiDaily.upsert({
          where: {
            hotelId_date: { hotelId, date: parsedDate },
          },
          update: {
            roomsSold: sold,
            roomsAvailable: available,
            roomRevenue: roomRev,
            otherRevenue: otherRev,
            totalRevenue: totalRev,
            occupancyPct,
            adr,
            revpar,
          },
          create: {
            hotelId,
            ventureId: hotel.ventureId,
            date: parsedDate,
            roomsSold: sold,
            roomsAvailable: available,
            roomRevenue: roomRev,
            otherRevenue: otherRev,
            totalRevenue: totalRev,
            occupancyPct,
            adr,
            revpar,
          },
        }),
        prisma.hotelDailyReport.upsert({
          where: {
            hotelId_date: { hotelId, date: parsedDate },
          },
          update: {
            roomSold: sold,
            totalRoom: available,
            cash: cashAmt,
            credit: creditAmt,
            online: onlineAmt,
            refund: refundAmt,
            total: paymentTotal,
            dues: duesAmt,
            lostDues: lostDuesAmt,
            occupancy: occupancyPct,
            adr,
            revpar: revpar,
            highLossFlag,
          },
          create: {
            hotelId,
            date: parsedDate,
            roomSold: sold,
            totalRoom: available,
            cash: cashAmt,
            credit: creditAmt,
            online: onlineAmt,
            refund: refundAmt,
            total: paymentTotal,
            dues: duesAmt,
            lostDues: lostDuesAmt,
            occupancy: occupancyPct,
            adr,
            revpar: revpar,
            highLossFlag,
          },
        }),
      ]);

      // Log audit event for hotel daily entry
      const { logAuditEvent } = await import("@/lib/audit");
      await logAuditEvent(req, user, {
        domain: 'hotels',
        action: 'HOTEL_DAILY_ENTRY_UPDATED',
        entityType: 'hotelDailyReport',
        entityId: String(hotelId),
        metadata: {
          hotelId,
          ventureId: hotel.ventureId,
          date: parsedDate.toISOString(),
          roomsSold: sold,
          roomsAvailable: available,
          totalRevenue: totalRev,
          occupancyPct,
          adr,
          revpar,
          highLossFlag,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Daily report saved successfully",
        data: {
          date: parsedDate.toISOString(),
          roomsSold: sold,
          roomsAvailable: available,
          roomRevenue: roomRev,
          occupancyPct,
          adr,
          revpar,
          highLossFlag,
        },
      });
    } catch (err: any) {
      const { logger } = await import("@/lib/logger");
      logger.error('hotel_daily_entry_failed', {
        userId: user.id,
        hotelId,
        ventureId: hotel?.ventureId,
        error: err?.message || String(err),
        stack: process.env.NODE_ENV !== 'production' ? err?.stack : undefined,
      });
      return res.status(500).json({ error: "Failed to save daily report", detail: err?.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
