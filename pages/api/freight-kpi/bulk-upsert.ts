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
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (
      !dbUser ||
      (!hasPermission(dbUser, "adminPanel", "admin") &&
        dbUser.role !== "VENTURE_HEAD")
    ) {
      return res.status(403).json({
        error: "Forbidden: cannot bulk upsert freight KPIs",
      });
    }

    const { rows } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res
        .status(400)
        .json({ error: "rows must be a non-empty array" });
    }

    let updated = 0;
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      try {
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
        } = row;

        if (!ventureId || !date) {
          errors.push({
            index: i,
            error: "Missing ventureId or date",
          });
          continue;
        }

        const parsedVentureId = Number(ventureId);
        const parsedDate = new Date(date);
        parsedDate.setUTCHours(0, 0, 0, 0);

        if (
          !Number.isFinite(parsedVentureId) ||
          isNaN(parsedDate.getTime())
        ) {
          errors.push({
            index: i,
            error: "Invalid ventureId or date",
          });
          continue;
        }

        await upsertFreightKpiDaily({
          ventureId: parsedVentureId,
          date: parsedDate,
          loadsInbound:
            loadsInbound != null ? Number(loadsInbound) : undefined,
          loadsQuoted:
            loadsQuoted != null ? Number(loadsQuoted) : undefined,
          loadsCovered:
            loadsCovered != null ? Number(loadsCovered) : undefined,
          loadsLost: loadsLost != null ? Number(loadsLost) : undefined,
          totalRevenue:
            totalRevenue != null ? Number(totalRevenue) : undefined,
          totalCost: totalCost != null ? Number(totalCost) : undefined,
          totalProfit:
            totalProfit != null ? Number(totalProfit) : undefined,
          avgMarginPct:
            avgMarginPct != null ? Number(avgMarginPct) : undefined,
          activeShippers:
            activeShippers != null ? Number(activeShippers) : undefined,
          newShippers:
            newShippers != null ? Number(newShippers) : undefined,
          activeCarriers:
            activeCarriers != null ? Number(activeCarriers) : undefined,
          newCarriers:
            newCarriers != null ? Number(newCarriers) : undefined,
        });

        updated++;
      } catch (innerErr: any) {
        console.error(
          `freight-kpi/bulk-upsert row ${i} error:`,
          innerErr
        );
        errors.push({
          index: i,
          error: innerErr?.message || "Unknown error",
        });
      }
    }

    return res.status(200).json({
      success: true,
      updated,
      errors,
    });
  } catch (error) {
    console.error("freight-kpi/bulk-upsert error:", error);
    return res.status(500).json({
      error: "Failed to bulk upsert freight KPIs",
    });
  }
});
