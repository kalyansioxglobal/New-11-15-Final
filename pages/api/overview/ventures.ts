import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from "@/lib/scope";
import { computeVentureStatus } from "@/lib/ventureStatus";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return res.status(401).json({ error: "UNAUTHENTICATED" });

  const scope = getUserScope(user);
  const { includeTest } = req.query;
  const now = new Date();
  const in30Days = new Date();
  in30Days.setDate(now.getDate() + 30);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);

  const ventureWhere: any = {};

  if (includeTest !== 'true') {
    ventureWhere.isTest = false;
  }

  if (!scope.allVentures) {
    ventureWhere.id = { in: scope.ventureIds };
  }

  const includeTestData = includeTest === 'true';
  const ventures = await prisma.venture.findMany({
    where: ventureWhere,
    include: {
      offices: {
        where: includeTestData ? {} : { isTest: false },
      },
      policies: {
        where: includeTestData ? {} : { isTest: false },
      },
      tasks: {
        where: includeTestData ? {} : { isTest: false },
      },
    },
  });

  const freightKpis = await prisma.freightKpiDaily.findMany({
    where: {
      date: { gte: sevenDaysAgo, lte: now },
      ...(scope.allVentures ? {} : { ventureId: { in: scope.ventureIds } }),
    },
  });

  const freightByVenture = new Map<
    number,
    { totalLoadsInbound: number; totalLoadsCovered: number; totalRevenue: number; totalProfit: number }
  >();

  for (const row of freightKpis) {
    const key = row.ventureId;
    const prev = freightByVenture.get(key) || {
      totalLoadsInbound: 0,
      totalLoadsCovered: 0,
      totalRevenue: 0,
      totalProfit: 0,
    };
    prev.totalLoadsInbound += row.loadsInbound;
    prev.totalLoadsCovered += row.loadsCovered;
    prev.totalRevenue += row.totalRevenue;
    prev.totalProfit += row.totalProfit;
    freightByVenture.set(key, prev);
  }

  const hotelKpis = await prisma.hotelKpiDaily.findMany({
    where: {
      date: { gte: sevenDaysAgo, lte: now },
      ...(scope.allVentures ? {} : { ventureId: { in: scope.ventureIds } }),
    },
  });

  const hotelByVenture = new Map<
    number,
    { roomsAvailable: number; roomsSold: number; roomRevenue: number }
  >();

  for (const row of hotelKpis) {
    const key = row.ventureId;
    const prev = hotelByVenture.get(key) || {
      roomsAvailable: 0,
      roomsSold: 0,
      roomRevenue: 0,
    };
    prev.roomsAvailable += row.roomsAvailable;
    prev.roomsSold += row.roomsSold;
    prev.roomRevenue += row.roomRevenue;
    hotelByVenture.set(key, prev);
  }

  const result = ventures.map((v) => {
    const policies = v.policies || [];
    const tasks = v.tasks || [];

    const hasExpiredPolicy = policies.some(
      (p) => p.endDate && p.endDate < now
    );

    const expiringPolicyCount = policies.filter(
      (p) =>
        p.endDate &&
        p.endDate > now &&
        p.endDate <= in30Days
    ).length;

    const overdueTaskCount = tasks.filter(
      (t) => t.status === "OVERDUE"
    ).length;

    const freightAgg = freightByVenture.get(v.id);
    let freightCoverage: number | undefined = undefined;
    let freightMargin: number | undefined = undefined;

    if (freightAgg && freightAgg.totalLoadsInbound > 0) {
      freightCoverage =
        (freightAgg.totalLoadsCovered / freightAgg.totalLoadsInbound) * 100;
    }
    if (freightAgg && freightAgg.totalRevenue > 0) {
      freightMargin =
        (freightAgg.totalProfit / freightAgg.totalRevenue) * 100;
    }

    const hotelAgg = hotelByVenture.get(v.id);
    let hotelOcc: number | undefined = undefined;
    let hotelRevpar: number | undefined = undefined;

    if (hotelAgg && hotelAgg.roomsAvailable > 0) {
      hotelOcc =
        (hotelAgg.roomsSold / hotelAgg.roomsAvailable) * 100;
      hotelRevpar =
        hotelAgg.roomRevenue / hotelAgg.roomsAvailable;
    }

    const status = computeVentureStatus(
      v.type,
      {
        hasExpiredPolicy,
        expiringPolicyCount,
        overdueTaskCount,
      },
      freightAgg
        ? {
            coverageRate: freightCoverage,
            marginPct: freightMargin,
          }
        : undefined,
      hotelAgg
        ? {
            occupancyPct: hotelOcc,
            revpar: hotelRevpar,
          }
        : undefined
    );

    // Category label from venture.type
    const category =
      v.type === "LOGISTICS"
        ? "Logistics"
        : v.type === "TRANSPORT"
        ? "Transport"
        : v.type === "HOSPITALITY"
        ? "Hospitality"
        : v.type === "BPO"
        ? "BPO"
        : v.type === "SAAS"
        ? "SaaS"
        : v.type === "HOLDINGS"
        ? "HQ"
        : v.type;

    // Type code (for table's "Type" column)
    const typeCode =
      v.type === "LOGISTICS" || v.type === "TRANSPORT"
        ? v.logisticsRole || null
        : v.type === "HOSPITALITY"
        ? "HOTELS"
        : v.type === "BPO"
        ? "BPO"
        : v.type === "SAAS"
        ? "SOFTWARE"
        : v.type === "HOLDINGS"
        ? "HOLDING"
        : null;

    // Role label
    const roleLabel =
      v.type === "LOGISTICS" && v.logisticsRole === "BROKER"
        ? "Broker"
        : v.type === "TRANSPORT" && v.logisticsRole === "CARRIER"
        ? "Carrier"
        : v.type === "HOLDINGS"
        ? "Parent"
        : "—";

    // Aggregate hotel derived metrics (per venture, across offices)
    let roomsSold7d: number | null = null;
    let occupancy7d: number | null = null;
    let revpar7d: number | null = null;

    if (hotelAgg && hotelAgg.roomsAvailable > 0) {
      roomsSold7d = hotelAgg.roomsSold;
      occupancy7d = (hotelAgg.roomsSold / hotelAgg.roomsAvailable) * 100;
      revpar7d = hotelAgg.roomRevenue / hotelAgg.roomsAvailable;
    }

    // Aggregate freight derived metrics (per venture, across offices)
    let totalLoadsInbound7d: number | null = null;
    let totalLoadsCovered7d: number | null = null;
    let freightCoverage7d: number | null = null;
    let freightMarginPct7d: number | null = null;

    if (freightAgg && freightAgg.totalLoadsInbound > 0) {
      totalLoadsInbound7d = freightAgg.totalLoadsInbound;
      totalLoadsCovered7d = freightAgg.totalLoadsCovered;
      freightCoverage7d =
        (freightAgg.totalLoadsCovered / freightAgg.totalLoadsInbound) * 100;
      if (freightAgg.totalRevenue > 0) {
        freightMarginPct7d =
          (freightAgg.totalProfit / freightAgg.totalRevenue) * 100;
      }
    }

    return {
      id: v.id,
      name: v.name,
      type: v.type,
      logisticsRole: v.logisticsRole || null,
      category,
      typeCode,
      roleLabel,
      officesCount: v.offices.length,
      health: status.health,
      reasons: status.reasons,
      freight: {
        totalLoadsInbound7d,
        totalLoadsCovered7d,
        coverageRate7d: freightCoverage7d,
        marginPct7d: freightMarginPct7d,
      },
      hotels: {
        roomsSold7d,
        occupancy7d,
        revpar7d,
      },
    };
  });

  return res.json({ ventures: result });
}
