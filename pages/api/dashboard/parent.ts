import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getEffectiveUser } from "@/lib/effectiveUser";
import { getUserScope } from "@/lib/scope";
import { summarizeParentDashboard } from "@/lib/ai/summarize";

function parseDateParam(value: string | string[] | undefined): Date | null {
  if (!value || Array.isArray(value)) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await getEffectiveUser(req, res);
  if (!user) return;

  if (user.role !== "CEO" && user.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden", detail: "Insufficient permissions" });
  }

  try {
    const { from: rawFrom, to: rawTo, includeTest, compareToPrevious } = req.query;

    const now = new Date();
    let from = parseDateParam(rawFrom as string | undefined);
    let to = parseDateParam(rawTo as string | undefined);

    if (!from || !to) {
      to = new Date(now);
      const fromDate = new Date(now);
      fromDate.setDate(fromDate.getDate() - 29);
      from = fromDate;
    }

    if (!from || !to) {
      return res.status(400).json({ error: "Invalid date range" });
    }

    const fromDay = new Date(from.toISOString().slice(0, 10) + "T00:00:00.000Z");
    const toDay = new Date(to.toISOString().slice(0, 10) + "T23:59:59.999Z");

    const diffMs = toDay.getTime() - fromDay.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24) + 1;
    const MAX_DAYS = 90;
    if (diffDays > MAX_DAYS) {
      return res.status(400).json({
        error: "Date range too large",
        detail: `Maximum allowed range is ${MAX_DAYS} days for parent dashboard`,
      });
    }

    const includeTestData = includeTest === "true";
    const doCompare = compareToPrevious !== "false"; // default true

    const scope = getUserScope(user);
    const ventureWhere: any = {
      isActive: true,
      ...(includeTestData ? {} : { isTest: false }),
    };
    if (!scope.allVentures) {
      ventureWhere.id = { in: scope.ventureIds };
    }

    const [ventures, offices, users, bankSnapshots] = await Promise.all([
      prisma.venture.findMany({
        where: ventureWhere,
        select: { id: true, type: true },
      }),
      prisma.office.count({
        where: {
          ...(includeTestData ? {} : { isTest: false }),
          ...(ventureWhere.id ? { ventureId: ventureWhere.id } : {}),
        },
      }),
      prisma.user.count({
        where: {
          isActive: true,
          ...(includeTestData ? {} : { isTestUser: false }),
        },
      }),
      prisma.bankAccountSnapshot.findMany({
        where: {
          ...(ventureWhere.id ? { ventureId: ventureWhere.id } : {}),
          date: { lte: toDay },
        },
        orderBy: { date: "desc" },
        take: 100,
      }),
    ]);

    const ventureIds = ventures.map((v: any) => v.id);

    const latestByVenture = new Map<number, { balance: number; date: Date }>();
    for (const snap of bankSnapshots) {
      if (snap.ventureId == null) continue;
      const existing = latestByVenture.get(snap.ventureId);
      if (!existing || snap.date > existing.date) {
        latestByVenture.set(snap.ventureId, {
          balance: snap.balance ?? 0,
          date: snap.date,
        });
      }
    }

    let bankTotal = 0;
    let bankAsOf: Date | null = null;
    for (const { balance, date } of latestByVenture.values()) {
      bankTotal += balance;
      if (!bankAsOf || date > bankAsOf) bankAsOf = date;
    }

    const activeVentures = ventures.length;
    const activeOffices = offices;
    const approxUsers = users;

    const [
      logisticsAgg,
      hospitalityAgg,
      bpoAgg,
      saasAgg,
      incentivesAgg,
    ] = await Promise.all([
      getLogisticsAggregate(ventureIds, fromDay, toDay, includeTestData),
      getHospitalityAggregate(ventureIds, fromDay, toDay, includeTestData),
      getBpoAggregate(ventureIds, fromDay, toDay, includeTestData),
      getSaasAggregate(ventureIds, fromDay, toDay, includeTestData),
      getIncentivesAggregate(ventureIds, fromDay, toDay, includeTestData),
    ]);

    let prevLogistics: any = null;
    let prevHospitality: any = null;
    let prevBpo: any = null;
    let prevSaas: any = null;
    let prevIncentives: any = null;

    if (doCompare) {
      const prevTo = new Date(fromDay.getTime() - 1);
      const prevFrom = new Date(prevTo.getTime());
      prevFrom.setDate(prevFrom.getDate() - (diffDays - 1));

      [prevLogistics, prevHospitality, prevBpo, prevSaas, prevIncentives] = await Promise.all([
        getLogisticsAggregate(ventureIds, prevFrom, prevTo, includeTestData),
        getHospitalityAggregate(ventureIds, prevFrom, prevTo, includeTestData),
        getBpoAggregate(ventureIds, prevFrom, prevTo, includeTestData),
        getSaasAggregate(ventureIds, prevFrom, prevTo, includeTestData),
        getIncentivesAggregate(ventureIds, prevFrom, prevTo, includeTestData),
      ]);
    }

    const alerts = buildAlerts({
      logistics: logisticsAgg,
      hospitality: hospitalityAgg,
      bpo: bpoAgg,
      saas: saasAgg,
      incentives: incentivesAgg,
      prevLogistics,
      prevHospitality,
      prevBpo,
      prevSaas,
      prevIncentives,
    });

    let aiSummary: string | null = null;
    try {
      aiSummary = await summarizeParentDashboard({
        ventures,
        alerts,
        period: {
          from: fromDay.toISOString().slice(0, 10),
          to: toDay.toISOString().slice(0, 10),
        },
      });
    } catch (e) {
      console.error("Parent dashboard AI summary error", e);
      aiSummary = null;
    }

    return res.status(200).json({
      portfolio: {
        activeVentures,
        activeOffices,
        approxUsers,
        bank: bankAsOf
          ? {
              total: bankTotal,
              asOf: bankAsOf.toISOString().slice(0, 10),
            }
          : { total: 0, asOf: null },
      },
      logistics: logisticsAgg,
      hospitality: hospitalityAgg,
      bpo: bpoAgg,
      saas: saasAgg,
      incentives: incentivesAgg,
      alerts,
      aiSummary,
      from: fromDay.toISOString().slice(0, 10),
      to: toDay.toISOString().slice(0, 10),
    });
  } catch (err: any) {
    console.error("Parent dashboard error", err);
    return res.status(500).json({ error: "Internal server error", detail: err.message || String(err) });
  }
}

async function getLogisticsAggregate(
  ventureIds: number[],
  fromDay: Date,
  toDay: Date,
  includeTest: boolean,
) {
  if (!ventureIds.length) {
    return {
      totalLoads: 0,
      deliveredLoads: 0,
      marginPct: 0,
      atRiskLoads: 0,
    };
  }

  const where: any = {
    ventureId: { in: ventureIds },
    createdAt: { gte: fromDay, lte: toDay },
  };
  if (!includeTest) {
    where.isTest = false;
  }

  const loads = await prisma.load.findMany({
    where,
    select: {
      status: true,
      buyRate: true,
      sellRate: true,
      billAmount: true,
      marginAmount: true,
      atRiskFlag: true,
    },
  });

  const totalLoads = loads.length;
  const deliveredLoads = loads.filter((l: any) => l.status === "DELIVERED").length;
  const atRiskLoads = loads.filter((l: any) => l.atRiskFlag).length;

  let rev = 0;
  let margin = 0;
  for (const l of loads) {
    const bill = l.billAmount ?? l.sellRate ?? 0;
    const buy = l.buyRate ?? 0;
    rev += bill;
    margin += l.marginAmount ?? bill - buy;
  }

  const marginPct = rev > 0 ? Number(((margin / rev) * 100).toFixed(1)) : 0;

  return {
    totalLoads,
    deliveredLoads,
    marginPct,
    atRiskLoads,
  };
}

async function getHospitalityAggregate(
  ventureIds: number[],
  fromDay: Date,
  toDay: Date,
  includeTest: boolean,
) {
  if (!ventureIds.length) {
    return {
      properties: 0,
      occupancyPct: 0,
      adr: 0,
      revpar: 0,
      highLossNights: 0,
    };
  }

  const hotelWhere: any = {
    status: "ACTIVE",
    ventureId: { in: ventureIds },
  };
  if (!includeTest) {
    hotelWhere.isTest = false;
  }

  const hotels = await prisma.hotelProperty.findMany({
    where: hotelWhere,
    select: { id: true },
  });

  const hotelIds = hotels.map((h: any) => h.id);
  if (!hotelIds.length) {
    return {
      properties: 0,
      occupancyPct: 0,
      adr: 0,
      revpar: 0,
      highLossNights: 0,
    };
  }

  const kpis = await prisma.hotelKpiDaily.findMany({
    where: {
      hotelId: { in: hotelIds },
      date: { gte: fromDay, lte: toDay },
    },
    select: {
      roomsAvailable: true,
      roomsSold: true,
      roomRevenue: true,
      adr: true,
      revpar: true,
    },
  });

  let totalRoomsAvail = 0;
  let totalRoomsSold = 0;
  let totalRevenue = 0;
  let adrSum = 0;
  let revparSum = 0;

  for (const k of kpis) {
    totalRoomsAvail += k.roomsAvailable ?? 0;
    totalRoomsSold += k.roomsSold ?? 0;
    totalRevenue += k.roomRevenue ?? 0;
    adrSum += k.adr ?? 0;
    revparSum += k.revpar ?? 0;
  }

  const occupancyPct =
    totalRoomsAvail > 0
      ? Number(((totalRoomsSold / totalRoomsAvail) * 100).toFixed(1))
      : 0;

  const adr = kpis.length ? Number((adrSum / kpis.length).toFixed(1)) : 0;
  const revpar = kpis.length ? Number((revparSum / kpis.length).toFixed(1)) : 0;

  const lossNights = await prisma.hotelDailyReport.count({
    where: {
      hotelId: { in: hotelIds },
      highLossFlag: true,
      date: { gte: fromDay, lte: toDay },
    },
  });

  return {
    properties: hotelIds.length,
    occupancyPct,
    adr,
    revpar,
    highLossNights: lossNights,
  };
}

async function getBpoAggregate(
  ventureIds: number[],
  fromDay: Date,
  toDay: Date,
  includeTest: boolean,
) {
  if (!ventureIds.length) {
    return {
      agents: 0,
      totalCalls: 0,
      avgTalkMinutes: 0,
      utilizationPct: 0,
    };
  }

  const agents = await prisma.bpoAgent.count({
    where: {
      ventureId: { in: ventureIds },
      isActive: true,
    },
  });

  const where: any = {
    ventureId: { in: ventureIds },
    callStartedAt: { gte: fromDay, lte: toDay },
  };
  if (!includeTest) {
    where.isTest = false;
  }

  const logs = await prisma.bpoCallLog.findMany({
    where,
    select: {
      callStartedAt: true,
      callEndedAt: true,
    },
  });

  let totalCalls = logs.length;
  let totalTalkSeconds = 0;
  for (const l of logs) {
    const startMs = l.callStartedAt?.getTime() ?? 0;
    const endMs = l.callEndedAt?.getTime() ?? startMs;
    totalTalkSeconds += Math.max(0, Math.round((endMs - startMs) / 1000));
  }

  const avgTalkMinutes = totalCalls
    ? Number(((totalTalkSeconds / totalCalls) / 60).toFixed(1))
    : 0;

  // Very rough utilization heuristic: talk time vs 6 hours/day per agent in window
  const days = diffInDays(fromDay, toDay);
  const theoreticalMinutes = agents * days * 6 * 60;
  const utilizationPct = theoreticalMinutes
    ? Number((((totalTalkSeconds / 60) / theoreticalMinutes) * 100).toFixed(1))
    : 0;

  return {
    agents,
    totalCalls,
    avgTalkMinutes,
    utilizationPct,
  };
}

async function getSaasAggregate(
  ventureIds: number[],
  fromDay: Date,
  toDay: Date,
  includeTest: boolean,
) {
  if (!ventureIds.length) {
    return {
      mrr: 0,
      arr: 0,
      netGrowthPct: 0,
      activeCustomers: 0,
      churnedCustomers: 0,
    };
  }

  const whereCustomer: any = {
    ventureId: { in: ventureIds },
  };
  if (!includeTest) {
    whereCustomer.isTest = false;
  }

  const customers = await prisma.saasCustomer.findMany({
    where: whereCustomer,
    include: {
      subscriptions: true,
    },
  });

  let currentMrr = 0;
  let activeCustomers = 0;
  let churnedCustomers = 0;
  let lastWindowMrr = 0;

  for (const c of customers) {
    let hasActive = false;
    for (const s of c.subscriptions) {
      const isActive = s.isActive;
      if (isActive) {
        currentMrr += s.mrr ?? 0;
        hasActive = true;
      }
      const canceledInWindow =
        s.cancelledAt && s.cancelledAt >= fromDay && s.cancelledAt <= toDay;
      if (canceledInWindow) {
        churnedCustomers += 1;
      }
      const wasActiveInWindow =
        s.startedAt <= toDay && (!s.cancelledAt || s.cancelledAt > toDay);
      if (wasActiveInWindow) {
        lastWindowMrr += s.mrr ?? 0;
      }
    }
    if (hasActive) activeCustomers += 1;
  }

  const arr = currentMrr * 12;
  const netGrowthPct = lastWindowMrr
    ? Number((((currentMrr - lastWindowMrr) / lastWindowMrr) * 100).toFixed(1))
    : 0;

  return {
    mrr: Math.round(currentMrr),
    arr: Math.round(arr),
    netGrowthPct,
    activeCustomers,
    churnedCustomers,
  };
}

type IncentiveSummaryRow = {
  ventureId: number;
  userId: number;
  amount: number | null;
};

async function getIncentivesAggregate(
  ventureIds: number[],
  fromDay: Date,
  toDay: Date,
  includeTest: boolean,
) {
  if (!ventureIds.length) {
    return {
      totalIncentives: 0,
      venturesWithIncentives: 0,
      employeesWithIncentives: 0,
    };
  }

  const where: any = {
    ventureId: { in: ventureIds },
    date: { gte: fromDay, lte: toDay },
  };
  if (!includeTest) {
    where.isTest = false;
  }

  const rows: IncentiveSummaryRow[] = await prisma.incentiveDaily.findMany({
    where,
    select: {
      ventureId: true,
      userId: true,
      amount: true,
    },
  });

  const totalIncentives = rows.reduce(
    (sum: number, r: IncentiveSummaryRow) => sum + (r.amount ?? 0),
    0,
  );
  const venturesWithIncentives = new Set(rows.map((r) => r.ventureId)).size;
  const employeesWithIncentives = new Set(rows.map((r) => r.userId)).size;

  return {
    totalIncentives,
    venturesWithIncentives,
    employeesWithIncentives,
  };
}

function diffInDays(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
}

function buildAlerts(params: {
  logistics: { marginPct: number; atRiskLoads: number };
  hospitality: { occupancyPct: number; revpar: number; highLossNights: number };
  bpo: { utilizationPct: number };
  saas: { netGrowthPct: number; churnedCustomers: number };
  incentives: { totalIncentives: number };
  prevLogistics?: { marginPct: number } | null;
  prevHospitality?: { revpar: number } | null;
  prevBpo?: { utilizationPct: number } | null;
  prevSaas?: { netGrowthPct: number; churnedCustomers: number } | null;
  prevIncentives?: { totalIncentives: number } | null;
}) {
  const alerts: {
    id: string;
    type:
      | "LOGISTICS_MARGIN_DROP"
      | "HOTEL_REVPAR_DROP"
      | "BPO_UTILIZATION_LOW"
      | "SAAS_CHURN_SPike"
      | "INCENTIVES_ANOMALY"
      | "GENERIC";
    message: string;
    severity: "info" | "warning" | "critical";
    ventureId?: number | null;
    currentValue?: number | null;
    previousValue?: number | null;
    deltaPct?: number | null;
  }[] = [];

  const {
    logistics,
    hospitality,
    bpo,
    saas,
    incentives,
    prevLogistics,
    prevHospitality,
    prevBpo,
    prevSaas,
    prevIncentives,
  } = params;

  // LOGISTICS_MARGIN_DROP
  if (prevLogistics && prevLogistics.marginPct > 0 && logistics.marginPct > 0) {
    const delta = logistics.marginPct - prevLogistics.marginPct;
    if (delta <= -5 || (prevLogistics.marginPct >= 15 && logistics.marginPct <= 10)) {
      alerts.push({
        id: "LOGISTICS_MARGIN_DROP",
        type: "LOGISTICS_MARGIN_DROP",
        message: `Logistics margin dropped from ${prevLogistics.marginPct.toFixed(1)}% to ${logistics.marginPct.toFixed(1)}%.`,
        severity: Math.abs(delta) >= 10 ? "critical" : "warning",
        currentValue: logistics.marginPct,
        previousValue: prevLogistics.marginPct,
        deltaPct: prevLogistics.marginPct
          ? Number(((delta / prevLogistics.marginPct) * 100).toFixed(1))
          : null,
      });
    }
  }

  // HOTEL_REVPAR_DROP
  if (prevHospitality && prevHospitality.revpar > 0 && hospitality.revpar > 0) {
    const delta = hospitality.revpar - prevHospitality.revpar;
    const deltaPct = (delta / prevHospitality.revpar) * 100;
    if (deltaPct <= -10) {
      alerts.push({
        id: "HOTEL_REVPAR_DROP",
        type: "HOTEL_REVPAR_DROP",
        message: `Hospitality RevPAR dropped from ${prevHospitality.revpar.toFixed(1)} to ${hospitality.revpar.toFixed(1)}.`,
        severity: Math.abs(deltaPct) >= 20 ? "critical" : "warning",
        currentValue: hospitality.revpar,
        previousValue: prevHospitality.revpar,
        deltaPct: Number(deltaPct.toFixed(1)),
      });
    }
  }

  // BPO_UTILIZATION_LOW
  if (prevBpo && prevBpo.utilizationPct > 0 && bpo.utilizationPct > 0) {
    const delta = bpo.utilizationPct - prevBpo.utilizationPct;
    if (bpo.utilizationPct < 70 && delta <= -5) {
      alerts.push({
        id: "BPO_UTILIZATION_LOW",
        type: "BPO_UTILIZATION_LOW",
        message: `BPO utilization fell from ${prevBpo.utilizationPct.toFixed(1)}% to ${bpo.utilizationPct.toFixed(1)}%.`,
        severity: Math.abs(delta) >= 15 ? "critical" : "warning",
        currentValue: bpo.utilizationPct,
        previousValue: prevBpo.utilizationPct,
        deltaPct: prevBpo.utilizationPct
          ? Number(((delta / prevBpo.utilizationPct) * 100).toFixed(1))
          : null,
      });
    }
  }

  // SAAS_CHURN_SPIKE
  if (prevSaas) {
    const prevChurn = prevSaas.churnedCustomers;
    const currChurn = saas.churnedCustomers;
    if (prevChurn === 0 && currChurn >= 3) {
      alerts.push({
        id: "SAAS_CHURN_SPIKE",
        type: "SAAS_CHURN_SPike",
        message: `${currChurn} SaaS customer(s) churned in this window (no churn in prior window).`,
        severity: "critical",
        currentValue: currChurn,
        previousValue: prevChurn,
        deltaPct: null,
      });
    } else if (prevChurn > 0 && currChurn >= prevChurn * 2) {
      alerts.push({
        id: "SAAS_CHURN_SPIKE",
        type: "SAAS_CHURN_SPike",
        message: `SaaS churn increased from ${prevChurn} to ${currChurn} customers.`,
        severity: "warning",
        currentValue: currChurn,
        previousValue: prevChurn,
        deltaPct: Number((((currChurn - prevChurn) / prevChurn) * 100).toFixed(1)),
      });
    }
  }

  // INCENTIVES_ANOMALY
  if (prevIncentives && prevIncentives.totalIncentives > 0) {
    const delta = incentives.totalIncentives - prevIncentives.totalIncentives;
    const deltaPct = (delta / prevIncentives.totalIncentives) * 100;
    if (Math.abs(deltaPct) >= 40) {
      alerts.push({
        id: "INCENTIVES_ANOMALY",
        type: "INCENTIVES_ANOMALY",
        message: `Total incentives changed ${deltaPct.toFixed(1)}% vs prior window.`,
        severity: Math.abs(deltaPct) >= 60 ? "critical" : "warning",
        currentValue: incentives.totalIncentives,
        previousValue: prevIncentives.totalIncentives,
        deltaPct: Number(deltaPct.toFixed(1)),
      });
    }
  }

  // Keep original threshold-based alerts for basic context (info-level)
  if (logistics.marginPct < 10 && logistics.marginPct > 0) {
    alerts.push({
      id: "logistics-margin-low",
      type: "GENERIC",
      message: `Logistics margin is low at ${logistics.marginPct.toFixed(1)}%.`,
      severity: "warning",
    });
  }
  if (logistics.atRiskLoads > 0) {
    alerts.push({
      id: "logistics-at-risk",
      type: "GENERIC",
      message: `${logistics.atRiskLoads} load(s) flagged as at-risk in the current window.`,
      severity: "info",
    });
  }

  if (hospitality.occupancyPct > 0 && hospitality.occupancyPct < 50) {
    alerts.push({
      id: "hospitality-occ-low",
      type: "GENERIC",
      message: `Hospitality occupancy is below 50% at ${hospitality.occupancyPct.toFixed(1)}%.`,
      severity: "warning",
    });
  }
  if (hospitality.revpar > 0 && hospitality.revpar < 40) {
    alerts.push({
      id: "hospitality-revpar-low",
      type: "GENERIC",
      message: `Hospitality RevPAR is below target at ${hospitality.revpar.toFixed(1)}.`,
      severity: "warning",
    });
  }
  if (hospitality.highLossNights > 0) {
    alerts.push({
      id: "hospitality-loss-nights",
      type: "GENERIC",
      message: `${hospitality.highLossNights} high-loss night(s) detected in the current window.`,
      severity: "info",
    });
  }

  if (bpo.utilizationPct > 0 && bpo.utilizationPct < 40) {
    alerts.push({
      id: "bpo-utilization-low",
      type: "GENERIC",
      message: `BPO agent utilization is low at ${bpo.utilizationPct.toFixed(1)}%.`,
      severity: "warning",
    });
  }

  if (saas.netGrowthPct < 0) {
    alerts.push({
      id: "saas-negative-growth",
      type: "GENERIC",
      message: `SaaS net MRR growth is negative (${saas.netGrowthPct.toFixed(1)}%).`,
      severity: "critical",
    });
  }
  if (saas.churnedCustomers > 0) {
    alerts.push({
      id: "saas-churn-spike-basic",
      type: "GENERIC",
      message: `${saas.churnedCustomers} customer(s) churned in the current window.`,
      severity: "warning",
    });
  }

  if (incentives.totalIncentives === 0) {
    alerts.push({
      id: "incentives-none",
      type: "GENERIC",
      message: "No incentives paid in the current window.",
      severity: "info",
    });
  }

  return alerts;
}

function buildAiSummary(alerts: {
  type: string;
  message: string;
  severity: "info" | "warning" | "critical";
}[]) {
  if (!alerts.length) return { text: "No major issues detected in this window." };

  const critical = alerts.filter((a) => a.severity === "critical");
  const warning = alerts.filter((a) => a.severity === "warning");

  const parts: string[] = [];

  if (critical.length) {
    parts.push(
      `${critical.length} critical alert(s): ` +
        critical
          .slice(0, 3)
          .map((a) => a.message.replace(/\.$/, ""))
          .join("; ") +
        ".",
    );
  }

  if (warning.length) {
    parts.push(
      `${warning.length} warning(s): ` +
        warning
          .slice(0, 3)
          .map((a) => a.message.replace(/\.$/, ""))
          .join("; ") +
        ".",
    );
  }

  if (!parts.length) {
    return { text: "No major issues; only informational alerts in this window." };
  }

  return { text: parts.join(" ") };
}
