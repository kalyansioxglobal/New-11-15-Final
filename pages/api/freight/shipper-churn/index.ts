import type { NextApiRequest, NextApiResponse } from "next";
import { withUser } from "@/lib/api";
import { getUserScope } from "@/lib/scope";
import { canAccessShipperChurn } from "@/lib/permissions";
import {
  getShipperChurnSummary,
  getAtRiskShippers,
  getChurnedShippers,
  getHighRiskShippers,
  updateAllShipperChurnStatuses,
  recordDailyChurnKpis,
} from "@/lib/shipperChurn";

export default withUser(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  user
) {
  if (!canAccessShipperChurn(user)) {
    return res.status(403).json({ error: "Forbidden - insufficient permissions" });
  }

  const scope = getUserScope(user);
  const ventureId = req.query.ventureId ? Number(req.query.ventureId) : undefined;
  const includeTest = req.query.includeTest === 'true';

  if (!ventureId) {
    return res.status(400).json({ error: "ventureId is required" });
  }

  if (!scope.allVentures && !scope.ventureIds.includes(ventureId)) {
    return res.status(403).json({ error: "Forbidden - venture access denied" });
  }

  if (req.method === "GET") {
    try {
      const type = req.query.type as string || "summary";
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const minRiskScore = req.query.minRiskScore ? Number(req.query.minRiskScore) : 70;

      if (type === "summary") {
        const summary = await getShipperChurnSummary(ventureId, new Date(), includeTest);
        return res.status(200).json(summary);
      }

      if (type === "at-risk") {
        const shippers = await getAtRiskShippers(ventureId, limit, includeTest);
        return res.status(200).json({ shippers });
      }

      if (type === "churned") {
        const shippers = await getChurnedShippers(ventureId, limit, includeTest);
        return res.status(200).json({ shippers });
      }

      if (type === "high-risk") {
        const shippers = await getHighRiskShippers(ventureId, minRiskScore, limit, includeTest);
        return res.status(200).json({ shippers });
      }

      return res.status(400).json({ error: "Invalid type. Use: summary, at-risk, churned, high-risk" });
    } catch (error) {
      console.error("Shipper churn GET error:", error);
      return res.status(500).json({ error: "Failed to fetch churn data" });
    }
  }

  if (req.method === "POST") {
    try {
      const action = req.body.action as string;

      if (action === "refresh") {
        const result = await updateAllShipperChurnStatuses(ventureId, includeTest);
        await recordDailyChurnKpis(ventureId);
        return res.status(200).json({ 
          success: true, 
          updated: result.updated,
          metricsUpdated: result.metricsUpdated,
          byStatus: result.byStatus,
        });
      }

      return res.status(400).json({ error: "Invalid action. Use: refresh" });
    } catch (error) {
      console.error("Shipper churn POST error:", error);
      return res.status(500).json({ error: "Failed to update churn statuses" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
});
