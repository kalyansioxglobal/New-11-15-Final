import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { getEffectiveUser } from "@/lib/effectiveUser";
import { getUserScope } from "@/lib/scope";
import { canManageGamificationConfig } from "@/lib/permissions";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await getEffectiveUser(req, res);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { ventureId } = req.query;

  if (!ventureId) {
    return res.status(400).json({ error: "ventureId is required" });
  }

  const parsedVentureId = parseInt(ventureId as string, 10);
  const scope = getUserScope(user);
  if (!scope.allVentures && !scope.ventureIds.includes(parsedVentureId)) {
    return res.status(403).json({ error: "Forbidden - venture access denied" });
  }

  try {
    if (req.method === "GET") {
      const config = await prisma.gamificationConfig.findUnique({
        where: { ventureId: parsedVentureId },
      });

      return res.status(200).json({ config });
    }

    if (req.method === "POST" || req.method === "PUT") {
      if (!canManageGamificationConfig(user)) {
        return res.status(403).json({ error: "Forbidden - only leadership can modify gamification config" });
      }

      const { isEnabled, showLeaderboard, showBadges, pointsConfig } = req.body;

      const configData = {
        isEnabled: isEnabled ?? true,
        showLeaderboard: showLeaderboard ?? true,
        showBadges: showBadges ?? true,
        pointsConfig: pointsConfig ?? null,
      };

      const config = await prisma.gamificationConfig.upsert({
        where: { ventureId: parseInt(ventureId as string, 10) },
        update: {
          config: configData,
        },
        create: {
          ventureId: parseInt(ventureId as string, 10),
          config: configData,
        },
      });

      return res.status(200).json({ config });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Gamification config error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
