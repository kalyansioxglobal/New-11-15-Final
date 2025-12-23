import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { requireUser } from '@/lib/apiAuth';

const LOST_DUES_ABS_THRESHOLD = 100;
const LOST_DUES_RATIO_THRESHOLD = 0.05;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await requireUser(req, res);
  if (!user) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end("Method Not Allowed");
  }

  const now = new Date();
  const todayMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const yesterdayStart = new Date(
    todayMidnight.getTime() - 24 * 60 * 60 * 1000
  );
  const yesterdayEnd = todayMidnight;

  try {
    const reports = await prisma.hotelDailyReport.findMany({
      where: {
        date: {
          gte: yesterdayStart,
          lt: yesterdayEnd,
        },
      },
    });

    let flaggedCount = 0;
    let updatedCount = 0;

    for (const r of reports) {
      const total = r.total ?? 0;
      const lostDues = r.lostDues ?? 0;
      const roomSold = r.roomSold ?? 0;

      const adrNet = roomSold > 0 ? (total - lostDues) / roomSold : 0;

      let isHighLoss = false;
      if (lostDues > 0 && total > 0) {
        const ratio = lostDues / total;
        if (
          lostDues >= LOST_DUES_ABS_THRESHOLD ||
          ratio >= LOST_DUES_RATIO_THRESHOLD
        ) {
          isHighLoss = true;
        }
      }

      if (r.adr !== adrNet || r.highLossFlag !== isHighLoss) {
        await prisma.hotelDailyReport.update({
          where: { id: r.id },
          data: {
            adr: adrNet,
            highLossFlag: isHighLoss,
          },
        });
        updatedCount++;
        if (isHighLoss) flaggedCount++;
      }
    }

    return res.status(200).json({
      ok: true,
      scanned: reports.length,
      updated: updatedCount,
      highLossDays: flaggedCount,
    });
  } catch (err) {
    console.error("nightly-loss-scan error", err);
    return res.status(500).json({ error: "Nightly scan failed" });
  }
}
