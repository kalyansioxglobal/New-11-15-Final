import type { NextApiRequest, NextApiResponse } from "next";
import { withUser } from "@/lib/api";
import { getUserScope } from "@/lib/scope";
import prisma from "@/lib/prisma";

export default withUser(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  user
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const scope = getUserScope(user);
  const ventureId = req.query.ventureId ? Number(req.query.ventureId) : undefined;
  const includeTest = req.query.includeTest === "true";

  if (!ventureId) {
    return res.status(400).json({ error: "ventureId is required" });
  }

  if (!scope.allVentures && !scope.ventureIds.includes(ventureId)) {
    return res.status(403).json({ error: "Forbidden - venture access denied" });
  }

  try {
    const customers = await prisma.customer.findMany({
      where: {
        ventureId,
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        lastLoadDate: true,
        churnRiskScore: true,
        churnStatus: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { lastLoadDate: "desc" },
      take: 100,
    });

    const summary = {
      total: customers.length,
      active: customers.filter((c) => c.isActive).length,
      atRisk: customers.filter((c) => c.churnStatus === "AT_RISK").length,
      churned: customers.filter((c) => c.churnStatus === "CHURNED").length,
      avgRiskScore:
        customers.length > 0
          ? customers.reduce((sum, c) => sum + (c.churnRiskScore || 0), 0) / customers.length
          : 0,
    };

    return res.status(200).json({
      customers,
      summary,
    });
  } catch (error) {
    console.error("Shipper health API error:", error);
    return res.status(500).json({ error: "Failed to fetch shipper health data" });
  }
});
