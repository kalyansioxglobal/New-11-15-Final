import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";
import { applyLoadScope } from "@/lib/scopeLoads";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const { from, to, groupBy = "month", ventureId } = req.query;

    const baseWhere: Record<string, unknown> = {};

    if (ventureId) baseWhere.ventureId = Number(ventureId);

    if (from || to) {
      baseWhere.createdAt = {};
      if (from) (baseWhere.createdAt as Record<string, Date>).gte = new Date(from as string);
      if (to) (baseWhere.createdAt as Record<string, Date>).lte = new Date(to as string);
    }

    const where = applyLoadScope(user, baseWhere);

    const loads = await prisma.load.findMany({
      where,
      select: {
        id: true,
        billAmount: true,
        costAmount: true,
        marginAmount: true,
        marginPercentage: true,
        createdAt: true,
        pickupDate: true,
      },
    });

    const buckets: Record<
      string,
      {
        revenue: number;
        cost: number;
        margin: number;
        loads: number;
      }
    > = {};

    for (const l of loads) {
      const dateField = l.pickupDate ?? l.createdAt;
      if (!dateField) continue;

      const d = new Date(dateField);
      let key = "";

      if (groupBy === "day") {
        key = d.toISOString().slice(0, 10);
      } else if (groupBy === "year") {
        key = `${d.getUTCFullYear()}`;
      } else if (groupBy === "week") {
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        key = weekStart.toISOString().slice(0, 10);
      } else {
        key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      }

      if (!buckets[key]) {
        buckets[key] = { revenue: 0, cost: 0, margin: 0, loads: 0 };
      }

      const bill = Number(l.billAmount) || 0;
      const cost = Number(l.costAmount) || 0;
      const margin = Number(l.marginAmount) || (bill - cost);

      buckets[key].revenue += bill;
      buckets[key].cost += cost;
      buckets[key].margin += margin;
      buckets[key].loads += 1;
    }

    const rows = Object.entries(buckets)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([label, data]) => ({
        label,
        ...data,
        marginPercent: data.revenue > 0
          ? Math.round((data.margin / data.revenue) * 10000) / 100
          : 0,
      }));

    const totals = rows.reduce(
      (acc, row) => ({
        revenue: acc.revenue + row.revenue,
        cost: acc.cost + row.cost,
        margin: acc.margin + row.margin,
        loads: acc.loads + row.loads,
      }),
      { revenue: 0, cost: 0, margin: 0, loads: 0 }
    );

    return res.status(200).json({
      rows,
      totals: {
        ...totals,
        marginPercent: totals.revenue > 0
          ? Math.round((totals.margin / totals.revenue) * 10000) / 100
          : 0,
      },
    });
  } catch (err: any) {
    console.error("Error computing freight PnL summary:", err);
    return res.status(err.statusCode ?? 500).json({ error: err.message ?? "Internal Server Error" });
  }
}
