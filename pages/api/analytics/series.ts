import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { getEffectiveUser } from "@/lib/effectiveUser";
import type { MetricKey } from "@/lib/analytics/metrics";
import type { TimeSeriesPoint } from "@/components/charts/BaseTimeSeriesChart";
import {
  buildFreightScopeWhere,
  buildHotelScopeWhere,
  buildBpoScopeWhere,
} from "@/lib/analytics/scope";

type DateRangeKey = "MTD" | "YTD" | "LAST_7_DAYS" | "LAST_30_DAYS";

type DateRangeResult = {
  currentStart: Date;
  currentEnd: Date;
  comparisonStart: Date;
  comparisonEnd: Date;
  groupBy: "day";
};

function getDateRanges(dateRange: DateRangeKey, now = new Date()): DateRangeResult {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  let currentStart: Date;
  let comparisonStart: Date;
  let comparisonEnd: Date;

  switch (dateRange) {
    case "MTD": {
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const ly = new Date(now);
      ly.setFullYear(now.getFullYear() - 1);
      comparisonStart = new Date(ly.getFullYear(), ly.getMonth(), 1);
      comparisonEnd = new Date(ly.getFullYear(), ly.getMonth(), end.getDate());
      break;
    }
    case "YTD": {
      currentStart = new Date(now.getFullYear(), 0, 1);
      const ly = new Date(now);
      ly.setFullYear(now.getFullYear() - 1);
      comparisonStart = new Date(ly.getFullYear(), 0, 1);
      comparisonEnd = new Date(ly.getFullYear(), end.getMonth(), end.getDate());
      break;
    }
    case "LAST_7_DAYS": {
      currentStart = new Date(now);
      currentStart.setDate(now.getDate() - 6);
      comparisonEnd = new Date(currentStart);
      comparisonEnd.setDate(currentStart.getDate() - 1);
      comparisonStart = new Date(comparisonEnd);
      comparisonStart.setDate(comparisonEnd.getDate() - 6);
      break;
    }
    case "LAST_30_DAYS":
    default: {
      currentStart = new Date(now);
      currentStart.setDate(now.getDate() - 29);
      comparisonEnd = new Date(currentStart);
      comparisonEnd.setDate(currentStart.getDate() - 1);
      comparisonStart = new Date(comparisonEnd);
      comparisonStart.setDate(comparisonEnd.getDate() - 29);
      break;
    }
  }

  return {
    currentStart,
    currentEnd: end,
    comparisonStart,
    comparisonEnd,
    groupBy: "day",
  };
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildSeriesSkeleton(start: Date, end: Date): string[] {
  const dates: string[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    dates.push(dateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

async function getFreightMetricSeries(args: {
  metric: MetricKey;
  dateRange: DateRangeResult;
  scopeWhere: any;
}): Promise<{ current: Map<string, number>; comparison: Map<string, number> }> {
  const { metric, dateRange, scopeWhere } = args;
  const { currentStart, currentEnd, comparisonStart, comparisonEnd } = dateRange;

  const baseWhere: any = {
    ...scopeWhere,
    billingDate: { gte: currentStart, lte: currentEnd },
    loadStatus: "DELIVERED",
  };

  const comparisonWhere: any = {
    ...scopeWhere,
    billingDate: { gte: comparisonStart, lte: comparisonEnd },
    loadStatus: "DELIVERED",
  };

  const current = new Map<string, number>();
  const comparison = new Map<string, number>();

  switch (metric) {
    case "freight_margin_pct": {
      const curRows = await prisma.load.findMany({
        where: baseWhere,
        select: {
          billingDate: true,
          billAmount: true,
          costAmount: true,
        },
      });
      const cmpRows = await prisma.load.findMany({
        where: comparisonWhere,
        select: {
          billingDate: true,
          billAmount: true,
          costAmount: true,
        },
      });

      const curByDate = new Map<string, { rev: number; cost: number }>();
      for (const row of curRows) {
        if (!row.billingDate) continue;
        const key = dateKey(row.billingDate);
        const existing = curByDate.get(key) || { rev: 0, cost: 0 };
        existing.rev += row.billAmount ?? 0;
        existing.cost += row.costAmount ?? 0;
        curByDate.set(key, existing);
      }
      for (const [key, { rev, cost }] of curByDate) {
        const marginPct = rev > 0 ? (rev - cost) / rev : 0;
        current.set(key, marginPct);
      }

      const cmpByDate = new Map<string, { rev: number; cost: number }>();
      for (const row of cmpRows) {
        if (!row.billingDate) continue;
        const key = dateKey(row.billingDate);
        const existing = cmpByDate.get(key) || { rev: 0, cost: 0 };
        existing.rev += row.billAmount ?? 0;
        existing.cost += row.costAmount ?? 0;
        cmpByDate.set(key, existing);
      }
      for (const [key, { rev, cost }] of cmpByDate) {
        const marginPct = rev > 0 ? (rev - cost) / rev : 0;
        comparison.set(key, marginPct);
      }
      break;
    }

    case "freight_rpm": {
      const curRows = await prisma.load.findMany({
        where: baseWhere,
        select: {
          billingDate: true,
          billAmount: true,
          miles: true,
        },
      });
      const cmpRows = await prisma.load.findMany({
        where: comparisonWhere,
        select: {
          billingDate: true,
          billAmount: true,
          miles: true,
        },
      });

      const curByDate = new Map<string, { rev: number; miles: number }>();
      for (const row of curRows) {
        if (!row.billingDate) continue;
        const key = dateKey(row.billingDate);
        const existing = curByDate.get(key) || { rev: 0, miles: 0 };
        existing.rev += row.billAmount ?? 0;
        existing.miles += row.miles ?? 0;
        curByDate.set(key, existing);
      }
      for (const [key, { rev, miles }] of curByDate) {
        const rpm = miles > 0 ? rev / miles : 0;
        current.set(key, rpm);
      }

      const cmpByDate = new Map<string, { rev: number; miles: number }>();
      for (const row of cmpRows) {
        if (!row.billingDate) continue;
        const key = dateKey(row.billingDate);
        const existing = cmpByDate.get(key) || { rev: 0, miles: 0 };
        existing.rev += row.billAmount ?? 0;
        existing.miles += row.miles ?? 0;
        cmpByDate.set(key, existing);
      }
      for (const [key, { rev, miles }] of cmpByDate) {
        const rpm = miles > 0 ? rev / miles : 0;
        comparison.set(key, rpm);
      }
      break;
    }

    case "freight_gross_revenue": {
      const curRows = await prisma.load.findMany({
        where: baseWhere,
        select: {
          billingDate: true,
          billAmount: true,
        },
      });
      const cmpRows = await prisma.load.findMany({
        where: comparisonWhere,
        select: {
          billingDate: true,
          billAmount: true,
        },
      });

      for (const row of curRows) {
        if (!row.billingDate) continue;
        const key = dateKey(row.billingDate);
        current.set(key, (current.get(key) ?? 0) + (row.billAmount ?? 0));
      }
      for (const row of cmpRows) {
        if (!row.billingDate) continue;
        const key = dateKey(row.billingDate);
        comparison.set(key, (comparison.get(key) ?? 0) + (row.billAmount ?? 0));
      }
      break;
    }

    case "freight_loads_count": {
      const curRows = await prisma.load.groupBy({
        by: ["billingDate"],
        where: baseWhere,
        _count: { id: true },
      });
      const cmpRows = await prisma.load.groupBy({
        by: ["billingDate"],
        where: comparisonWhere,
        _count: { id: true },
      });

      for (const row of curRows) {
        if (!row.billingDate) continue;
        const key = dateKey(row.billingDate);
        current.set(key, row._count.id);
      }
      for (const row of cmpRows) {
        if (!row.billingDate) continue;
        const key = dateKey(row.billingDate);
        comparison.set(key, row._count.id);
      }
      break;
    }

    default:
      break;
  }

  return { current, comparison };
}

async function getHotelMetricSeries(args: {
  metric: MetricKey;
  dateRange: DateRangeResult;
  scopeWhere: any;
}): Promise<{ current: Map<string, number>; comparison: Map<string, number> }> {
  const { metric, dateRange, scopeWhere } = args;
  const { currentStart, currentEnd, comparisonStart, comparisonEnd } = dateRange;

  const baseWhere: any = {
    ...scopeWhere,
    date: { gte: currentStart, lte: currentEnd },
  };
  const comparisonWhere: any = {
    ...scopeWhere,
    date: { gte: comparisonStart, lte: comparisonEnd },
  };

  const current = new Map<string, number>();
  const comparison = new Map<string, number>();

  const curRows = await prisma.hotelKpiDaily.findMany({
    where: baseWhere,
    select: {
      date: true,
      roomsAvailable: true,
      roomsSold: true,
      totalRevenue: true,
      adr: true,
      revpar: true,
      occupancyPct: true,
    },
  });
  const cmpRows = await prisma.hotelKpiDaily.findMany({
    where: comparisonWhere,
    select: {
      date: true,
      roomsAvailable: true,
      roomsSold: true,
      totalRevenue: true,
      adr: true,
      revpar: true,
      occupancyPct: true,
    },
  });

  function apply(rows: typeof curRows, target: Map<string, number>) {
    for (const row of rows) {
      const key = dateKey(row.date);
      let value = 0;

      switch (metric) {
        case "hotel_revpar":
          value = row.revpar ?? 0;
          break;
        case "hotel_adr":
          value = row.adr ?? 0;
          break;
        case "hotel_occupancy_pct":
          value = row.occupancyPct ?? 0;
          break;
        default:
          value = row.totalRevenue ?? 0;
      }

      target.set(key, (target.get(key) ?? 0) + value);
    }
  }

  apply(curRows, current);
  apply(cmpRows, comparison);

  return { current, comparison };
}

async function getBpoMetricSeries(args: {
  metric: MetricKey;
  dateRange: DateRangeResult;
  scopeWhere: any;
}): Promise<{ current: Map<string, number>; comparison: Map<string, number> }> {
  const { metric, dateRange, scopeWhere } = args;
  const { currentStart, currentEnd, comparisonStart, comparisonEnd } = dateRange;

  const current = new Map<string, number>();
  const comparison = new Map<string, number>();

  const buildCampaignFilter = () => {
    const filter: any = {};
    if (scopeWhere.ventureId) filter.ventureId = scopeWhere.ventureId;
    if (scopeWhere.officeId) filter.officeId = scopeWhere.officeId;
    return Object.keys(filter).length > 0 ? filter : undefined;
  };

  const campaignFilter = buildCampaignFilter();

  switch (metric) {
    case "bpo_calls_per_hour": {
      const curRows = await prisma.bpoDailyMetric.findMany({
        where: {
          date: { gte: currentStart, lte: currentEnd },
          campaign: campaignFilter,
        },
        select: {
          date: true,
          handledCalls: true,
          fteCount: true,
        },
      });
      const cmpRows = await prisma.bpoDailyMetric.findMany({
        where: {
          date: { gte: comparisonStart, lte: comparisonEnd },
          campaign: campaignFilter,
        },
        select: {
          date: true,
          handledCalls: true,
          fteCount: true,
        },
      });

      const curByDate = new Map<string, { calls: number; hours: number }>();
      for (const row of curRows) {
        const key = dateKey(row.date);
        const existing = curByDate.get(key) || { calls: 0, hours: 0 };
        existing.calls += row.handledCalls ?? 0;
        existing.hours += (row.fteCount ?? 1) * 8;
        curByDate.set(key, existing);
      }
      for (const [key, { calls, hours }] of curByDate) {
        current.set(key, hours > 0 ? calls / hours : 0);
      }

      const cmpByDate = new Map<string, { calls: number; hours: number }>();
      for (const row of cmpRows) {
        const key = dateKey(row.date);
        const existing = cmpByDate.get(key) || { calls: 0, hours: 0 };
        existing.calls += row.handledCalls ?? 0;
        existing.hours += (row.fteCount ?? 1) * 8;
        cmpByDate.set(key, existing);
      }
      for (const [key, { calls, hours }] of cmpByDate) {
        comparison.set(key, hours > 0 ? calls / hours : 0);
      }
      break;
    }

    case "bpo_connected_calls": {
      const curRows = await prisma.bpoDailyMetric.findMany({
        where: {
          date: { gte: currentStart, lte: currentEnd },
          campaign: campaignFilter,
        },
        select: {
          date: true,
          handledCalls: true,
        },
      });
      const cmpRows = await prisma.bpoDailyMetric.findMany({
        where: {
          date: { gte: comparisonStart, lte: comparisonEnd },
          campaign: campaignFilter,
        },
        select: {
          date: true,
          handledCalls: true,
        },
      });

      for (const row of curRows) {
        const key = dateKey(row.date);
        current.set(key, (current.get(key) ?? 0) + (row.handledCalls ?? 0));
      }
      for (const row of cmpRows) {
        const key = dateKey(row.date);
        comparison.set(key, (comparison.get(key) ?? 0) + (row.handledCalls ?? 0));
      }
      break;
    }

    case "bpo_qa_score_pct": {
      const curRows = await prisma.bpoDailyMetric.findMany({
        where: {
          date: { gte: currentStart, lte: currentEnd },
          campaign: campaignFilter,
        },
        select: {
          date: true,
          avgQaScore: true,
        },
      });
      const cmpRows = await prisma.bpoDailyMetric.findMany({
        where: {
          date: { gte: comparisonStart, lte: comparisonEnd },
          campaign: campaignFilter,
        },
        select: {
          date: true,
          avgQaScore: true,
        },
      });

      const curByDate = new Map<string, { sum: number; count: number }>();
      for (const row of curRows) {
        if (row.avgQaScore === null) continue;
        const key = dateKey(row.date);
        const existing = curByDate.get(key) || { sum: 0, count: 0 };
        existing.sum += row.avgQaScore;
        existing.count += 1;
        curByDate.set(key, existing);
      }
      for (const [key, { sum, count }] of curByDate) {
        current.set(key, count > 0 ? sum / count : 0);
      }

      const cmpByDate = new Map<string, { sum: number; count: number }>();
      for (const row of cmpRows) {
        if (row.avgQaScore === null) continue;
        const key = dateKey(row.date);
        const existing = cmpByDate.get(key) || { sum: 0, count: 0 };
        existing.sum += row.avgQaScore;
        existing.count += 1;
        cmpByDate.set(key, existing);
      }
      for (const [key, { sum, count }] of cmpByDate) {
        comparison.set(key, count > 0 ? sum / count : 0);
      }
      break;
    }

    case "bpo_attendance_pct": {
      const curRows = await prisma.bpoDailyMetric.findMany({
        where: {
          date: { gte: currentStart, lte: currentEnd },
          campaign: campaignFilter,
        },
        select: {
          date: true,
          fteCount: true,
        },
      });
      const cmpRows = await prisma.bpoDailyMetric.findMany({
        where: {
          date: { gte: comparisonStart, lte: comparisonEnd },
          campaign: campaignFilter,
        },
        select: {
          date: true,
          fteCount: true,
        },
      });

      for (const row of curRows) {
        const key = dateKey(row.date);
        current.set(key, row.fteCount ?? 1);
      }
      for (const row of cmpRows) {
        const key = dateKey(row.date);
        comparison.set(key, row.fteCount ?? 1);
      }
      break;
    }

    default:
      break;
  }

  return { current, comparison };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const user = await getEffectiveUser(req, res);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { metric, dateRange, ventureId, officeId, propertyId, userId } =
      req.query;

    if (!metric) {
      return res.status(400).json({ error: "metric is required" });
    }

    const metricKey = metric as MetricKey;
    const drKey = (dateRange as DateRangeKey) || "LAST_30_DAYS";
    const ranges = getDateRanges(drKey);

    const scopeInput = {
      user,
      ventureId: ventureId as string | undefined,
      officeId: officeId as string | undefined,
      propertyId: propertyId as string | undefined,
      userId: userId as string | undefined,
    };

    let currentMap: Map<string, number>;
    let comparisonMap: Map<string, number>;

    if (metricKey.startsWith("freight_")) {
      const scopeWhere = buildFreightScopeWhere(scopeInput);
      const { current, comparison } = await getFreightMetricSeries({
        metric: metricKey,
        dateRange: ranges,
        scopeWhere,
      });
      currentMap = current;
      comparisonMap = comparison;
    } else if (metricKey.startsWith("hotel_")) {
      const scopeWhere = buildHotelScopeWhere(scopeInput);
      const { current, comparison } = await getHotelMetricSeries({
        metric: metricKey,
        dateRange: ranges,
        scopeWhere,
      });
      currentMap = current;
      comparisonMap = comparison;
    } else if (metricKey.startsWith("bpo_")) {
      const scopeWhere = buildBpoScopeWhere(scopeInput);
      const { current, comparison } = await getBpoMetricSeries({
        metric: metricKey,
        dateRange: ranges,
        scopeWhere,
      });
      currentMap = current;
      comparisonMap = comparison;
    } else {
      currentMap = new Map();
      comparisonMap = new Map();
    }

    const dates = buildSeriesSkeleton(ranges.currentStart, ranges.currentEnd);

    const data: TimeSeriesPoint[] = dates.map((d) => ({
      date: d,
      value: currentMap.get(d) ?? 0,
      comparisonValue: comparisonMap.get(d) ?? 0,
    }));

    return res.status(200).json({ data });
  } catch (e: any) {
    console.error("Analytics series error", e);
    return res.status(500).json({ error: "Internal server error" });
  }
}
