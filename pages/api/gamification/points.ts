import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { getEffectiveUser } from "@/lib/effectiveUser";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await getEffectiveUser(req, res);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    if (req.method === "GET") {
      const { userId, ventureId, officeId } = req.query;

      const where: any = {};
      if (userId) where.userId = parseInt(userId as string, 10);
      if (ventureId) where.ventureId = parseInt(ventureId as string, 10);
      if (officeId) where.officeId = parseInt(officeId as string, 10);

      const events = await prisma.gamificationEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          user: { select: { id: true, fullName: true } },
        },
      });

      const total = await prisma.gamificationEvent.aggregate({
        where,
        _sum: { points: true },
      });

      return res.status(200).json({
        events,
        totalPoints: total._sum.points ?? 0,
      });
    }

    if (req.method === "POST") {
      const { userId, ventureId, officeId, eventType, points, metadata } = req.body;

      if (!userId || !ventureId || !eventType || points === undefined) {
        return res.status(400).json({
          error: "userId, ventureId, eventType, and points are required",
        });
      }

      const event = await prisma.gamificationEvent.create({
        data: {
          userId: parseInt(userId, 10),
          ventureId: parseInt(ventureId, 10),
          officeId: officeId ? parseInt(officeId, 10) : null,
          type: eventType,
          points: parseInt(points, 10),
          metadata: metadata ?? null,
        },
      });

      await prisma.gamificationPointsBalance.upsert({
        where: { userId: parseInt(userId, 10) },
        update: {
          points: { increment: parseInt(points, 10) },
        },
        create: {
          userId: parseInt(userId, 10),
          points: parseInt(points, 10),
        },
      });

      return res.status(201).json({ event });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Gamification points error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
