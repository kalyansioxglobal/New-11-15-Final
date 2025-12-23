import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { withUser } from "@/lib/api";
import { getUserScope, isGlobalAdmin } from "@/lib/scope";
import type { SessionUser } from "@/lib/scope";
import { logAuditEvent } from "@/lib/audit";

function getPrimaryVentureId(user: SessionUser): number | null {
  if (user.ventureIds && user.ventureIds.length > 0) {
    return user.ventureIds[0];
  }
  return null;
}

export default withUser(async function handler(req: NextApiRequest, res: NextApiResponse, user) {
  if (req.method === "GET") {
    try {
      const scope = getUserScope(user);
      const {
        page = "1",
        pageSize = "20",
        ventureId,
        search,
        createdByUserId,
        isPinned,
      } = req.query;

      const pageNumRaw = parseInt(String(page), 10);
      const pageSizeParsed = parseInt(String(pageSize), 10);
      const pageNum = Number.isFinite(pageNumRaw) && pageNumRaw > 0 ? pageNumRaw : 1;
      const take =
        Number.isFinite(pageSizeParsed) && pageSizeParsed > 0 && pageSizeParsed <= 100
          ? pageSizeParsed
          : 20;
      const skip = (pageNum - 1) * take;

      const where: any = {};

      // Venture scoping
      let vId: number | null = null;
      if (ventureId) {
        const parsed = Number(ventureId);
        if (!Number.isNaN(parsed)) vId = parsed;
      } else {
        vId = getPrimaryVentureId(user);
      }

      if (vId != null) {
        if (!scope.allVentures && !scope.ventureIds.includes(vId)) {
          return res.status(403).json({ error: "FORBIDDEN_VENTURE" });
        }
        where.ventureId = vId;
      } else if (!scope.allVentures && scope.ventureIds.length > 0) {
        where.ventureId = { in: scope.ventureIds };
      }

      if (search && typeof search === "string" && search.trim()) {
        const q = search.trim();
        where.OR = [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ];
      }

      if (createdByUserId) {
        const cId = Number(createdByUserId);
        if (!Number.isNaN(cId)) {
          where.createdByUserId = cId;
        }
      }

      if (isPinned === "true") {
        where.isPinned = true;
      } else if (isPinned === "false") {
        where.isPinned = false;
      }

      const [items, total] = await Promise.all([
        prisma.incentiveScenario.findMany({
          where,
          select: {
            id: true,
            name: true,
            description: true,
            ventureId: true,
            createdByUserId: true,
            isPinned: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: [
            { isPinned: "desc" },
            { updatedAt: "desc" },
          ],
          skip,
          take,
        }),
        prisma.incentiveScenario.count({ where }),
      ]);

      const totalPages = Math.max(1, Math.ceil(total / take));

      return res.status(200).json({ items, page: pageNum, pageSize: take, total, totalPages });
    } catch (err: any) {
      console.error("Incentive scenarios list error", err);
      return res
        .status(500)
        .json({ error: "Internal server error", detail: err.message || String(err) });
    }
  }

  if (req.method === "POST") {
    try {
      // Only leadership / finance can create scenarios
      if (
        user.role !== "CEO" &&
        user.role !== "ADMIN" &&
        user.role !== "COO" &&
        user.role !== "VENTURE_HEAD" &&
        user.role !== "FINANCE"
      ) {
        return res.status(403).json({ error: "Forbidden", detail: "Insufficient permissions for incentive scenarios" });
      }

      const scope = getUserScope(user);
      const { name, description, ventureId, isPinned, config } = req.body;

      if (!name || typeof name !== "string" || !name.trim()) {
        return res
          .status(400)
          .json({ error: "VALIDATION_ERROR", detail: "name is required" });
      }

      if (config == null) {
        return res
          .status(400)
          .json({ error: "VALIDATION_ERROR", detail: "config is required" });
      }

      let vId: number | null = null;
      if (ventureId) {
        vId = Number(ventureId);
        if (Number.isNaN(vId)) {
          return res
            .status(400)
            .json({ error: "VALIDATION_ERROR", detail: "ventureId must be a number" });
        }
      } else {
        vId = getPrimaryVentureId(user);
      }

      if (vId == null) {
        return res
          .status(400)
          .json({ error: "VALIDATION_ERROR", detail: "ventureId is required or must be inferable" });
      }

      if (!scope.allVentures && !scope.ventureIds.includes(vId)) {
        return res.status(403).json({ error: "FORBIDDEN_VENTURE" });
      }

      try {
        const scenario = await prisma.incentiveScenario.create({
          data: {
            name: name.trim(),
            description: description || null,
            ventureId: vId,
            createdByUserId: user.id,
            isPinned: Boolean(isPinned),
            config,
          },
        });

        await logAuditEvent(req, user, {
          domain: "admin",
          action: "INCENTIVE_SCENARIO_CREATE",
          entityType: "INCENTIVE_SCENARIO",
          entityId: scenario.id,
          metadata: { scenario },
        });

        return res.status(201).json(scenario);
      } catch (err: any) {
        if (err?.code === "P2002") {
          return res.status(400).json({
            error: "VALIDATION_ERROR",
            detail: "A scenario with this name already exists for this venture",
          });
        }
        console.error("Incentive scenario create error", err);
        return res
          .status(500)
          .json({ error: "Internal server error", detail: err.message || String(err) });
      }
    } catch (err: any) {
      console.error("Incentive scenario create error", err);
      return res
        .status(500)
        .json({ error: "Internal server error", detail: err.message || String(err) });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Method not allowed" });
});
