import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getEffectiveUser } from "@/lib/effectiveUser";
import { getUserScope } from "@/lib/scope";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await getEffectiveUser(req, res);
  if (!user) return;

  try {
    const { userId: rawUserId, ventureId: rawVentureId, date } = req.query;

    if (!rawUserId || typeof rawUserId !== "string") {
      return res.status(400).json({ error: "Missing or invalid userId" });
    }
    if (!rawVentureId || typeof rawVentureId !== "string") {
      return res.status(400).json({ error: "Missing or invalid ventureId" });
    }
    if (!date || typeof date !== "string") {
      return res.status(400).json({ error: "Missing or invalid date" });
    }

    const targetUserId = parseInt(rawUserId, 10);
    const ventureId = parseInt(rawVentureId, 10);

    if (!targetUserId || Number.isNaN(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ error: "Missing or invalid userId" });
    }
    if (!ventureId || Number.isNaN(ventureId) || ventureId <= 0) {
      return res.status(400).json({ error: "Missing or invalid ventureId" });
    }

    const scope = getUserScope(user);
    if (!scope.allVentures && !scope.ventureIds.includes(ventureId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({ error: "Missing or invalid date" });
    }
    const day = parsed.toISOString().slice(0, 10);
    const start = new Date(`${day}T00:00:00.000Z`);
    const end = new Date(`${day}T23:59:59.999Z`);

    const row = await prisma.incentiveDaily.findFirst({
      where: {
        userId: targetUserId,
        ventureId,
        date: { gte: start, lte: end },
      },
    });

    if (!row) {
      return res.status(404).json({ error: "No incentive record for this date" });
    }

    const breakdown = (row.breakdown as any) ?? null;

    const response = {
      userId: row.userId,
      ventureId: row.ventureId,
      date: day,
      amount: row.amount ?? 0,
      breakdown: breakdown ?? null,
    };

    return res.status(200).json(response);
  } catch (error: any) {
    console.error("Incentive audit daily failed", error);
    return res
      .status(500)
      .json({ error: "Failed to load incentive audit info", detail: error.message });
  }
}
