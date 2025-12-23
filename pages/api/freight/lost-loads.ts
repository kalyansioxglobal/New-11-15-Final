import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { requireUser } from '@/lib/apiAuth';
import { applyLoadScope } from "@/lib/scopeLoads";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;
    const shipperId = req.query.shipperId ? Number(req.query.shipperId) : undefined;
    const repId = req.query.repId ? Number(req.query.repId) : undefined;
    const ventureId = req.query.ventureId ? Number(req.query.ventureId) : undefined;
    const reasonId = req.query.reasonId ? Number(req.query.reasonId) : undefined;
    
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 200));
    const skip = (page - 1) * limit;

    const baseWhere: any = {
      loadStatus: "LOST",
    };

    if (from || to) {
      baseWhere.lostAt = {};
      if (from) baseWhere.lostAt.gte = from;
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        baseWhere.lostAt.lte = end;
      }
    }

    if (shipperId) baseWhere.shipperId = shipperId;
    if (repId) baseWhere.createdById = repId;
    if (reasonId) baseWhere.lostReasonId = reasonId;

    if (ventureId) {
      baseWhere.ventureId = ventureId;
    }

    const where = applyLoadScope(user, baseWhere);

    const [loads, totalCount, reasonIdGroups] = await Promise.all([
      prisma.load.findMany({
        where,
        include: {
          shipper: {
            select: {
              id: true,
              name: true,
              tmsShipperCode: true,
            },
          },
          lostReasonRef: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
          venture: {
            select: {
              id: true,
              name: true,
            },
          },
          office: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { lostAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.load.count({ where }),
      prisma.load.groupBy({
        by: ["lostReasonId", "lostReason"],
        where,
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 20,
      }),
    ]);

    const result = loads.map((l: (typeof loads)[number]) => {
      const repName = l.createdBy?.fullName || null;

      return {
        id: l.id,
        tmsLoadId: l.tmsLoadId,
        reference: l.reference,
        loadStatus: l.loadStatus,
        lostAt: l.lostAt,
        fellOffAt: l.fellOffAt,
        pickupDate: l.pickupDate,
        pickupCity: l.pickupCity,
        pickupState: l.pickupState,
        dropCity: l.dropCity,
        dropState: l.dropState,
        deliveryCity: l.dropCity,
        deliveryState: l.dropState,
        equipmentType: l.equipmentType,
        rate: l.rate,
        billAmount: l.billAmount,
        lostReason: l.lostReasonRef?.name || l.lostReason,
        lostReasonCategory: l.lostReasonRef?.category || l.lostReasonCategory,
        shipperName: l.shipper?.name || l.shipperName,
        shipperCode: l.shipper?.tmsShipperCode,
        customerName: l.customer?.name || l.customerName,
        repName,
        salesRepName: repName,
        ventureName: l.venture?.name,
        officeName: l.office?.name,
      };
    });

    const reasonRefIds = reasonIdGroups
      .filter((g: (typeof reasonIdGroups)[number]) => g.lostReasonId !== null)
      .map((g: (typeof reasonIdGroups)[number]) => g.lostReasonId as number);

    const reasonRefs =
      reasonRefIds.length > 0
        ? await prisma.lostLoadReason.findMany({
            where: { id: { in: reasonRefIds } },
            select: { id: true, name: true },
          })
        : [];

    const reasonRefMap = new Map(
      reasonRefs.map((r: (typeof reasonRefs)[number]) => [r.id, r.name]),
    );

    const reasonSummary = reasonIdGroups.map((g: (typeof reasonIdGroups)[number]) => ({
      reason: g.lostReasonId
        ? reasonRefMap.get(g.lostReasonId) || g.lostReason || "Unknown"
        : g.lostReason || "Unknown",
      count: g._count.id,
    }));

    return res.status(200).json({
      loads: result,
      count: result.length,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      reasonSummary,
    });
  } catch (err) {
    console.error("lost-loads error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
