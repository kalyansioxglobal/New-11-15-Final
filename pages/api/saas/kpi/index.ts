// pages/api/saas/kpi/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { withUser, parseDateRange } from "@/lib/api";
import { getUserScope } from "@/lib/scope";
import { getSaasKpis } from "@/lib/kpiSaas";

import { canViewPortfolioResource } from "@/lib/permissions";

export default withUser(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  user
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
    if (!canViewPortfolioResource(user, "SAAS_PORTFOLIO_VIEW")) {
      return res.status(403).json({ error: "Forbidden", detail: "Insufficient permissions for SaaS KPI" });
    }


  try {
    const { ventureId } = req.query;
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

    const { from, to } = parseDateRange(req.query as any);

    const summary = await getSaasKpis({
      ventureId: parsedVentureId,
      from,
      to,
    });

    return res.status(200).json({ summary });
  } catch (error) {
    console.error("SaaS KPI fetch error:", error);
    return res.status(500).json({ error: "Failed to fetch SaaS KPIs" });
  }
});
