import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { withUser } from "@/lib/api";
import { getUserScope } from "@/lib/scope";
import { computeIncentivesForDayWithRules, type EngineRule } from "@/lib/incentives/engine";

interface CompareRequestBody {
  scenarioIds: number[];
}

export default withUser(async function handler(req: NextApiRequest, res: NextApiResponse, user) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body as CompareRequestBody;
    if (!body || !Array.isArray(body.scenarioIds) || body.scenarioIds.length < 2) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        detail: "scenarioIds must be an array of 2-3 ids",
      });
    }

    const ids = [...new Set(body.scenarioIds.map(Number))].filter((id) => !Number.isNaN(id));
    if (ids.length < 2 || ids.length > 3) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        detail: "You must provide between 2 and 3 unique scenarioIds",
      });
    }

    const scope = getUserScope(user);

    const scenarios = await prisma.incentiveScenario.findMany({
      where: { id: { in: ids } },
      include: {
        venture: { select: { id: true } },
      },
    });

    if (scenarios.length !== ids.length) {
      return res.status(404).json({ error: "NOT_FOUND", detail: "Some scenarios were not found" });
    }

    for (const s of scenarios) {
      if (!scope.allVentures && !scope.ventureIds.includes(s.ventureId)) {
        return res.status(403).json({ error: "FORBIDDEN_VENTURE" });
      }
    }

    // For v1, we will run a short simulation per scenario using the same engine helper used elsewhere.
    // We'll assume each config contains the same shape as /api/incentives/simulate expects.
    const results = [] as any[];

    for (const scenario of scenarios) {
      const cfg = scenario.config as any;
      const ventureId = cfg.ventureId as number;
      const from = cfg.from as string;
      const to = cfg.to as string;
      const userIds = (cfg.userIds as number[]) || [];
      const rules = (cfg.rules as EngineRule[]) || [];

      if (!ventureId || !from || !to || !Array.isArray(rules) || !rules.length) {
        results.push({
          scenarioId: scenario.id,
          name: scenario.name,
          ventureId: scenario.ventureId,
          result: null,
        });
        continue;
      }

      const fromDate = new Date(from);
      const toDate = new Date(to);
      if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
        results.push({
          scenarioId: scenario.id,
          name: scenario.name,
          ventureId: scenario.ventureId,
          result: null,
        });
        continue;
      }

      const days: string[] = [];
      const start = new Date(fromDate.toISOString().slice(0, 10) + "T00:00:00.000Z");
      const end = new Date(toDate.toISOString().slice(0, 10) + "T00:00:00.000Z");
      const diffMs = end.getTime() - start.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24) + 1;

      for (let i = 0; i < diffDays; i++) {
        const d = new Date(start.getTime());
        d.setDate(d.getDate() + i);
        days.push(d.toISOString().slice(0, 10));
      }

      const allItems = await Promise.all(
        days.map((day) =>
          computeIncentivesForDayWithRules({
            ventureId,
            date: day,
            rules,
            restrictToUserIds: userIds.length ? userIds : undefined,
          }),
        ),
      );

      const flat = allItems.flat();
      const totalAmount = flat.reduce((sum, item) => sum + (item.amount ?? 0), 0);

      // Simple per-role or per-user summary could be extended later; for now, focus on total.
      const result = {
        summary: {
          totalAmount,
        },
      };

      results.push({
        scenarioId: scenario.id,
        name: scenario.name,
        ventureId: scenario.ventureId,
        result,
      });
    }

    return res.status(200).json(results);
  } catch (err: any) {
    console.error("Incentive scenarios compare error", err);
    return res
      .status(500)
      .json({ error: "Internal server error", detail: err.message || String(err) });
  }
});
