import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getEffectiveUser } from "@/lib/effectiveUser";
import { logAuditEvent } from "@/lib/audit";
import { IncentiveCalcType } from "@prisma/client";

// Simple CEO/ADMIN guard reused across handlers
function requireIncentivesAdmin(user: any): boolean {
  return user && (user.role === "CEO" || user.role === "ADMIN");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getEffectiveUser(req, res);
  if (!user) {
    return; // getEffectiveUser already handled the response
  }

  if (!requireIncentivesAdmin(user)) {
    return res.status(403).json({ error: "Forbidden", detail: "Insufficient permissions for incentive rules" });
  }

  try {
    if (req.method === "GET") {
      const { planId } = req.query;

      const where: { planId?: number } = {};
      if (planId && typeof planId === "string") {
        const parsed = parseInt(planId, 10);
        if (!Number.isNaN(parsed) && parsed > 0) {
          where.planId = parsed;
        }
      }

      const rules = await prisma.incentiveRule.findMany({
        where,
        orderBy: { id: "asc" },
      });

      return res.status(200).json(rules);
    }

    if (req.method === "POST") {
      const { planId, roleKey, metricKey, calcType, rate, currency, qualificationId, config, isEnabled } = req.body ?? {};

      if (!planId || typeof planId !== "number") {
        return res.status(400).json({ error: "planId is required and must be a number" });
      }
      if (!metricKey || typeof metricKey !== "string") {
        return res.status(400).json({ error: "metricKey is required" });
      }
      if (!calcType || typeof calcType !== "string") {
        return res.status(400).json({ error: "calcType is required" });
      }

      const rule = await prisma.incentiveRule.create({
        data: {
          planId,
          roleKey,
          metricKey,
          calcType: calcType as IncentiveCalcType,
          rate: typeof rate === "number" ? rate : null,
          currency: currency ?? null,
          qualificationId: qualificationId ?? null,
          config: config ?? undefined,
          isEnabled: isEnabled !== undefined ? !!isEnabled : true,
        },
      });

      await logAuditEvent(req, user, {
        domain: "admin",
        action: "INCENTIVE_RULE_CREATE",
        entityType: "incentiveRule",
        entityId: rule.id,
        metadata: { rule },
      });

      return res.status(201).json(rule);
    }

    if (req.method === "PUT") {
      const { id, ...body } = req.body ?? {};
      const ruleId = typeof id === "number" ? id : NaN;
      if (!ruleId || Number.isNaN(ruleId)) {
        return res.status(400).json({ error: "id is required and must be a number" });
      }

      const existing = await prisma.incentiveRule.findUnique({ where: { id: ruleId } });
      if (!existing) {
        return res.status(404).json({ error: "Rule not found" });
      }

      const updated = await prisma.incentiveRule.update({
        where: { id: ruleId },
        data: {
          roleKey: body.roleKey ?? existing.roleKey,
          metricKey: body.metricKey ?? existing.metricKey,
          calcType: body.calcType ?? (existing as any).calcType,
          rate:
            body.rate !== undefined
              ? typeof body.rate === "number"
                ? body.rate
                : null
              : existing.rate,
          currency: body.currency ?? existing.currency,
          qualificationId:
            body.qualificationId !== undefined
              ? body.qualificationId
              : existing.qualificationId,
          config: body.config !== undefined ? body.config : existing.config,
          isEnabled:
            body.isEnabled !== undefined
              ? !!body.isEnabled
              : existing.isEnabled,
        },
      });

      await logAuditEvent(req, user, {
        domain: "admin",
        action: "INCENTIVE_RULE_UPDATE",
        entityType: "incentiveRule",
        entityId: updated.id,
        metadata: {
          before: existing,
          after: updated,
        },
      });

      return res.status(200).json(updated);
    }

    if (req.method === "DELETE" || (req.method === "POST" && req.query.action === "delete")) {
      const idParam = req.method === "DELETE" ? req.query.id : req.body?.id;
      const ruleId = typeof idParam === "string" ? parseInt(idParam, 10) : idParam;

      if (!ruleId || Number.isNaN(ruleId)) {
        return res.status(400).json({ error: "id is required" });
      }

      const existing = await prisma.incentiveRule.findUnique({ where: { id: ruleId } });
      if (!existing) {
        return res.status(404).json({ error: "Rule not found" });
      }

      const deactivated = await prisma.incentiveRule.update({
        where: { id: ruleId },
        data: { isEnabled: false },
      });

      await logAuditEvent(req, user, {
        domain: "admin",
        action: "INCENTIVE_RULE_DELETE",
        entityType: "incentiveRule",
        entityId: deactivated.id,
        metadata: {
          before: existing,
          after: deactivated,
        },
      });

      return res.status(200).json(deactivated);
    }

    res.setHeader("Allow", "GET, POST, PUT, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error: any) {
    console.error("Incentive rules API error", error);
    return res.status(500).json({ error: "Failed to process incentive rules", detail: error.message });
  }
}
