import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { withUser } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import {
  backfillShipperLastLoadDates,
  updateAllShipperChurnStatuses,
  recordDailyChurnKpis,
} from "@/lib/shipperChurn";

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

    if (!dbUser || !hasPermission(dbUser, "adminPanel", "admin")) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const ventureId = req.body.ventureId ? Number(req.body.ventureId) : undefined;

    const backfilled = await backfillShipperLastLoadDates(ventureId);

    const statusResult = await updateAllShipperChurnStatuses(ventureId);

    if (ventureId) {
      await recordDailyChurnKpis(ventureId);
    }

    return res.status(200).json({
      success: true,
      backfilledLastLoadDates: backfilled,
      statusesUpdated: statusResult.updated,
      byStatus: statusResult.byStatus,
    });
  } catch (error) {
    console.error("Shipper churn backfill error:", error);
    return res.status(500).json({ error: "Failed to backfill shipper data" });
  }
});
