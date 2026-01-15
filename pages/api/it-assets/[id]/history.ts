import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";
import { getUserScope } from "@/lib/scope";
import { enrichHistoryWithUsers } from "@/lib/it-assets/historyUtils";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return res.status(401).json({ error: "UNAUTHENTICATED" });

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const id = Number(req.query.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const scope = getUserScope(user);

  try {
    // Verify asset exists and user has access
    const asset = await prisma.iTAsset.findUnique({
      where: { id },
      select: { id: true, ventureId: true, officeId: true },
    });

    if (!asset) return res.status(404).json({ error: "Not found" });

    // Enforce scope: user must have access to this venture/office unless global
    if (
      (!scope.allVentures && asset.ventureId && !scope.ventureIds.includes(asset.ventureId)) ||
      (!scope.allOffices && asset.officeId && !scope.officeIds.includes(asset.officeId))
    ) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    // Fetch all history entries
    const history = await prisma.iTAssetHistory.findMany({
      where: { assetId: id },
      orderBy: { createdAt: "desc" },
    });

    // Enrich history entries with user data
    const historyWithUsers = await enrichHistoryWithUsers(history);

    return res.json({ history: historyWithUsers });
  } catch (err: any) {
    console.error("IT asset history error", err);
    return res.status(500).json({ error: "Internal server error", detail: err.message || String(err) });
  }
}

