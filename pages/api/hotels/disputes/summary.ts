import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../lib/prisma";
import { requireHotelAccess } from "../../../../lib/hotelAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const context = await requireHotelAccess(req, res);
  if (!context) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const includeTest = req.query.includeTest === "true";

    const disputes = await prisma.hotelDispute.findMany({
      where: {
        property: {
          ...(includeTest ? {} : { isTest: false }),
        },
      },
      select: {
        propertyId: true,
        status: true,
        disputedAmount: true,
        currency: true,
        property: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const summaryMap = new Map<
      number,
      {
        propertyId: number;
        propertyName: string;
        totalDisputes: number;
        openDisputes: number;
        wonDisputes: number;
        lostDisputes: number;
        totalDisputedAmount: number;
        totalChargebackLost: number;
        currency: string;
      }
    >();

    for (const d of disputes) {
      const existing = summaryMap.get(d.propertyId);
      if (existing) {
        existing.totalDisputes += 1;
        existing.totalDisputedAmount += d.disputedAmount;
        if (d.status === "OPEN" || d.status === "IN_PROGRESS") {
          existing.openDisputes += 1;
        } else if (d.status === "WON") {
          existing.wonDisputes += 1;
        } else if (d.status === "LOST") {
          existing.lostDisputes += 1;
          existing.totalChargebackLost += d.disputedAmount;
        }
      } else {
        summaryMap.set(d.propertyId, {
          propertyId: d.propertyId,
          propertyName: d.property.name,
          totalDisputes: 1,
          openDisputes: d.status === "OPEN" || d.status === "IN_PROGRESS" ? 1 : 0,
          wonDisputes: d.status === "WON" ? 1 : 0,
          lostDisputes: d.status === "LOST" ? 1 : 0,
          totalDisputedAmount: d.disputedAmount,
          totalChargebackLost: d.status === "LOST" ? d.disputedAmount : 0,
          currency: d.currency,
        });
      }
    }

    const summary = Array.from(summaryMap.values()).sort(
      (a, b) => b.totalChargebackLost - a.totalChargebackLost,
    );

    const totals = {
      totalDisputes: summary.reduce((sum, s) => sum + s.totalDisputes, 0),
      openDisputes: summary.reduce((sum, s) => sum + s.openDisputes, 0),
      wonDisputes: summary.reduce((sum, s) => sum + s.wonDisputes, 0),
      lostDisputes: summary.reduce((sum, s) => sum + s.lostDisputes, 0),
      totalDisputedAmount: summary.reduce((sum, s) => sum + s.totalDisputedAmount, 0),
      totalChargebackLost: summary.reduce((sum, s) => sum + s.totalChargebackLost, 0),
    };

    return res.status(200).json({ summary, totals });
  } catch (err: any) {
    console.error("Failed to fetch dispute summary:", err);
    return res.status(500).json({ error: "Failed to fetch summary", detail: err.message || String(err) });
  }
}
