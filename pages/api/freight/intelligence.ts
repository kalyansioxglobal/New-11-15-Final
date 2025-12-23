import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";
import { canAccessFreightIntelligence } from "@/lib/permissions";
import { computeLaneRiskScore } from "@/lib/freight-intelligence/laneRiskScore";
import { computeCsrFreightPerformanceScore } from "@/lib/freight-intelligence/csrFreightPerformanceScore";
import { computeShipperHealthScore } from "@/lib/freight-intelligence/shipperHealthScore";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  if (!canAccessFreightIntelligence(user)) {
    return res.status(403).json({ error: "Forbidden - insufficient permissions" });
  }

  const includeTest = req.query.includeTest === "true";

  try {
    const laneFilter = includeTest ? {} : { isTest: false };

    const laneStats = await prisma.load.groupBy({
      by: ["pickupState", "dropState"],
      where: {
        ...laneFilter,
        pickupState: { not: null },
        dropState: { not: null },
      },
      _count: { id: true },
      _avg: { marginAmount: true },
    });

    type LaneStat = {
      pickupState: string | null;
      dropState: string | null;
      _count: { id: number };
      _avg: { marginAmount: number | null };
    };

    const allLaneRisks = laneStats
      .filter((ls: LaneStat) => ls.pickupState && ls.dropState)
      .map((lane: LaneStat) => {
        const originState = lane.pickupState || "";
        const destState = lane.dropState || "";
        const laneId = `${originState}-${destState}`;
        const loads = lane._count.id;
        const avgMargin = lane._avg.marginAmount || 0;

        const riskResult = computeLaneRiskScore({
          laneId,
          originState,
          destinationState: destState,
          historicalLoads: loads,
          winRate: 0.5,
          avgMargin: avgMargin,
          avgFalloffRate: 0.1,
          avgLatePickupRate: 0.05,
        });

        return {
          laneId,
          origin: originState,
          destination: destState,
          score: riskResult.score,
          riskLevel: riskResult.riskLevel,
          loads,
          avgMargin,
          signals: riskResult.signals,
        };
      });

    const laneRisks = allLaneRisks
      .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
      .slice(0, 50);

    const csrStats = await prisma.load.groupBy({
      by: ["csrAliasId"],
      where: {
        ...laneFilter,
        csrAliasId: { not: null },
      },
      _count: { id: true },
      _avg: { marginAmount: true },
    });

    type CsrStat = {
      csrAliasId: number | null;
      _count: { id: number };
      _avg: { marginAmount: number | null };
    };

    const csrAliasIds = csrStats
      .filter((c: CsrStat) => c.csrAliasId)
      .map((c: CsrStat) => c.csrAliasId as number);

    const staffAliases = await prisma.staffAlias.findMany({
      where: { id: { in: csrAliasIds } },
      select: { id: true, name: true, userId: true },
    });

    const staffAliasMap = new Map(staffAliases.map((a) => [a.id, a]));

    const csrPerformance = csrStats
      .filter((c: CsrStat) => c.csrAliasId)
      .map((csr: CsrStat) => {
        const aliasId = csr.csrAliasId as number;
        const alias = staffAliasMap.get(aliasId);
        const loadsSecured = csr._count.id;
        const avgMargin = csr._avg.marginAmount || 0;

        const perfResult = computeCsrFreightPerformanceScore({
          userId: alias?.userId || aliasId,
          loadsSecured,
          totalQuotes: Math.ceil(loadsSecured * 1.5),
          avgMargin,
          medianResponseMinutes: 20,
          laneDiversity: 5,
          repeatShipperLoads: Math.floor(loadsSecured * 0.4),
          totalLoads: loadsSecured,
        });

        return {
          aliasId,
          userId: alias?.userId || null,
          name: alias?.name || `CSR #${aliasId}`,
          score: perfResult.score,
          loadsSecured,
          totalQuotes: Math.ceil(loadsSecured * 1.5),
          avgMargin,
          strengths: perfResult.strengths,
          weaknesses: perfResult.weaknesses,
        };
      })
      .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
      .slice(0, 30);

    const shipperStats = await prisma.load.groupBy({
      by: ["shipperId"],
      where: {
        ...laneFilter,
        shipperId: { not: null },
      },
      _count: { id: true },
      _avg: { marginAmount: true },
    });

    type ShipperStat = {
      shipperId: number | null;
      _count: { id: number };
      _avg: { marginAmount: number | null };
    };

    const shipperIds = shipperStats
      .filter((s: ShipperStat) => s.shipperId)
      .map((s: ShipperStat) => s.shipperId as number);

    const shippers = await prisma.logisticsShipper.findMany({
      where: { id: { in: shipperIds } },
      select: { id: true, name: true },
    });

    const shipperMap = new Map(shippers.map((s) => [s.id, s]));

    const laneCountByShipper = new Map<number, number>();
    const loadsByShipper = await prisma.load.groupBy({
      by: ["shipperId", "pickupState", "dropState"],
      where: {
        ...laneFilter,
        shipperId: { not: null },
      },
      _count: { id: true },
    });

    for (const row of loadsByShipper) {
      if (row.shipperId) {
        laneCountByShipper.set(
          row.shipperId,
          (laneCountByShipper.get(row.shipperId) || 0) + 1
        );
      }
    }

    const shipperHealth = shipperStats
      .filter((s: ShipperStat) => s.shipperId)
      .map((shipper: ShipperStat) => {
        const shipperId = shipper.shipperId as number;
        const shipperInfo = shipperMap.get(shipperId);
        const avgMargin = shipper._avg.marginAmount || 0;
        const loads = shipper._count.id;
        const laneDiversity = laneCountByShipper.get(shipperId) || 1;

        const healthResult = computeShipperHealthScore({
          shipperId,
          lastLoads: loads,
          avgMargin,
          expectedFrequency: 10,
          actualFrequency: loads,
          responseRate: 0.7,
          csrTouchpoints: Math.ceil(loads * 0.3),
          laneDiversity,
          cancellations: 0,
          latePickups: 0,
        });

        return {
          shipperId,
          name: shipperInfo?.name || `Shipper #${shipperId}`,
          score: healthResult.score,
          riskLevel: healthResult.riskLevel,
          contributingFactors: healthResult.contributingFactors,
        };
      })
      .sort((a: { score: number }, b: { score: number }) => a.score - b.score)
      .slice(0, 50);

    return res.status(200).json({
      laneRisks,
      csrPerformance,
      shipperHealth,
    });
  } catch (error: unknown) {
    console.error("Freight intelligence error:", error);
    return res.status(500).json({ error: "Failed to load intelligence data" });
  }
}
