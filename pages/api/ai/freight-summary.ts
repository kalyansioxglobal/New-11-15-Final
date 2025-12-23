import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";
import { getUserScope } from "@/lib/scope";
import { canViewPortfolioResource } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import { generateRequestId } from "@/lib/requestId";
import { aiConfig } from "@/lib/config/ai";
import { AiDisabledError } from "@/lib/ai/aiClient";
import {
  generateFreightSummary,
  type FreightSummaryMetricsInput,
  type FreightIntelligenceSnapshot,
} from "@/lib/ai/freightSummaryAssistant";
import {
  computeLaneRiskScore,
  type LaneRiskScore,
} from "@/lib/freight-intelligence/laneRiskScore";
import {
  computeShipperHealthScore,
} from "@/lib/freight-intelligence/shipperHealthScore";
import {
  computeCsrFreightPerformanceScore,
} from "@/lib/freight-intelligence/csrFreightPerformanceScore";
import {
  computeCarrierLaneAffinity,
} from "@/lib/freight-intelligence/carrierLaneAffinity";
import {
  computeCarrierAvailabilityScore,
} from "@/lib/freight-intelligence/carrierAvailabilityScore";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  const requestId =
    (req.headers && (req.headers["x-request-id"] as string)) ||
    generateRequestId();

  // AI feature gating
  if (!aiConfig.enabled || !aiConfig.freightAssistantEnabled) {
    return res.status(503).json({ error: "AI_ASSISTANT_DISABLED" });
  }

  // Leadership-level RBAC: mirror freight portfolio / dashboard views
  if (!canViewPortfolioResource(user, "LOGISTICS_PNL_VIEW")) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }

  const scope = getUserScope(user);
  const ventureId = req.query.ventureId ? Number(req.query.ventureId) : undefined;
  const includeTest = req.query.includeTest === "true";
  const windowDays = 7;

  if (!ventureId) {
    return res.status(400).json({ error: "ventureId is required" });
  }

  if (!scope.allVentures && !scope.ventureIds.includes(ventureId)) {
    return res.status(403).json({ error: "FORBIDDEN_VENTURE" });
  }

  logger.info("api_request", {
    endpoint: "/api/ai/freight-summary",
    userId: user.id,
    userRole: user.role,
    outcome: "start",
    requestId,
  });

  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - (windowDays - 1) * 24 * 60 * 60 * 1000);

    const baseWhere: any = {
      ventureId,
      createdAt: { gte: windowStart, lte: now },
    };
    if (!includeTest) {
      baseWhere.isTest = false;
    }

    // Basic KPIs: loads + margin + coverage
    const loads = await prisma.load.findMany({
      where: baseWhere,
      select: {
        id: true,
        status: true,
        buyRate: true,
        sellRate: true,
        pickupState: true,
        dropState: true,
        shipperId: true,
        carrierId: true,
        createdById: true,
      },
    });

    const totalLoads = loads.length;
    const coveredLoads = loads.filter((l: any) => l.status === "COVERED").length;
    const coveredRate = totalLoads > 0 ? coveredLoads / totalLoads : 0;

    let totalMargin = 0;
    let marginCount = 0;
    for (const l of loads) {
      if (l.buyRate != null && l.sellRate != null) {
        totalMargin += (l.sellRate || 0) - (l.buyRate || 0);
        marginCount += 1;
      }
    }
    const avgMargin = marginCount > 0 ? totalMargin / marginCount : 0;

    // Simple lane aggregation
    const laneKey = (o: string | null | undefined, d: string | null | undefined) =>
      `${o || "UNKNOWN"}->${d || "UNKNOWN"}`;

    const laneMap = new Map<
      string,
      { origin: string; destination: string; loads: number; buy: number; sell: number }
    >();

    for (const l of loads) {
      const key = laneKey(l.pickupState, l.dropState);
      if (!laneMap.has(key)) {
        laneMap.set(key, {
          origin: l.pickupState || "UNKNOWN",
          destination: l.dropState || "UNKNOWN",
          loads: 0,
          buy: 0,
          sell: 0,
        });
      }
      const agg = laneMap.get(key)!;
      agg.loads += 1;
      agg.buy += l.buyRate || 0;
      agg.sell += l.sellRate || 0;
    }

    const laneEntries = Array.from(laneMap.entries());

    const topLanes = laneEntries
      .map(([key, agg]) => ({
        laneId: key,
        origin: agg.origin,
        destination: agg.destination,
        loads: agg.loads,
      }))
      .sort((a, b) => b.loads - a.loads)
      .slice(0, 10);

    // Shipper & carrier & CSR aggregates (very light)
    const shipperIds = Array.from(
      new Set(loads.map((l: any) => l.shipperId).filter(Boolean) as number[]),
    );
    const carrierIds = Array.from(
      new Set(loads.map((l: any) => l.carrierId).filter(Boolean) as number[]),
    );
    const userIds = Array.from(
      new Set(loads.map((l: any) => l.createdById).filter(Boolean) as number[]),
    );

    const [shippers, carriers, users] = await Promise.all([
      prisma.logisticsShipper.findMany({
        where: { id: { in: shipperIds } },
        select: { id: true, name: true },
      }),
      prisma.carrier.findMany({
        where: { id: { in: carrierIds } },
        select: { id: true, name: true },
      }),
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, fullName: true },
      }),
    ]);

    const shipperMap = new Map(shippers.map((s: any) => [s.id, s]));
    const carrierMap = new Map(carriers.map((c: any) => [c.id, c]));
    const userMap = new Map(users.map((u: any) => [u.id, u]));

    // Build per-shipper aggregates
    const shipperAgg = new Map<
      number,
      {
        id: number;
        loads: number;
        margin: number;
        marginCount: number;
      }
    >();

    // Per-carrier aggregates
    const carrierAgg = new Map<
      number,
      {
        id: number;
        loads: number;
      }
    >();

    // Per-CSR aggregates
    const csrAgg = new Map<
      number,
      {
        id: number;
        loadsSecured: number;
      }
    >();

    for (const l of loads) {
      if (l.shipperId) {
        if (!shipperAgg.has(l.shipperId)) {
          shipperAgg.set(l.shipperId, {
            id: l.shipperId,
            loads: 0,
            margin: 0,
            marginCount: 0,
          });
        }
        const agg = shipperAgg.get(l.shipperId)!;
        agg.loads += 1;
        if (l.buyRate != null && l.sellRate != null) {
          agg.margin += (l.sellRate || 0) - (l.buyRate || 0);
          agg.marginCount += 1;
        }
      }

      if (l.carrierId) {
        if (!carrierAgg.has(l.carrierId)) {
          carrierAgg.set(l.carrierId, { id: l.carrierId, loads: 0 });
        }
        const agg = carrierAgg.get(l.carrierId)!;
        agg.loads += 1;
      }

      if (l.createdById) {
        if (!csrAgg.has(l.createdById)) {
          csrAgg.set(l.createdById, { id: l.createdById, loadsSecured: 0 });
        }
        const agg = csrAgg.get(l.createdById)!;
        agg.loadsSecured += 1;
      }
    }

    const metrics: FreightSummaryMetricsInput = {
      windowDays,
      totalLoads,
      coveredRate,
      avgMargin,
      topLanes,
      topShippers: Array.from(shipperAgg.values())
        .sort((a, b) => b.loads - a.loads)
        .slice(0, 10)
        .map((s) => ({
          id: s.id,
          name: (shipperMap.get(s.id) as any)?.name || "Unknown",
          healthScore: 0,
          riskLevel: "unknown",
        })),
      topCarriers: Array.from(carrierAgg.values())
        .sort((a, b) => b.loads - a.loads)
        .slice(0, 10)
        .map((c) => ({
          id: c.id,
          name: (carrierMap.get(c.id) as any)?.name || "Unknown",
          laneAffinityScore: 0,
        })),
      topCsrs: Array.from(csrAgg.values())
        .sort((a, b) => b.loadsSecured - a.loadsSecured)
        .slice(0, 10)
        .map((c) => ({
          id: c.id,
          name: (userMap.get(c.id) as any)?.fullName || "Unknown",
          performanceScore: 0,
        })),
    };

    // Build intelligence snapshot using existing helpers in a minimal way.
    const intelligence: FreightIntelligenceSnapshot = {
      laneRisk: topLanes.map((lane) => {
        const score: LaneRiskScore = computeLaneRiskScore({
          laneId: lane.laneId,
          originState: lane.origin,
          destinationState: lane.destination,
          historicalLoads: lane.loads,
          winRate: 0.5,
          avgMargin: avgMargin,
          avgFalloffRate: 0.1,
          avgLatePickupRate: 0.1,
        });
        return {
          laneId: lane.laneId,
          score: score.score,
          riskLevel: score.riskLevel,
        };
      }),
      shipperHealth: Array.from(shipperAgg.values())
        .slice(0, 10)
        .map((s) => {
          const avgMarginShipper = s.marginCount
            ? s.margin / s.marginCount
            : avgMargin;
          const health = computeShipperHealthScore({
            shipperId: s.id,
            lastLoads: s.loads,
            avgMargin: avgMarginShipper,
            expectedFrequency: s.loads,
            actualFrequency: s.loads,
            responseRate: 0.8,
            csrTouchpoints: 5,
            laneDiversity: 3,
            cancellations: 0,
            latePickups: 0,
          });
          return {
            shipperId: s.id,
            score: health.score,
            riskLevel: health.riskLevel,
          };
        }),
      carrierSignals: Array.from(carrierAgg.values())
        .slice(0, 10)
        .map((c) => {
          const affinity = computeCarrierLaneAffinity({
            carrierId: c.id,
            targetLane: {
              originState: topLanes[0]?.origin || "UNKNOWN",
              destinationState: topLanes[0]?.destination || "UNKNOWN",
            },
            history: [],
          });
          const availability = computeCarrierAvailabilityScore({
            carrierId: c.id,
            recentLoads: c.loads,
            openCapacity: 5,
            falloffRate: 0.1,
            responseRate: 0.8,
          });
          return {
            carrierId: c.id,
            laneAffinityScore: affinity.score,
            availabilityScore: availability.score,
          };
        }),
      csrPerformance: Array.from(csrAgg.values())
        .slice(0, 10)
        .map((c) => {
          const perf = computeCsrFreightPerformanceScore({
            userId: c.id,
            loadsSecured: c.loadsSecured,
            totalQuotes: Math.max(c.loadsSecured * 2, c.loadsSecured),
            avgMargin: avgMargin,
            medianResponseMinutes: 20,
            laneDiversity: 3,
            repeatShipperLoads: Math.floor(c.loadsSecured * 0.6),
            totalLoads: c.loadsSecured,
          });
          return {
            userId: c.id,
            score: perf.score,
          };
        }),
    };

    // Inject intelligence scores back into top lists (without changing core behavior)
    metrics.topShippers = metrics.topShippers.map((s) => {
      const h = intelligence.shipperHealth.find((x) => x.shipperId === s.id);
      return h
        ? { ...s, healthScore: h.score, riskLevel: h.riskLevel }
        : s;
    });

    metrics.topCarriers = metrics.topCarriers.map((c) => {
      const sig = intelligence.carrierSignals.find((x) => x.carrierId === c.id);
      return sig ? { ...c, laneAffinityScore: sig.laneAffinityScore } : c;
    });

    metrics.topCsrs = metrics.topCsrs.map((c) => {
      const sig = intelligence.csrPerformance.find((x) => x.userId === c.id);
      return sig ? { ...c, performanceScore: sig.score } : c;
    });

    const summary = await generateFreightSummary({
      userId: user.id,
      requestId,
      metrics,
      intelligence,
    });

    logger.info("api_request", {
      endpoint: "/api/ai/freight-summary",
      userId: user.id,
      userRole: user.role,
      outcome: "success",
      requestId,
    });

    return res.json({ summary, metrics, intelligence });
  } catch (err: any) {
    if (err instanceof AiDisabledError) {
      return res.status(503).json({ error: "AI_ASSISTANT_DISABLED" });
    }

    logger.error("api_request", {
      endpoint: "/api/ai/freight-summary",
      userId: user.id,
      userRole: user.role,
      outcome: "error",
      requestId,
    });
    console.error("/api/ai/freight-summary error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
