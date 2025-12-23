import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { getEffectiveUser } from "@/lib/effectiveUser";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getEffectiveUser(req, res);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // RBAC: only leadership-level roles may read or write incentive plans for a venture.

  // Only leadership-level roles can view or modify incentive plans
  if (user.role !== "CEO" && user.role !== "ADMIN" && user.role !== "COO" && user.role !== "VENTURE_HEAD" && user.role !== "FINANCE") {
    return res.status(403).json({ error: "Forbidden", detail: "Insufficient permissions for incentive plans" });
  }

  const ventureId = parseInt(req.query.ventureId as string, 10);
  if (!ventureId || Number.isNaN(ventureId)) {
    return res.status(400).json({ error: "Missing or invalid ventureId" });
  }

  if (req.method === "GET") {
    try {
      const plan = await prisma.incentivePlan.findFirst({
        where: {
          ventureId,
          isActive: true,
        },
        include: {
          rules: {
            include: {
              qualification: true,
            },
          },
        },
        orderBy: { effectiveFrom: "desc" },
      });

      if (!plan) {
        return res.status(200).json(null);
      }

      return res.status(200).json(plan);
    } catch (error) {
      console.error("Error loading incentive plan", error);
      return res.status(500).json({ error: "Failed to load incentive plan" });
    }
  }

  if (req.method === "PUT") {
    try {
      const body = req.body;

      const {
        id,
        name,
        isActive,
        effectiveFrom,
        effectiveTo,
        rules = [],
      } = body;

      const plan = await prisma.incentivePlan.upsert({
        where: { id: id ?? 0 },
        update: {
          name,
          isActive,
          effectiveFrom: new Date(effectiveFrom),
          effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        },
        create: {
          ventureId,
          name,
          isActive: isActive ?? true,
          effectiveFrom: new Date(effectiveFrom),
          effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        },
      });

      for (const rule of rules) {
        const ruleId = rule.id as number | undefined;

        await prisma.incentiveRule.upsert({
          where: {
            id: ruleId ?? 0,
          },
          update: {
            roleKey: rule.roleKey,
            metricKey: rule.metricKey,
            calcType: rule.calcType,
            rate: rule.rate,
            currency: rule.currency,
            isEnabled: rule.isEnabled,
            qualificationId: rule.qualificationId ?? null,
            config: rule.config ?? undefined,
          },
          create: {
            planId: plan.id,
            roleKey: rule.roleKey,
            metricKey: rule.metricKey,
            calcType: rule.calcType,
            rate: rule.rate,
            currency: rule.currency,
            isEnabled: rule.isEnabled ?? true,
            qualificationId: rule.qualificationId ?? null,
            config: rule.config ?? undefined,
          },
        });
      }

      const updatedPlan = await prisma.incentivePlan.findUnique({
        where: { id: plan.id },
        include: { rules: true },
      });

      return res.status(200).json(updatedPlan);
    } catch (error) {
      console.error("Error saving incentive plan", error);
      return res.status(500).json({ error: "Failed to save incentive plan" });
    }
  }

  res.setHeader("Allow", ["GET", "PUT"]);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
