import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { requireAdminPanelUser } from "@/lib/apiAuth";
import { applyLoadScope } from "@/lib/scopeLoads";
import { computeMarginFields } from "@/lib/freight/margins";

type WorstLoad = {
  id: number;
  lane: string;
  bill: number;
  cost: number;
  margin: number;
  marginPct: number;
  pickupDate: string | null;
};

type LowMarginEntry = {
  customer: { id: number; name: string };
  csr: { id: number; name: string; email: string } | null;
  window: { days: number; from: string; to: string };
  loadsCount: number;
  totalRevenue: number;
  totalCost: number;
  totalMargin: number;
  marginPct: number;
  avgMarginPerLoad: number;
  worstLoads: WorstLoad[];
};

type LowMarginRadarResponse = {
  results: LowMarginEntry[];
  meta: {
    days: number;
    minLoads: number;
    thresholdPct: number;
    totalResults: number;
    capped: boolean;
  };
};

const MAX_RESULTS = 200;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LowMarginRadarResponse | { error: string }>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireAdminPanelUser(req, res);
  if (!user) return;

  const allowedRoles = ["SUPER_ADMIN", "ADMIN", "FREIGHT_MANAGER"];
  if (!allowedRoles.includes(user.role)) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  try {
    const days = Math.min(Math.max(parseInt(String(req.query.days)) || 14, 1), 90);
    const minLoads = Math.max(parseInt(String(req.query.minLoads)) || 5, 1);
    const thresholdPct = Math.min(Math.max(parseFloat(String(req.query.thresholdPct)) || 0.08, 0), 1);
    const ventureId = req.query.ventureId ? parseInt(String(req.query.ventureId)) : undefined;
    const officeId = req.query.officeId ? parseInt(String(req.query.officeId)) : undefined;

    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

    const baseWhere: Record<string, unknown> = {
      billAmount: { not: null },
      costAmount: { not: null },
      pickupDate: {
        gte: from,
        lte: to,
      },
    };

    if (ventureId) {
      baseWhere.ventureId = ventureId;
    }
    if (officeId) {
      baseWhere.officeId = officeId;
    }

    const where = applyLoadScope(user, baseWhere);

    const loads = await prisma.load.findMany({
      where,
      include: {
        customer: {
          include: {
            csr: true,
          },
        },
      },
      orderBy: {
        pickupDate: "desc",
      },
    });

    type LoadWithMargin = {
      id: number;
      customerId: number;
      customerName: string;
      csrId: number | null;
      csrName: string | null;
      csrEmail: string | null;
      bill: number;
      cost: number;
      margin: number;
      marginPct: number;
      pickupDate: Date | null;
      lane: string;
    };

    const loadsWithMargin: LoadWithMargin[] = [];

    for (const load of loads) {
      if (!load.customerId || !load.customer) continue;

      const { margin, marginPercent } = computeMarginFields({
        billAmount: load.billAmount,
        costAmount: load.costAmount,
      });

      loadsWithMargin.push({
        id: load.id,
        customerId: load.customerId,
        customerName: load.customer.name || "Unknown",
        csrId: load.customer.assignedCsrId,
        csrName: load.customer.csr?.fullName ?? null,
        csrEmail: load.customer.csr?.email ?? null,
        bill: load.billAmount ?? 0,
        cost: load.costAmount ?? 0,
        margin,
        marginPct: marginPercent,
        pickupDate: load.pickupDate,
        lane: formatLane(load.pickupCity, load.pickupState, load.dropCity, load.dropState),
      });
    }

    const grouped = new Map<string, LoadWithMargin[]>();

    for (const load of loadsWithMargin) {
      const key = `${load.customerId}-${load.csrId ?? "none"}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(load);
    }

    const results: LowMarginEntry[] = [];

    for (const [, groupLoads] of grouped) {
      if (groupLoads.length < minLoads) continue;

      const first = groupLoads[0];
      let totalRevenue = 0;
      let totalCost = 0;

      for (const l of groupLoads) {
        totalRevenue += l.bill;
        totalCost += l.cost;
      }

      const totalMargin = totalRevenue - totalCost;
      const marginPct = totalRevenue > 0 ? totalMargin / totalRevenue : 0;

      if (marginPct >= thresholdPct) continue;

      const sortedByMargin = [...groupLoads].sort((a, b) => a.margin - b.margin);
      const worstLoads: WorstLoad[] = sortedByMargin.slice(0, 3).map((l) => ({
        id: l.id,
        lane: l.lane,
        bill: l.bill,
        cost: l.cost,
        margin: l.margin,
        marginPct: l.marginPct,
        pickupDate: l.pickupDate?.toISOString() ?? null,
      }));

      results.push({
        customer: {
          id: first.customerId,
          name: first.customerName,
        },
        csr: first.csrId
          ? {
              id: first.csrId,
              name: first.csrName || "Unknown",
              email: first.csrEmail || "",
            }
          : null,
        window: {
          days,
          from: from.toISOString(),
          to: to.toISOString(),
        },
        loadsCount: groupLoads.length,
        totalRevenue,
        totalCost,
        totalMargin,
        marginPct,
        avgMarginPerLoad: groupLoads.length > 0 ? totalMargin / groupLoads.length : 0,
        worstLoads,
      });
    }

    results.sort((a, b) => a.marginPct - b.marginPct);

    const capped = results.length > MAX_RESULTS;
    const cappedResults = results.slice(0, MAX_RESULTS);

    return res.status(200).json({
      results: cappedResults,
      meta: {
        days,
        minLoads,
        thresholdPct,
        totalResults: cappedResults.length,
        capped,
      },
    });
  } catch (err) {
    console.error("Low margin radar error:", err);
    return res.status(500).json({ error: "Failed to compute low margin radar" });
  }
}

function formatLane(
  pickupCity: string | null,
  pickupState: string | null,
  dropCity: string | null,
  dropState: string | null
): string {
  const origin = [pickupCity, pickupState].filter(Boolean).join(", ") || "Unknown";
  const dest = [dropCity, dropState].filter(Boolean).join(", ") || "Unknown";
  return `${origin} → ${dest}`;
}
