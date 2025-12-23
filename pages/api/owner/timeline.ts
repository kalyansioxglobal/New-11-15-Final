import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import prisma from "@/lib/prisma";
import { enforceScope } from "@/lib/scope";
import { computeVentureStatus } from "@/lib/ventureStatus";
import type { OwnerTimelineItem } from "@/lib/ownerTimeline";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  let session = await getServerSession(req, res, authOptions);
  
  // Test mode: use mock CEO session for development
  if (!session && process.env.NODE_ENV === "development") {
    session = { user: { id: 1, role: "CEO", email: "ceo@siox.com" } } as any;
  }
  
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const user = session.user as any;

  if (!["CEO", "ADMIN"].includes(user.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);

  const in30Days = new Date();
  in30Days.setDate(now.getDate() + 30);

  const items: OwnerTimelineItem[] = [];

  const ventures = await prisma.venture.findMany({
    include: {
      offices: true,
      policies: true,
      tasks: true,
    },
  });

  const freightKpis = await prisma.freightKpiDaily.findMany({
    where: { date: { gte: sevenDaysAgo, lte: now } },
  });

  const freightByVenture = new Map<
    number,
    {
      totalLoadsInbound: number;
      totalLoadsCovered: number;
      totalRevenue: number;
      totalProfit: number;
    }
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
    where: { date: { gte: sevenDaysAgo, lte: now } },
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

  for (const v of ventures) {
    if (!enforceScope(user, { ventureId: v.id })) continue;

    const ventureName = v.name;
    const policies = v.policies || [];
    const tasks = v.tasks || [];

    const hasExpiredPolicy = policies.some(
      (p) => p.endDate && p.endDate < now
    );

    const expiringPolicyCount = policies.filter(
      (p) => p.endDate && p.endDate > now && p.endDate <= in30Days
    ).length;

    const overdueTasks = tasks.filter(
      (t) => t.status === "OVERDUE" || (t.dueDate && t.dueDate < now && t.status !== "DONE")
    );
    const overdueTaskCount = overdueTasks.length;

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
      hotelOcc = (hotelAgg.roomsSold / hotelAgg.roomsAvailable) * 100;
      hotelRevpar = hotelAgg.roomRevenue / hotelAgg.roomsAvailable;
    }

    const statusResult = computeVentureStatus(
      v.type,
      {
        hasExpiredPolicy,
        expiringPolicyCount,
        overdueTaskCount,
      },
      freightAgg
        ? { coverageRate: freightCoverage, marginPct: freightMargin }
        : undefined,
      hotelAgg
        ? { occupancyPct: hotelOcc, revpar: hotelRevpar }
        : undefined
    );

    for (const p of policies) {
      if (!p.endDate) continue;

      if (p.endDate < now && p.endDate >= sevenDaysAgo) {
        items.push({
          id: `policy-expired-${p.id}`,
          type: "POLICY_EXPIRED",
          severity: "critical",
          date: p.endDate.toISOString(),
          ventureId: v.id,
          ventureName,
          title: `Policy expired: ${p.name}`,
          description: p.provider
            ? `Provider: ${p.provider}. Policy #${p.policyNo || "N/A"}.`
            : `Policy #${p.policyNo || "N/A"}.`,
          url: `/admin/policies?ventureId=${v.id}&policyId=${p.id}`,
        });
      }

      if (p.endDate > now && p.endDate <= in30Days) {
        items.push({
          id: `policy-expiring-${p.id}`,
          type: "POLICY_EXPIRING",
          severity: "warning",
          date: p.endDate.toISOString(),
          ventureId: v.id,
          ventureName,
          title: `Policy expiring soon: ${p.name}`,
          description: `Expires on ${p.endDate.toDateString()}${
            p.provider ? ` · Provider: ${p.provider}` : ""
          }`,
          url: `/admin/policies?ventureId=${v.id}&policyId=${p.id}`,
        });
      }
    }

    for (const t of overdueTasks) {
      const when = t.dueDate || t.createdAt || now;
      items.push({
        id: `task-overdue-${t.id}`,
        type: "TASK_OVERDUE",
        severity: "warning",
        date: when.toISOString(),
        ventureId: v.id,
        ventureName,
        title: `Overdue task: ${t.title}`,
        description: t.description || "This task is overdue.",
        url: `/tasks/${t.id}`,
      });
    }

    if (
      statusResult.health === "Attention" ||
      statusResult.health === "Critical"
    ) {
      items.push({
        id: `venture-status-${v.id}`,
        type:
          statusResult.health === "Critical"
            ? "VENTURE_CRITICAL"
            : "VENTURE_ATTENTION",
        severity: statusResult.health === "Critical" ? "critical" : "warning",
        date: now.toISOString(),
        ventureId: v.id,
        ventureName,
        title: `${v.name} is ${statusResult.health}`,
        description:
          statusResult.reasons && statusResult.reasons.length > 0
            ? statusResult.reasons
                .slice(0, 2)
                .map((r) => r.message)
                .join(" · ")
            : undefined,
        url: `/ventures/${v.id}`,
      });
    }

    if (
      (v.type === "LOGISTICS" || v.type === "TRANSPORT") &&
      freightCoverage != null
    ) {
      if (freightCoverage < 30) {
        items.push({
          id: `freight-kpi-${v.id}`,
          type: "FREIGHT_KPI_ALERT",
          severity: freightCoverage < 15 ? "critical" : "warning",
          date: now.toISOString(),
          ventureId: v.id,
          ventureName,
          title: `Freight coverage at ${freightCoverage.toFixed(1)}% (7d)`,
          description: `Loads covered vs loads received over the last 7 days.`,
          url: `/ventures/${v.id}/freight`,
        });
      }
    }

    if (v.type === "HOSPITALITY" && hotelOcc != null) {
      if (hotelOcc < 55 || (hotelRevpar != null && hotelRevpar < 60)) {
        items.push({
          id: `hotel-kpi-${v.id}`,
          type: "HOTEL_KPI_ALERT",
          severity:
            hotelOcc < 40 || (hotelRevpar != null && hotelRevpar < 40)
              ? "critical"
              : "warning",
          date: now.toISOString(),
          ventureId: v.id,
          ventureName,
          title: `Hotel performance alert for ${v.name}`,
          description: `Occ: ${hotelOcc.toFixed(1)}% · RevPAR: $${(
            hotelRevpar || 0
          ).toFixed(0)} (7d)`,
          url: `/ventures/${v.id}/hotels`,
        });
      }
    }
  }

  items.sort((a, b) => (a.date < b.date ? 1 : -1));

  const limit = req.query.limit ? Number(req.query.limit) : 100;

  return res.json({
    items: items.slice(0, limit),
  });
}
