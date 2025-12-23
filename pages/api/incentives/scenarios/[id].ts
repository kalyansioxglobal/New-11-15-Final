import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { withUser } from "@/lib/api";
import { getUserScope, isGlobalAdmin } from "@/lib/scope";
import { logAuditEvent } from "@/lib/audit";

export default withUser(async function handler(req: NextApiRequest, res: NextApiResponse, user) {
  const idParam = req.query.id;
  const id = Array.isArray(idParam) ? Number(idParam[0]) : Number(idParam);

  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ error: "VALIDATION_ERROR", detail: "Invalid scenario id" });
  }

  const scope = getUserScope(user);

  async function loadScenario() {
    const scenario = await prisma.incentiveScenario.findUnique({
      where: { id },
    });
    if (!scenario) return null;

    if (!scope.allVentures && !scope.ventureIds.includes(scenario.ventureId)) {
      return "FORBIDDEN" as const;
    }

    return scenario;
  }

  if (req.method === "GET") {
    try {
      const scenario = await loadScenario();
      if (scenario === "FORBIDDEN") {
        return res.status(403).json({ error: "FORBIDDEN_VENTURE" });
      }
      if (!scenario) {
        return res.status(404).json({ error: "NOT_FOUND" });
      }
      return res.status(200).json(scenario);
    } catch (err: any) {
      console.error("Incentive scenario detail error", err);
      return res
        .status(500)
        .json({ error: "Internal server error", detail: err.message || String(err) });
    }
  }

  if (req.method === "PUT") {
    try {
      // Only leadership / finance or scenario owner (within venture scope) can update
      if (
        user.role !== "CEO" &&
        user.role !== "ADMIN" &&
        user.role !== "COO" &&
        user.role !== "VENTURE_HEAD" &&
        user.role !== "FINANCE"
      ) {
        return res.status(403).json({ error: "Forbidden", detail: "Insufficient permissions to update incentive scenario" });
      }

      const existing = await loadScenario();
      if (existing === "FORBIDDEN") {
        return res.status(403).json({ error: "FORBIDDEN_VENTURE" });
      }
      if (!existing) {
        return res.status(404).json({ error: "NOT_FOUND" });
      }

      const isOwner = existing.createdByUserId === user.id;
      const canEdit = isGlobalAdmin(user) || (isOwner && scope.ventureIds.includes(existing.ventureId));
      if (!canEdit) {
        return res.status(403).json({ error: "FORBIDDEN" });
      }

      const { name, description, isPinned, config } = req.body;

      const data: any = {};
      if (name !== undefined) {
        if (!name || typeof name !== "string" || !name.trim()) {
          return res.status(400).json({
            error: "VALIDATION_ERROR",
            detail: "name must be a non-empty string when provided",
          });
        }
        data.name = name.trim();
      }
      if (description !== undefined) {
        data.description = description || null;
      }
      if (isPinned !== undefined) {
        data.isPinned = Boolean(isPinned);
      }
      if (config !== undefined) {
        data.config = config;
      }

      try {
        const updated = await prisma.incentiveScenario.update({
          where: { id },
          data,
        });

        await logAuditEvent(req, user, {
          domain: "admin",
          action: "INCENTIVE_SCENARIO_UPDATE",
          entityType: "INCENTIVE_SCENARIO",
          entityId: updated.id,
          metadata: { before: existing, after: updated },
        });

        return res.status(200).json(updated);
      } catch (err: any) {
        if (err?.code === "P2002") {
          return res.status(400).json({
            error: "VALIDATION_ERROR",
            detail: "A scenario with this name already exists for this venture",
          });
        }
        console.error("Incentive scenario update error", err);
        return res
          .status(500)
          .json({ error: "Internal server error", detail: err.message || String(err) });
      }
    } catch (err: any) {
      console.error("Incentive scenario update error", err);
      return res
        .status(500)
        .json({ error: "Internal server error", detail: err.message || String(err) });
    }
  }

  if (req.method === "DELETE") {
    try {
      // Only leadership / finance or scenario owner (within venture scope) can delete
      if (
        user.role !== "CEO" &&
        user.role !== "ADMIN" &&
        user.role !== "COO" &&
        user.role !== "VENTURE_HEAD" &&
        user.role !== "FINANCE"
      ) {
        return res.status(403).json({ error: "Forbidden", detail: "Insufficient permissions to delete incentive scenario" });
      }

      const existing = await loadScenario();
      if (existing === "FORBIDDEN") {
        return res.status(403).json({ error: "FORBIDDEN_VENTURE" });
      }
      if (!existing) {
        return res.status(404).json({ error: "NOT_FOUND" });
      }

      const isOwner = existing.createdByUserId === user.id;
      const canDelete = isGlobalAdmin(user) || (isOwner && scope.ventureIds.includes(existing.ventureId));
      if (!canDelete) {
        return res.status(403).json({ error: "FORBIDDEN" });
      }

      await prisma.incentiveScenario.delete({ where: { id } });

      await logAuditEvent(req, user, {
        domain: "admin",
        action: "INCENTIVE_SCENARIO_DELETE",
        entityType: "INCENTIVE_SCENARIO",
        entityId: id,
        metadata: { before: existing },
      });

      return res.status(200).json({ success: true });
    } catch (err: any) {
      console.error("Incentive scenario delete error", err);
      return res
        .status(500)
        .json({ error: "Internal server error", detail: err.message || String(err) });
    }
  }

  res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
  return res.status(405).json({ error: "Method not allowed" });
});
