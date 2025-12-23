import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { createApiHandler } from "@/lib/api/handler";
import { safeValidate } from "@/lib/api/validation";
import { applyLoadScope } from "@/lib/scopeLoads";
import type { Prisma } from "@prisma/client";

const QuerySchema = z.object({
  hoursUntilPickup: z.coerce.number().positive().default(24),
  ventureId: z.coerce.number().int().positive().optional(),
  officeId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

export default createApiHandler(
  {
    GET: async (req: NextApiRequest, res: NextApiResponse, ctx) => {
      const validation = safeValidate(QuerySchema, req.query);
      if (validation.success === false) {
        return res.status(400).json({ error: validation.error });
      }

      const { hoursUntilPickup, ventureId, officeId, page, limit } = validation.data;

      try {
        const skip = (page - 1) * limit;
        const cutoff = new Date(Date.now() + hoursUntilPickup * 60 * 60 * 1000);

        const baseWhere: Prisma.LoadWhereInput = {
          loadStatus: { in: ["OPEN", "AT_RISK"] },
          pickupDate: { lte: cutoff },
        };

        if (ventureId) {
          baseWhere.ventureId = ventureId;
        }

        if (officeId) {
          baseWhere.officeId = officeId;
        }

        const where = applyLoadScope(ctx.user!, baseWhere);

        const [loads, totalCount] = await Promise.all([
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
              carrier: {
                select: {
                  id: true,
                  name: true,
                  mcNumber: true,
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
            orderBy: { pickupDate: "asc" },
            skip,
            take: limit,
          }),
          prisma.load.count({ where }),
        ]);

        const result = loads.map((l) => {
          const hoursToPickup = l.pickupDate
            ? Math.round(
                (new Date(l.pickupDate).getTime() - Date.now()) / (1000 * 60 * 60)
              )
            : null;

          const repName = l.createdBy?.fullName || null;

          return {
            id: l.id,
            tmsLoadId: l.tmsLoadId,
            reference: l.reference,
            loadStatus: l.loadStatus,
            atRiskFlag: l.atRiskFlag,
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
            hoursToPickup,
            shipperName: l.shipper?.name || l.shipperName,
            shipperCode: l.shipper?.tmsShipperCode,
            carrierName: l.carrier?.name,
            carrierMC: l.carrier?.mcNumber,
            customerName: l.customer?.name || l.customerName,
            repName,
            salesRepName: repName,
            ventureName: l.venture?.name,
            officeName: l.office?.name,
          };
        });

        return res.status(200).json({
          loads: result,
          cutoffHours: hoursUntilPickup,
          cutoffTime: cutoff.toISOString(),
          count: result.length,
          totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        });
      } catch (err) {
        console.error("at-risk-loads error:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  },
  { requireAuth: true }
);
