import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/apiAuth";
import prisma from "@/lib/prisma";

function isAllowedRole(role: string): boolean {
  return ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "TEAM_LEAD", "DISPATCHER"].includes(role);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  if (!isAllowedRole(user.role)) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }

  const { startDate, endDate, ventureId } = req.query;

  const dateFilter: any = {};
  if (startDate) {
    dateFilter.gte = new Date(startDate as string);
  } else {
    dateFilter.gte = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  }
  if (endDate) {
    dateFilter.lte = new Date(endDate as string);
  }

  const where: any = {
    createdAt: dateFilter,
  };

  if (ventureId) {
    where.ventureId = parseInt(ventureId as string, 10);
  }

  try {
    const [
      totalLoads,
      coveredLoads,
      lostLoads,
      openLoads,
      atRiskLoads,
      carrierContacts,
      uniqueCarriersContacted,
      loadsByStatus,
      dailyCoverage,
    ] = await Promise.all([
      prisma.load.count({ where }),
      prisma.load.count({ where: { ...where, loadStatus: "DELIVERED" } }),
      prisma.load.count({ where: { ...where, loadStatus: "LOST" } }),
      prisma.load.count({ where: { ...where, loadStatus: "OPEN" } }),
      prisma.load.count({ where: { ...where, loadStatus: "AT_RISK" } }),
      prisma.carrierContact.count({
        where: {
          createdAt: dateFilter,
        },
      }),
      prisma.carrierContact.groupBy({
        by: ["carrierId"],
        where: {
          createdAt: dateFilter,
        },
      }),
      prisma.load.groupBy({
        by: ["loadStatus"],
        where,
        _count: { id: true },
      }),
      (async () => {
        if (dateFilter.lte) {
          return prisma.$queryRaw`
            SELECT 
              DATE("createdAt") as date,
              COUNT(*) FILTER (WHERE "loadStatus" = 'DELIVERED' OR "loadStatus" = 'COVERED') as covered,
              COUNT(*) FILTER (WHERE "loadStatus" = 'LOST') as lost,
              COUNT(*) FILTER (WHERE "loadStatus" = 'OPEN') as open,
              COUNT(*) as total
            FROM "Load"
            WHERE "createdAt" >= ${dateFilter.gte} AND "createdAt" <= ${dateFilter.lte}
            GROUP BY DATE("createdAt")
            ORDER BY date DESC
            LIMIT 30
          `;
        } else {
          return prisma.$queryRaw`
            SELECT 
              DATE("createdAt") as date,
              COUNT(*) FILTER (WHERE "loadStatus" = 'DELIVERED' OR "loadStatus" = 'COVERED') as covered,
              COUNT(*) FILTER (WHERE "loadStatus" = 'LOST') as lost,
              COUNT(*) FILTER (WHERE "loadStatus" = 'OPEN') as open,
              COUNT(*) as total
            FROM "Load"
            WHERE "createdAt" >= ${dateFilter.gte}
            GROUP BY DATE("createdAt")
            ORDER BY date DESC
            LIMIT 30
          `;
        }
      })(),
    ]);

    const coveredAndDelivered = await prisma.load.count({
      where: {
        ...where,
        loadStatus: { in: ["DELIVERED", "COVERED"] },
      },
    });

    const coverageRate = totalLoads > 0 ? ((coveredAndDelivered / totalLoads) * 100).toFixed(1) : "0.0";
    const lossRate = totalLoads > 0 ? ((lostLoads / totalLoads) * 100).toFixed(1) : "0.0";

    const topCarriers = await prisma.load.groupBy({
      by: ["carrierId"],
      where: {
        ...where,
        carrierId: { not: null },
        loadStatus: { in: ["DELIVERED", "COVERED"] },
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

    const carrierDetails = await prisma.carrier.findMany({
      where: { id: { in: topCarriers.map((c) => c.carrierId!).filter(Boolean) } },
      select: { id: true, name: true, onTimePercentage: true },
    });

    const topCarriersWithNames = topCarriers.map((c) => {
      const carrier = carrierDetails.find((cd) => cd.id === c.carrierId);
      return {
        carrierId: c.carrierId,
        carrierName: carrier?.name || "Unknown",
        loadsCovered: c._count.id,
        onTimePercentage: carrier?.onTimePercentage,
      };
    });

    const responseRateData = await prisma.carrierContact.groupBy({
      by: ["outcome"],
      where: {
        createdAt: dateFilter,
      },
      _count: { id: true },
    });

    return res.status(200).json({
      summary: {
        totalLoads,
        coveredLoads: coveredAndDelivered,
        lostLoads,
        openLoads,
        atRiskLoads,
        coverageRate: parseFloat(coverageRate),
        lossRate: parseFloat(lossRate),
      },
      outreach: {
        totalContacts: carrierContacts,
        uniqueCarriersContacted: uniqueCarriersContacted.length,
        responseBreakdown: responseRateData.map((r) => ({
          outcome: r.outcome,
          count: r._count.id,
        })),
      },
      loadsByStatus: loadsByStatus.map((s) => ({
        status: s.loadStatus,
        count: s._count.id,
      })),
      topCarriers: topCarriersWithNames,
      dailyCoverage: Array.isArray(dailyCoverage)
        ? dailyCoverage.map((d: any) => ({
            date: d.date,
            covered: Number(d.covered) || 0,
            lost: Number(d.lost) || 0,
            open: Number(d.open) || 0,
            total: Number(d.total) || 0,
          }))
        : [],
      dateRange: {
        start: dateFilter.gte,
        end: dateFilter.lte || new Date(),
      },
    });
  } catch (err: any) {
    console.error("/api/freight/coverage-stats error", err);
    return res.status(500).json({ error: "Failed to fetch coverage stats" });
  }
}
