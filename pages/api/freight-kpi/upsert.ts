import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { withUser } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import { upsertFreightKpiDaily } from "@/lib/kpiFreight";

export default withUser(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  user
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Convert SessionUser -> DB User for hasPermission
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (
      !dbUser ||
      (!hasPermission(dbUser, "adminPanel", "admin") &&
        dbUser.role !== "VENTURE_HEAD")
    ) {
      return res.status(403).json({
        error: "Forbidden: cannot upsert freight KPIs",
      });
    }

    const {
      ventureId,
      date,
      loadsInbound,
      loadsQuoted,
      loadsCovered,
      loadsLost,
      totalRevenue,
      totalCost,
      totalProfit,
      avgMarginPct,
      activeShippers,
      newShippers,
      activeCarriers,
      newCarriers,
    } = req.body;

    if (!ventureId || !date) {
      return res.status(400).json({
        error: "ventureId and date are required",
      });
    }

    const parsedVentureId = Number(ventureId);
    const parsedDate = new Date(date);
    parsedDate.setUTCHours(0, 0, 0, 0);

    if (!Number.isFinite(parsedVentureId) || isNaN(parsedDate.getTime())) {
      return res
        .status(400)
        .json({ error: "Invalid ventureId or date" });
    }

    const kpi = await upsertFreightKpiDaily({
      ventureId: parsedVentureId,
      date: parsedDate,
      loadsInbound: loadsInbound != null ? Number(loadsInbound) : undefined,
      loadsQuoted: loadsQuoted != null ? Number(loadsQuoted) : undefined,
      loadsCovered: loadsCovered != null ? Number(loadsCovered) : undefined,
      loadsLost: loadsLost != null ? Number(loadsLost) : undefined,
      totalRevenue: totalRevenue != null ? Number(totalRevenue) : undefined,
      totalCost: totalCost != null ? Number(totalCost) : undefined,
      totalProfit: totalProfit != null ? Number(totalProfit) : undefined,
      avgMarginPct: avgMarginPct != null ? Number(avgMarginPct) : undefined,
      activeShippers:
        activeShippers != null ? Number(activeShippers) : undefined,
      newShippers: newShippers != null ? Number(newShippers) : undefined,
      activeCarriers:
        activeCarriers != null ? Number(activeCarriers) : undefined,
      newCarriers: newCarriers != null ? Number(newCarriers) : undefined,
    });

    return res.status(200).json({ success: true, kpi });
  } catch (error) {
    console.error("freight-kpi/upsert error:", error);
    return res
      .status(500)
      .json({ error: "Failed to upsert freight KPI" });
  }
});
