import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { requireAdminPanelUser } from "@/lib/apiAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireAdminPanelUser(req, res);
  if (!user) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const { hotelId, date } = req.body;

    if (!hotelId) {
      return res.status(400).json({ error: "hotelId is required" });
    }

    const targetDate = date ? new Date(date) : new Date();
    const auditDate = new Date(
      Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate() - 1)
    );

    const existingAudit = await prisma.hotelNightAudit.findFirst({
      where: {
        hotelId: Number(hotelId),
        auditDate,
        postedToGl: true,
      },
    });

    if (existingAudit) {
      return res
        .status(400)
        .json({ error: "Night audit already posted to GL for this date." });
    }

    const daily = await prisma.hotelDailyReport.findUnique({
      where: {
        hotelId_date: {
          hotelId: Number(hotelId),
          date: auditDate,
        },
      },
      select: {
        total: true,
        cash: true,
        credit: true,
        online: true,
        refund: true,
        dues: true,
      },
    });

    if (!daily) {
      return res.status(404).json({ error: "No daily report found for audit date." });
    }

    const roomRevenue = daily.total ?? 0;
    const cashCollected = daily.cash ?? 0;
    const creditCollected = daily.credit ?? 0;
    const onlineCollected = daily.online ?? 0;
    const refunds = daily.refund ?? 0;
    const dues = daily.dues ?? 0;

    const entries = [
      {
        hotelId: Number(hotelId),
        auditDate,
        accountCode: "ROOM_REV",
        debit: 0,
        credit: roomRevenue,
        description: "Room Revenue",
      },
      {
        hotelId: Number(hotelId),
        auditDate,
        accountCode: "CASH",
        debit: cashCollected,
        credit: 0,
        description: "Cash Collected",
      },
      {
        hotelId: Number(hotelId),
        auditDate,
        accountCode: "CREDIT",
        debit: creditCollected,
        credit: 0,
        description: "Credit Card Collected",
      },
      {
        hotelId: Number(hotelId),
        auditDate,
        accountCode: "ONLINE",
        debit: onlineCollected,
        credit: 0,
        description: "Online Payments",
      },
      {
        hotelId: Number(hotelId),
        auditDate,
        accountCode: "REFUND",
        debit: 0,
        credit: refunds,
        description: "Refunds",
      },
      {
        hotelId: Number(hotelId),
        auditDate,
        accountCode: "AR_DUES",
        debit: dues,
        credit: 0,
        description: "Accounts Receivable - Dues",
      },
    ].filter((e) => e.debit > 0 || e.credit > 0);

    await prisma.$transaction(async (tx: typeof prisma) => {
      await tx.generalLedgerEntry.createMany({ data: entries });
      await tx.hotelNightAudit.upsert({
        where: {
          hotelId_auditDate: {
            hotelId: Number(hotelId),
            auditDate,
          },
        },
        create: {
          hotelId: Number(hotelId),
          auditDate,
          postedToGl: true,
          postedByUserId: user.id,
          postedAt: new Date(),
        },
        update: {
          postedToGl: true,
          postedByUserId: user.id,
          postedAt: new Date(),
        },
      });
    });

    return res.status(200).json({ ok: true, auditDate: auditDate.toISOString() });
  } catch (err) {
    console.error("Night audit error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
