import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { createApiHandler } from "@/lib/api/handler";
import { safeValidate } from "@/lib/api/validation";
import { applyLoadScope } from "@/lib/scopeLoads";

const QuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  csrId: z.coerce.number().int().positive().optional(),
  ventureId: z.coerce.number().int().positive().optional(),
});

export default createApiHandler(
  {
    GET: async (req: NextApiRequest, res: NextApiResponse, ctx) => {
      const validation = safeValidate(QuerySchema, req.query);
      if (validation.success === false) {
        return res.status(400).json({ error: validation.error });
      }

      const { from, to, csrId, ventureId } = validation.data;

      try {
        const baseWhere: Record<string, unknown> = {};

        if (from || to) {
          baseWhere.createdAt = {};
          if (from) (baseWhere.createdAt as Record<string, Date>).gte = new Date(from);
          if (to) (baseWhere.createdAt as Record<string, Date>).lte = new Date(to);
        }

        if (ventureId) baseWhere.ventureId = ventureId;
        if (csrId) baseWhere.createdById = csrId;

        const where = applyLoadScope(ctx.user!, baseWhere);

        const loads = await prisma.load.findMany({
          where,
          select: {
            id: true,
            loadStatus: true,
            atRiskFlag: true,
            createdAt: true,
          },
        });

        const totalLoads = loads.length;
        const atRisk = loads.filter((l) => l.atRiskFlag).length;
        const lost = loads.filter((l) => String(l.loadStatus) === "LOST").length;
        const delivered = loads.filter((l) => String(l.loadStatus) === "DELIVERED").length;
        const fellOff = loads.filter((l) => String(l.loadStatus) === "FELL_OFF").length;
        const covered = loads.filter((l) => String(l.loadStatus) === "COVERED").length;

        const coverageRatio = totalLoads > 0 ? delivered / totalLoads : 0;
        const atRiskRate = totalLoads > 0 ? atRisk / totalLoads : 0;
        const lostRate = totalLoads > 0 ? lost / totalLoads : 0;

        return res.status(200).json({
          totalLoads,
          atRisk,
          lost,
          delivered,
          fellOff,
          covered,
          coverageRatio: Math.round(coverageRatio * 10000) / 100,
          atRiskRate: Math.round(atRiskRate * 10000) / 100,
          lostRate: Math.round(lostRate * 10000) / 100,
        });
      } catch (err) {
        const error = err as Error & { statusCode?: number };
        console.error("Error computing CSR KPI:", error);
        return res.status(error.statusCode ?? 500).json({ 
          error: error.message ?? "Internal Server Error" 
        });
      }
    },
  },
  { requireAuth: true }
);
