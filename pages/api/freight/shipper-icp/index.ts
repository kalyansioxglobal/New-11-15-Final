import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { withUser } from "@/lib/api";
import { getUserScope } from "@/lib/scope";
import { canAccessShipperIcp } from "@/lib/permissions";
import type { LoadStatus } from "@prisma/client";

type LoadRecord = {
  id: number;
  loadStatus: LoadStatus;
  pickupCity: string | null;
  pickupState: string | null;
  dropCity: string | null;
  dropState: string | null;
  equipmentType: string | null;
  marginAmount: number | null;
  marginPercentage: number | null;
  sellRate: number | null;
  pickupDate: Date | null;
  createdAt: Date;
};

type ShipperMetrics = {
  id: number;
  name: string;
  ventureId: number | null;
  totalLoads: number;
  deliveredLoads: number;
  lostLoads: number;
  totalRevenue: number;
  totalMargin: number;
  avgMargin: number;
  avgMarginPercent: number;
  coverageRate: number;
  avgLoadValue: number;
  firstLoadDate: Date | null;
  lastLoadDate: Date | null;
  tenureDays: number;
  loadFrequencyDays: number | null;
  distinctLanes: number;
  equipmentTypes: string[];
  topLanes: { origin: string; dest: string; count: number }[];
  icpScore: number;
  tier: "A" | "B" | "C" | "D";
  growthPotential: "HIGH" | "MEDIUM" | "LOW";
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  salesRep: string | null;
  csr: string | null;
};

type IdealProfile = {
  avgMarginPercent: number;
  avgLoadValue: number;
  avgLoadsPerMonth: number;
  avgCoverageRate: number;
  avgTenureDays: number;
  avgLaneDiversity: number;
  topEquipmentTypes: { type: string; count: number }[];
  topLanes: { origin: string; dest: string; count: number }[];
};

type TierSummary = {
  tier: "A" | "B" | "C" | "D";
  count: number;
  totalRevenue: number;
  avgMargin: number;
  avgLoads: number;
};

function calculateIcpScore(input: {
  avgMarginPercent: number;
  avgLoadValue: number;
  loadsPerMonth: number;
  coverageRate: number;
  tenureDays: number;
  laneDiversity: number;
  lostLoadPercent: number;
}): number {
  const marginScore = Math.min(25, (input.avgMarginPercent / 20) * 25);
  const volumeScore = Math.min(20, (input.loadsPerMonth / 10) * 20);
  const valueScore = Math.min(15, (input.avgLoadValue / 3000) * 15);
  const coverageScore = Math.min(15, (input.coverageRate / 100) * 15);
  const tenureScore = Math.min(10, (input.tenureDays / 365) * 10);
  const laneScore = Math.min(10, (input.laneDiversity / 10) * 10);
  const lostPenalty = Math.min(10, (input.lostLoadPercent / 20) * 10);

  const raw =
    marginScore +
    volumeScore +
    valueScore +
    coverageScore +
    tenureScore +
    laneScore -
    lostPenalty;

  return Math.max(0, Math.min(100, Math.round(raw)));
}

function calculateIdealProfile(tierAShippers: ShipperMetrics[]): IdealProfile {
  if (tierAShippers.length === 0) {
    return {
      avgMarginPercent: 0,
      avgLoadValue: 0,
      avgLoadsPerMonth: 0,
      avgCoverageRate: 0,
      avgTenureDays: 0,
      avgLaneDiversity: 0,
      topEquipmentTypes: [],
      topLanes: [],
    };
  }

  const avgMarginPercent =
    tierAShippers.reduce((sum, s) => sum + s.avgMarginPercent, 0) /
    tierAShippers.length;
  const avgLoadValue =
    tierAShippers.reduce((sum, s) => sum + s.avgLoadValue, 0) /
    tierAShippers.length;
  const avgLoadsPerMonth =
    tierAShippers.reduce((sum, s) => {
      const monthlyRate = s.tenureDays > 0 ? (s.totalLoads / s.tenureDays) * 30 : 0;
      return sum + monthlyRate;
    }, 0) / tierAShippers.length;
  const avgCoverageRate =
    tierAShippers.reduce((sum, s) => sum + s.coverageRate, 0) /
    tierAShippers.length;
  const avgTenureDays =
    tierAShippers.reduce((sum, s) => sum + s.tenureDays, 0) /
    tierAShippers.length;
  const avgLaneDiversity =
    tierAShippers.reduce((sum, s) => sum + s.distinctLanes, 0) /
    tierAShippers.length;

  const equipmentCount = new Map<string, number>();
  tierAShippers.forEach((s) => {
    s.equipmentTypes.forEach((eq) => {
      equipmentCount.set(eq, (equipmentCount.get(eq) || 0) + 1);
    });
  });
  const topEquipmentTypes = Array.from(equipmentCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }));

  const laneCount = new Map<string, number>();
  tierAShippers.forEach((s) => {
    s.topLanes.forEach((lane) => {
      const key = `${lane.origin}-${lane.dest}`;
      laneCount.set(key, (laneCount.get(key) || 0) + lane.count);
    });
  });
  const topLanes = Array.from(laneCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([lane, count]) => {
      const [origin, dest] = lane.split("-");
      return { origin, dest, count };
    });

  return {
    avgMarginPercent,
    avgLoadValue,
    avgLoadsPerMonth,
    avgCoverageRate,
    avgTenureDays,
    avgLaneDiversity,
    topEquipmentTypes,
    topLanes,
  };
}

export default withUser(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  user
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!canAccessShipperIcp(user)) {
    return res.status(403).json({ error: "Forbidden - insufficient permissions" });
  }

  const scope = getUserScope(user);
  const ventureId = req.query.ventureId ? Number(req.query.ventureId) : undefined;

  if (ventureId && !scope.allVentures && !scope.ventureIds.includes(ventureId)) {
    return res.status(403).json({ error: "Forbidden - venture access denied" });
  }

  try {
    const ventureFilter = ventureId ? { ventureId } : (scope.allVentures ? {} : { ventureId: { in: scope.ventureIds } });

    const customers = await prisma.customer.findMany({
      where: {
        isActive: true,
        ...ventureFilter,
      },
      include: {
        salesRep: { select: { fullName: true } },
        csr: { select: { fullName: true } },
        loads: {
          select: {
            id: true,
            loadStatus: true,
            pickupCity: true,
            pickupState: true,
            dropCity: true,
            dropState: true,
            equipmentType: true,
            marginAmount: true,
            marginPercentage: true,
            sellRate: true,
            pickupDate: true,
            createdAt: true,
          },
        },
      },
    });

    const now = new Date();
    const shipperMetrics: ShipperMetrics[] = [];

    for (const customer of customers) {
      const loads = customer.loads;
      if (loads.length === 0) continue;

      const deliveredLoads = loads.filter((l) => l.loadStatus === "DELIVERED");
      const lostLoads = loads.filter(
        (l) => l.loadStatus === "LOST" || l.loadStatus === "FELL_OFF"
      );
      const coveredOrDelivered = loads.filter(
        (l) => l.loadStatus === "COVERED" || l.loadStatus === "DELIVERED"
      );

      const totalRevenue = loads.reduce((sum, l) => sum + (l.sellRate || 0), 0);
      const totalMargin = loads.reduce(
        (sum, l) => sum + (l.marginAmount || 0),
        0
      );
      const avgMargin = loads.length > 0 ? totalMargin / loads.length : 0;
      const marginPercents = loads
        .filter((l) => l.marginPercentage !== null)
        .map((l) => l.marginPercentage!);
      const avgMarginPercent =
        marginPercents.length > 0
          ? marginPercents.reduce((a, b) => a + b, 0) / marginPercents.length
          : 0;
      const coverageRate =
        loads.length > 0 ? (coveredOrDelivered.length / loads.length) * 100 : 0;
      const avgLoadValue = loads.length > 0 ? totalRevenue / loads.length : 0;

      const loadDates = loads
        .map((l) => l.pickupDate || l.createdAt)
        .filter(Boolean)
        .sort((a, b) => a.getTime() - b.getTime());
      const firstLoadDate = loadDates[0] || null;
      const lastLoadDate = loadDates[loadDates.length - 1] || null;
      const tenureDays = firstLoadDate
        ? Math.floor(
            (now.getTime() - firstLoadDate.getTime()) / (1000 * 60 * 60 * 24)
          )
        : 0;

      let loadFrequencyDays: number | null = null;
      if (loads.length >= 2 && firstLoadDate && lastLoadDate) {
        const daySpan = Math.floor(
          (lastLoadDate.getTime() - firstLoadDate.getTime()) /
            (1000 * 60 * 60 * 24)
        );
        loadFrequencyDays =
          loads.length > 1 ? Math.round(daySpan / (loads.length - 1)) : null;
      }

      const laneMap = new Map<string, number>();
      for (const l of loads) {
        if (l.pickupState && l.dropState) {
          const key = `${l.pickupState}-${l.dropState}`;
          laneMap.set(key, (laneMap.get(key) || 0) + 1);
        }
      }
      const distinctLanes = laneMap.size;
      const topLanes = Array.from(laneMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([lane, count]) => {
          const [origin, dest] = lane.split("-");
          return { origin, dest, count };
        });

      const equipmentSet = new Set<string>();
      loads.forEach((l) => {
        if (l.equipmentType) equipmentSet.add(l.equipmentType);
      });
      const equipmentTypes = Array.from(equipmentSet);

      const icpScore = calculateIcpScore({
        avgMarginPercent,
        avgLoadValue,
        loadsPerMonth:
          tenureDays > 0 ? (loads.length / tenureDays) * 30 : loads.length,
        coverageRate,
        tenureDays,
        laneDiversity: distinctLanes,
        lostLoadPercent:
          loads.length > 0 ? (lostLoads.length / loads.length) * 100 : 0,
      });

      let tier: "A" | "B" | "C" | "D";
      if (icpScore >= 80) tier = "A";
      else if (icpScore >= 60) tier = "B";
      else if (icpScore >= 40) tier = "C";
      else tier = "D";

      const recentMonthCutoff = new Date();
      recentMonthCutoff.setMonth(recentMonthCutoff.getMonth() - 3);
      const recentLoads = loads.filter((l) => {
        const d = l.pickupDate || l.createdAt;
        return d && d >= recentMonthCutoff;
      });
      const olderLoads = loads.filter((l) => {
        const d = l.pickupDate || l.createdAt;
        return d && d < recentMonthCutoff;
      });
      
      const daysSinceRecentCutoff = Math.floor(
        (now.getTime() - recentMonthCutoff.getTime()) / (1000 * 60 * 60 * 24)
      );
      const actualRecentMonths = Math.max(1, daysSinceRecentCutoff / 30);
      const recentAvgLoads = recentLoads.length / actualRecentMonths;
      
      const olderPeriodDays = tenureDays - daysSinceRecentCutoff;
      const olderMonths = olderPeriodDays > 0 ? olderPeriodDays / 30 : 0;
      const olderAvgLoads = olderMonths > 0 ? olderLoads.length / olderMonths : 0;

      let growthPotential: "HIGH" | "MEDIUM" | "LOW";
      if (olderAvgLoads === 0 && recentLoads.length > 0) {
        growthPotential = "HIGH";
      } else if (olderAvgLoads === 0) {
        growthPotential = "MEDIUM";
      } else if (recentAvgLoads > olderAvgLoads * 1.3) {
        growthPotential = "HIGH";
      } else if (recentAvgLoads >= olderAvgLoads * 0.8) {
        growthPotential = "MEDIUM";
      } else {
        growthPotential = "LOW";
      }

      const daysSinceLastLoad = lastLoadDate
        ? Math.floor(
            (now.getTime() - lastLoadDate.getTime()) / (1000 * 60 * 60 * 24)
          )
        : 999;
      let riskLevel: "LOW" | "MEDIUM" | "HIGH";
      if (daysSinceLastLoad > 60 || tier === "D") riskLevel = "HIGH";
      else if (daysSinceLastLoad > 30 || tier === "C") riskLevel = "MEDIUM";
      else riskLevel = "LOW";

      shipperMetrics.push({
        id: customer.id,
        name: customer.name,
        ventureId: customer.ventureId,
        totalLoads: loads.length,
        deliveredLoads: deliveredLoads.length,
        lostLoads: lostLoads.length,
        totalRevenue,
        totalMargin,
        avgMargin,
        avgMarginPercent,
        coverageRate,
        avgLoadValue,
        firstLoadDate,
        lastLoadDate,
        tenureDays,
        loadFrequencyDays,
        distinctLanes,
        equipmentTypes,
        topLanes,
        icpScore,
        tier,
        growthPotential,
        riskLevel,
        salesRep: customer.salesRep?.fullName || null,
        csr: customer.csr?.fullName || null,
      });
    }

    shipperMetrics.sort((a, b) => b.icpScore - a.icpScore);

    const tierAShippers = shipperMetrics.filter((s) => s.tier === "A");
    const idealProfile: IdealProfile = calculateIdealProfile(tierAShippers);

    const tierSummary: TierSummary[] = ["A", "B", "C", "D"].map((t) => {
      const tierShippers = shipperMetrics.filter(
        (s) => s.tier === (t as "A" | "B" | "C" | "D")
      );
      return {
        tier: t as "A" | "B" | "C" | "D",
        count: tierShippers.length,
        totalRevenue: tierShippers.reduce((sum, s) => sum + s.totalRevenue, 0),
        avgMargin:
          tierShippers.length > 0
            ? tierShippers.reduce((sum, s) => sum + s.avgMarginPercent, 0) /
              tierShippers.length
            : 0,
        avgLoads:
          tierShippers.length > 0
            ? tierShippers.reduce((sum, s) => sum + s.totalLoads, 0) /
              tierShippers.length
            : 0,
      };
    });

    const acquisitionTargets = shipperMetrics
      .filter(
        (s) =>
          (s.tier === "B" || s.tier === "C") && s.growthPotential === "HIGH"
      )
      .slice(0, 20);

    const riskRewardMatrix = {
      highValueLowRisk: shipperMetrics.filter(
        (s) => s.tier === "A" && s.riskLevel === "LOW"
      ).length,
      highValueHighRisk: shipperMetrics.filter(
        (s) => s.tier === "A" && s.riskLevel !== "LOW"
      ).length,
      lowValueLowRisk: shipperMetrics.filter(
        (s) => s.tier !== "A" && s.riskLevel === "LOW"
      ).length,
      lowValueHighRisk: shipperMetrics.filter(
        (s) => s.tier !== "A" && s.riskLevel !== "LOW"
      ).length,
    };

    return res.status(200).json({
      shippers: shipperMetrics,
      idealProfile,
      tierSummary,
      acquisitionTargets,
      riskRewardMatrix,
      totals: {
        totalShippers: shipperMetrics.length,
        totalRevenue: shipperMetrics.reduce((sum, s) => sum + s.totalRevenue, 0),
        totalMargin: shipperMetrics.reduce((sum, s) => sum + s.totalMargin, 0),
        avgIcpScore:
          shipperMetrics.length > 0
            ? shipperMetrics.reduce((sum, s) => sum + s.icpScore, 0) /
              shipperMetrics.length
            : 0,
      },
    });
  } catch (error) {
    console.error("Shipper ICP Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
