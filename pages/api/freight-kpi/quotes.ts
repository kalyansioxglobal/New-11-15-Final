import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { enforceScope } from "@/lib/permissions";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions as any) as { user?: any } | null;
  if (!session?.user) return res.status(401).json({ error: "Unauthorized" });

  const user = session.user;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { targetUserId, ventureId, officeId, date, quotesGiven, quotesWon, revenueGenerated } =
      req.body;

    if (!targetUserId || !ventureId || !date) {
      return res.status(400).json({
        error: "targetUserId, ventureId, and date are required",
      });
    }

    const vId = Number(ventureId);
    const uId = Number(targetUserId);
    const oId = officeId ? Number(officeId) : null;
    const qGiven = quotesGiven != null ? Number(quotesGiven) : null;
    const qWon = quotesWon != null ? Number(quotesWon) : null;
    const rev =
      revenueGenerated != null ? Number(revenueGenerated) : null;

    if (!vId || !uId) {
      return res.status(400).json({ error: "Invalid IDs" });
    }

    if (!enforceScope(user, { ventureId: vId })) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const kpiDate = new Date(date);
    kpiDate.setHours(0, 0, 0, 0);

    const existing = await prisma.employeeKpiDaily.findFirst({
      where: { userId: uId, ventureId: vId, officeId: oId, date: kpiDate },
    });

    if (existing) {
      const updated = await prisma.employeeKpiDaily.update({
        where: { id: existing.id },
        data: {
          quotesGiven:
            qGiven != null
              ? qGiven
              : existing.quotesGiven ?? undefined,
          quotesWon:
            qWon != null
              ? qWon
              : existing.quotesWon ?? undefined,
          revenueGenerated:
            rev != null
              ? rev
              : existing.revenueGenerated ?? undefined,
        },
      });
      return res.status(200).json({ kpi: updated });
    } else {
      const created = await prisma.employeeKpiDaily.create({
        data: {
          userId: uId,
          ventureId: vId,
          officeId: oId,
          date: kpiDate,
          quotesGiven: qGiven ?? undefined,
          quotesWon: qWon ?? undefined,
          revenueGenerated: rev ?? undefined,
        },
      });
      return res.status(201).json({ kpi: created });
    }
  } catch (err) {
    console.error("freight-kpi/quotes error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
