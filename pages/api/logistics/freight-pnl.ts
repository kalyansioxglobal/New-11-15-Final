import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { canViewPortfolioResource } from "@/lib/permissions";
import { requireUser } from "@/lib/apiAuth";
import { applyLoadScope } from "@/lib/scopeLoads";

function parseDate(value: string | string[] | undefined): Date | null {
  if (!value || Array.isArray(value)) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

async function rawHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  if (!canViewPortfolioResource(user, "LOGISTICS_PNL_VIEW")) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }

  try {
    const { ventureId: ventureIdParam, officeId: officeIdParam, customerId: customerIdParam, from: fromParam, to: toParam, limit: limitParam } = req.query;

    const ventureId = ventureIdParam ? Number(ventureIdParam) : undefined;
    const officeId = officeIdParam ? Number(officeIdParam) : undefined;
    const customerId = customerIdParam ? Number(customerIdParam) : undefined;

    let from = parseDate(fromParam as string | undefined);
    let to = parseDate(toParam as string | undefined);

    const now = new Date();
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
    const MAX_DAYS = 365;

    if (diffDays > MAX_DAYS) {
      return res.status(400).json({ error: "Date range too large" });
    }

    const limitRaw = limitParam ? Number(limitParam) : 500;
    const safeLimit = Math.max(1, Math.min(2000, Number.isNaN(limitRaw) ? 500 : limitRaw));

    const baseWhere: any = {
      loadStatus: "DELIVERED",
      actualDeliveryAt: {
        gte: fromDay,
        lte: toDay,
      },
    };

    if (ventureId) {
      baseWhere.ventureId = ventureId;
    }

    if (officeId) {
      baseWhere.officeId = officeId;
    }

    if (customerId) {
      baseWhere.customerId = customerId;
    }

    const scopedWhere = applyLoadScope(user, baseWhere);

    const loads = await prisma.load.findMany({
      where: scopedWhere,
      orderBy: { actualDeliveryAt: "desc" },
      take: safeLimit,
      select: {
        id: true,
        ventureId: true,
        officeId: true,
        actualDeliveryAt: true,
        sellRate: true,
        buyRate: true,
        billAmount: true,
        costAmount: true,
        customerId: true,
        isTest: true,
      },
    });

    let totalRevenue = 0;
    let totalCost = 0;
    let totalMargin = 0;

    const items = loads.map((load) => {
      const revenue = Number(load.billAmount ?? load.sellRate ?? 0);
      const cost = Number(load.costAmount ?? load.buyRate ?? 0);
      const margin = revenue - cost;

      totalRevenue += revenue;
      totalCost += cost;
      totalMargin += margin;

      return {
        id: load.id,
        ventureId: load.ventureId,
        officeId: load.officeId,
        completionDate: load.actualDeliveryAt,
        revenue,
        cost,
        margin,
        customerId: load.customerId,
        isTest: load.isTest,
      };
    });

    return res.status(200).json({
      from: fromDay.toISOString().slice(0, 10),
      to: toDay.toISOString().slice(0, 10),
      items,
      totalRevenue,
      totalCost,
      totalMargin,
      count: items.length,
    });
  } catch (error: any) {
    console.error("Freight PnL handler error", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default rawHandler;
