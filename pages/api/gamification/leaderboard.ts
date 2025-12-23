import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { getEffectiveUser } from "@/lib/effectiveUser";
import { getUserScope } from "@/lib/scope";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await getEffectiveUser(req, res);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { ventureId, officeId, limit = "10" } = req.query;

  if (!ventureId) {
    return res.status(400).json({ error: "ventureId is required" });
  }

  const parsedVentureId = parseInt(ventureId as string, 10);
  const scope = getUserScope(user);
  if (!scope.allVentures && !scope.ventureIds.includes(parsedVentureId)) {
    return res.status(403).json({ error: "Forbidden - venture access denied" });
  }

  try {
    const where: { ventureId: number; officeId?: number } = {
      ventureId: parsedVentureId,
    };
    if (officeId) {
      where.officeId = parseInt(officeId as string, 10);
    }

    const events = await prisma.gamificationEvent.groupBy({
      by: ["userId"],
      where,
      _sum: {
        points: true,
      },
      orderBy: {
        _sum: {
          points: "desc",
        },
      },
      take: parseInt(limit as string, 10),
    });

    const userIds = events.map((e: (typeof events)[number]) => e.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fullName: true },
    });

    const userMap = new Map(
      users.map((u: (typeof users)[number]) => [u.id, u.fullName]),
    );

    const leaderboard = events.map((entry: (typeof events)[number], idx: number) => ({
      userId: entry.userId,
      userName: userMap.get(entry.userId) || "Unknown",
      totalPoints: entry._sum.points ?? 0,
      rank: idx + 1,
    }));

    return res.status(200).json({ leaderboard });
  } catch (error) {
    console.error("Gamification leaderboard error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
