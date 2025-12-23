import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { createApiHandler } from "@/lib/api/handler";
import { safeValidate } from "@/lib/api/validation";
import { applyLoadScope } from "@/lib/scopeLoads";

const QuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  dispatcherId: z.coerce.number().int().positive().optional(),
  ventureId: z.coerce.number().int().positive().optional(),
});

export default createApiHandler(
  {
    GET: async (req: NextApiRequest, res: NextApiResponse, ctx) => {
      const validation = safeValidate(QuerySchema, req.query);
      if (validation.success === false) {
        return res.status(400).json({ error: validation.error });
      }

      const { from, to, dispatcherId, ventureId } = validation.data;

      try {
        const baseWhere: Record<string, unknown> = {};

        if (ventureId) baseWhere.ventureId = ventureId;

        if (from || to) {
          baseWhere.createdAt = {};
          if (from) (baseWhere.createdAt as Record<string, Date>).gte = new Date(from);
          if (to) (baseWhere.createdAt as Record<string, Date>).lte = new Date(to);
        }

        const loadWhere = applyLoadScope(ctx.user!, baseWhere);

        const eventWhere: Record<string, unknown> = {
          load: loadWhere,
          type: {
            in: ["CARRIER_OFFERED", "STATUS_CHANGED", "FELL_OFF", "CARRIER_REJECTED"],
          },
        };

        if (dispatcherId) {
          eventWhere.createdById = dispatcherId;
        }

        if (from || to) {
          eventWhere.createdAt = {};
          if (from) (eventWhere.createdAt as Record<string, Date>).gte = new Date(from);
          if (to) (eventWhere.createdAt as Record<string, Date>).lte = new Date(to);
        }

        const events = await prisma.logisticsLoadEvent.findMany({
          where: eventWhere,
          include: {
            load: {
              select: { id: true, ventureId: true },
            },
            createdBy: {
              select: { id: true, fullName: true },
            },
          },
        });

        const totalActions = events.length;
        const byLoad = new Map<number, number>();
        for (const e of events) {
          byLoad.set(e.loadId, (byLoad.get(e.loadId) ?? 0) + 1);
        }

        const avgActionsPerLoad =
          byLoad.size > 0
            ? Array.from(byLoad.values()).reduce((a, b) => a + b, 0) / byLoad.size
            : 0;

        return res.status(200).json({
          totalActions,
          loadsTouched: byLoad.size,
          avgActionsPerLoad: Math.round(avgActionsPerLoad * 100) / 100,
        });
      } catch (err) {
        const error = err as Error & { statusCode?: number };
        console.error("Error computing dispatch KPI:", error);
        return res.status(error.statusCode ?? 500).json({ 
          error: error.message ?? "Internal Server Error" 
        });
      }
    },
  },
  { requireAuth: true }
);
