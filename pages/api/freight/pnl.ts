import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { requireAdminPanelUser } from "@/lib/apiAuth";
import { applyLoadScope } from "@/lib/scopeLoads";

type PnlSummary = {
  totalRevenue: number;
  totalCost: number;
  totalMargin: number;
  marginPct: number;
  avgRpm: number | null;
  loadCount: number;
};

type PeriodComparison = {
  current: PnlSummary;
  previous: PnlSummary;
  change: {
    revenue: number;
    revenuePct: number | null;
    cost: number;
    costPct: number | null;
    margin: number;
    marginPct: number | null;
    loadCount: number;
    loadCountPct: number | null;
  };
  period: {
    currentStart: string;
    currentEnd: string;
    previousStart: string;
    previousEnd: string;
  };
};

type Comparisons = {
  mom: PeriodComparison;
  lymom: PeriodComparison;
  yoy: PeriodComparison;
};

type PnlLoadRow = {
  id: number;
  tmsLoadId?: string | null;
  customerName?: string | null;
  shipperName?: string | null;
  carrierName?: string | null;
  billingDate: string | null;
  billAmount: number;
  costAmount: number;
  margin: number;
  miles: number | null;
  rpm: number | null;
  lineHaulRevenue?: number | null;
  fuelRevenue?: number | null;
  accessorialRevenue?: number | null;
  otherRevenue?: number | null;
  lineHaulCost?: number | null;
  fuelCost?: number | null;
  lumperCost?: number | null;
  tollsCost?: number | null;
  detentionCost?: number | null;
  otherCost?: number | null;
};

type PnlResponse = {
  summary: PnlSummary;
  comparisons: Comparisons;
  loads: PnlLoadRow[];
};

async function computePeriodSummary(
  user: any,
  start: Date,
  end: Date
): Promise<PnlSummary> {
  const baseWhere = {
    arInvoiceDate: {
      gte: start,
      lte: end,
    },
  };

  const where = applyLoadScope(user, baseWhere);

  const loads = await prisma.load.findMany({
    where,
    select: {
      billAmount: true,
      costAmount: true,
      miles: true,
      rpm: true,
    },
  });

  let totalRevenue = 0;
  let totalCost = 0;
  let totalRpm = 0;
  let rpmCount = 0;

  for (const load of loads) {
    const billAmount = load.billAmount ?? 0;
    const costAmount = load.costAmount ?? 0;
    totalRevenue += billAmount;
    totalCost += costAmount;

    const miles = load.miles ?? null;
    const rpm = miles && miles > 0 ? billAmount / miles : load.rpm ?? null;
    if (rpm !== null) {
      totalRpm += rpm;
      rpmCount += 1;
    }
  }

  const totalMargin = totalRevenue - totalCost;
  const marginPct = totalRevenue > 0 ? totalMargin / totalRevenue : 0;

  return {
    totalRevenue,
    totalCost,
    totalMargin,
    marginPct,
    avgRpm: rpmCount > 0 ? totalRpm / rpmCount : null,
    loadCount: loads.length,
  };
}

function calcPctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function buildComparison(
  current: PnlSummary,
  previous: PnlSummary,
  currentStart: Date,
  currentEnd: Date,
  previousStart: Date,
  previousEnd: Date
): PeriodComparison {
  return {
    current,
    previous,
    change: {
      revenue: current.totalRevenue - previous.totalRevenue,
      revenuePct: calcPctChange(current.totalRevenue, previous.totalRevenue),
      cost: current.totalCost - previous.totalCost,
      costPct: calcPctChange(current.totalCost, previous.totalCost),
      margin: current.totalMargin - previous.totalMargin,
      marginPct: calcPctChange(current.totalMargin, previous.totalMargin),
      loadCount: current.loadCount - previous.loadCount,
      loadCountPct: calcPctChange(current.loadCount, previous.loadCount),
    },
    period: {
      currentStart: currentStart.toISOString(),
      currentEnd: currentEnd.toISOString(),
      previousStart: previousStart.toISOString(),
      previousEnd: previousEnd.toISOString(),
    },
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PnlResponse | { error: string }>
) {
  const user = await requireAdminPanelUser(req, res);
  if (!user) return;

  try {
    const { startDate, endDate } = req.query;

    const end = endDate ? new Date(String(endDate)) : new Date();
    const start = startDate
      ? new Date(String(startDate))
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const currentMonthStart = new Date(end.getFullYear(), end.getMonth(), 1);
    const currentMonthEnd = new Date(
      Math.min(
        new Date(end.getFullYear(), end.getMonth() + 1, 0, 23, 59, 59, 999).getTime(),
        end.getTime()
      )
    );

    const dayOfMonth = end.getDate();
    const prevMonthStart = new Date(end.getFullYear(), end.getMonth() - 1, 1);
    const prevMonthLastDay = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
    const prevMonthDay = Math.min(dayOfMonth, prevMonthLastDay);
    const prevMonthEnd = new Date(end.getFullYear(), end.getMonth() - 1, prevMonthDay, 23, 59, 59, 999);

    const lyMonthStart = new Date(end.getFullYear() - 1, end.getMonth(), 1);
    const lyMonthLastDay = new Date(end.getFullYear() - 1, end.getMonth() + 1, 0).getDate();
    const lyMonthDay = Math.min(dayOfMonth, lyMonthLastDay);
    const lyMonthEnd = new Date(end.getFullYear() - 1, end.getMonth(), lyMonthDay, 23, 59, 59, 999);

    const currentYearStart = new Date(end.getFullYear(), 0, 1);
    const currentYearEnd = end;

    const lastYearStart = new Date(end.getFullYear() - 1, 0, 1);
    const lastYearLastDayOfMonth = new Date(end.getFullYear() - 1, end.getMonth() + 1, 0).getDate();
    const lastYearDay = Math.min(end.getDate(), lastYearLastDayOfMonth);
    const lastYearEnd = new Date(end.getFullYear() - 1, end.getMonth(), lastYearDay, 23, 59, 59, 999);

    const [
      currentMonthSummary,
      prevMonthSummary,
      lyMonthSummary,
      currentYearSummary,
      lastYearSummary,
    ] = await Promise.all([
      computePeriodSummary(user, currentMonthStart, currentMonthEnd),
      computePeriodSummary(user, prevMonthStart, prevMonthEnd),
      computePeriodSummary(user, lyMonthStart, lyMonthEnd),
      computePeriodSummary(user, currentYearStart, currentYearEnd),
      computePeriodSummary(user, lastYearStart, lastYearEnd),
    ]);

    const mom = buildComparison(
      currentMonthSummary,
      prevMonthSummary,
      currentMonthStart,
      currentMonthEnd,
      prevMonthStart,
      prevMonthEnd
    );

    const lymom = buildComparison(
      currentMonthSummary,
      lyMonthSummary,
      currentMonthStart,
      currentMonthEnd,
      lyMonthStart,
      lyMonthEnd
    );

    const yoy = buildComparison(
      currentYearSummary,
      lastYearSummary,
      currentYearStart,
      currentYearEnd,
      lastYearStart,
      lastYearEnd
    );

    const baseWhere: { OR: any[] } = {
      OR: [
        { billingDate: null },
        {
          arInvoiceDate: {
            gte: start,
            lte: end,
          },
        },
      ],
    };

    const where = applyLoadScope(user, baseWhere);

    const loads = await prisma.load.findMany({
      where,
      include: {
        customer: true,
        shipper: true,
        carrier: true,
      },
      orderBy: {
        billingDate: "desc",
      },
    });

    let totalRevenue = 0;
    let totalCost = 0;
    let totalRpm = 0;
    let rpmCount = 0;

    const rows: PnlLoadRow[] = loads.map((load: (typeof loads)[number]) => {
      const effectiveBillingDate = load.billingDate ?? load.arInvoiceDate ?? null;

      const billAmount = load.billAmount ?? 0;
      const costAmount = load.costAmount ?? 0;
      const margin = billAmount - costAmount;

      const miles = load.miles ?? null;
      const rpm = miles && miles > 0 ? billAmount / miles : load.rpm ?? null;

      totalRevenue += billAmount;
      totalCost += costAmount;
      if (rpm !== null) {
        totalRpm += rpm;
        rpmCount += 1;
      }

      return {
        id: load.id,
        tmsLoadId: load.tmsLoadId ?? null,
        customerName: load.customer?.name ?? null,
        shipperName: load.shipper?.name ?? null,
        carrierName: load.carrier?.name ?? null,
        billingDate: effectiveBillingDate ? effectiveBillingDate.toISOString() : null,
        billAmount,
        costAmount,
        margin,
        miles,
        rpm,
        lineHaulRevenue: load.lineHaulRevenue ?? null,
        fuelRevenue: load.fuelRevenue ?? null,
        accessorialRevenue: load.accessorialRevenue ?? null,
        otherRevenue: load.otherRevenue ?? null,
        lineHaulCost: load.lineHaulCost ?? null,
        fuelCost: load.fuelCost ?? null,
        lumperCost: load.lumperCost ?? null,
        tollsCost: load.tollsCost ?? null,
        detentionCost: load.detentionCost ?? null,
        otherCost: load.otherCost ?? null,
      };
    });

    const totalMargin = totalRevenue - totalCost;
    const marginPct = totalRevenue > 0 ? totalMargin / totalRevenue : 0;

    const summary: PnlSummary = {
      totalRevenue,
      totalCost,
      totalMargin,
      marginPct,
      avgRpm: rpmCount > 0 ? totalRpm / rpmCount : null,
      loadCount: loads.length,
    };

    return res.status(200).json({
      summary,
      comparisons: {
        mom,
        lymom,
        yoy,
      },
      loads: rows,
    });
  } catch (err) {
    console.error("Freight P&L error", err);
    return res.status(500).json({ error: "Failed to compute P&L" });
  }
}
