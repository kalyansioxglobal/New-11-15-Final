// pages/api/holdings/kpi/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { withUser } from "@/lib/api";
import { getUserScope } from "@/lib/scope";
import { getHoldingsKpis } from "@/lib/kpiHoldings";

const ALLOWED_ROLES = ["CEO", "ADMIN", "COO", "FINANCE"];

export default withUser(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  user
) {
  if (!ALLOWED_ROLES.includes(user.role)) {
    return res.status(403).json({ error: "Forbidden - insufficient role permissions" });
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { ventureId, asOf } = req.query;
    const scope = getUserScope(user);

    let parsedVentureId: number | undefined;
    if (ventureId && typeof ventureId === "string") {
      const vId = parseInt(ventureId, 10);
      if (isNaN(vId) || vId <= 0) {
        return res
          .status(400)
          .json({ error: "ventureId must be a valid positive integer" });
      }
      parsedVentureId = vId;

      if (!scope.allVentures && !scope.ventureIds.includes(vId)) {
        return res
          .status(403)
          .json({ error: "Forbidden: no access to this venture" });
      }
    }

    const asOfDate =
      typeof asOf === "string" && asOf
        ? new Date(asOf)
        : new Date();

    const summary = await getHoldingsKpis({
      ventureId: parsedVentureId,
      asOf: asOfDate,
    });

    return res.status(200).json({ summary });
  } catch (err) {
    console.error("Holdings KPI fetch error:", err);
    return res.status(500).json({
      error: "Failed to fetch holdings KPIs",
    });
  }
});
