import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getEffectiveUser } from "@/lib/effectiveUser";
import { getUserScope } from "@/lib/scope";
import { computeIncentivesForDayWithRules, type EngineRule } from "@/lib/incentives/engine";

// Lightweight representation of a custom rule coming from the client.
interface CustomRuleInput {
  id: string;
  label?: string | null;
  metricKey: string;
  calcType: "PERCENT_OF_METRIC" | "FLAT_PER_UNIT" | "CURRENCY_PER_DOLLAR" | "BONUS_ON_TARGET";
  rate?: number | null;
  config?: {
    metricKey?: string;
    thresholdValue?: number;
    targetValue?: number;
    bonusAmount?: number;
  } | null;
}

interface SimulateRequestBody {
  mode: "current_plan" | "custom_rules" | "compare_current_vs_custom";
  ventureId: number;
  userIds?: number[];
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  maxDays?: number;
  customPlan?: {
    name?: string | null;
    description?: string | null;
    currency?: string | null;
    rules: CustomRuleInput[];
  };
}

function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function mapCustomRulesToEngineRules(rules: CustomRuleInput[]): EngineRule[] {
  const allowed = [
    "PERCENT_OF_METRIC",
    "FLAT_PER_UNIT",
    "CURRENCY_PER_DOLLAR",
    "BONUS_ON_TARGET",
  ];

  return rules.map((r, idx) => {
    if (!allowed.includes(r.calcType)) {
      throw new Error(`Unsupported calcType for simulation: ${r.calcType}`);
    }

    return {
      id: idx + 1, // local numeric id used only inside simulation
      metricKey: r.metricKey,
      calcType: r.calcType,
      rate: r.rate ?? null,
      config: r.config ?? null,
    };
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await getEffectiveUser(req, res);
  if (!user) return;

  // Restrict simulator to senior roles only (same guarding spirit as /api/incentives/run)
  if (user.role !== "CEO" && user.role !== "ADMIN") {
    return res
      .status(403)
      .json({ error: "Forbidden", detail: "Insufficient permissions for simulation" });
  }

  try {
    const body = req.body as SimulateRequestBody;
    const { mode, ventureId, userIds, from, to, maxDays, customPlan } = body;

    if (!mode || !["current_plan", "custom_rules", "compare_current_vs_custom"].includes(mode)) {
      return res.status(400).json({ error: "Invalid mode" });
    }

    if (!ventureId || typeof ventureId !== "number" || ventureId <= 0) {
      return res.status(400).json({ error: "ventureId is required and must be a positive number" });
    }

    const fromDate = parseDate(from);
    const toDate = parseDate(to);

    if (!fromDate || !toDate) {
      return res.status(400).json({ error: "Invalid from/to dates" });
    }

    const fromDay = new Date(fromDate.toISOString().slice(0, 10) + "T00:00:00.000Z");
    const toDay = new Date(toDate.toISOString().slice(0, 10) + "T23:59:59.999Z");

    const diffMs = toDay.getTime() - fromDay.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24) + 1;
    const MAX_DAYS = typeof maxDays === "number" && maxDays > 0 ? Math.min(maxDays, 90) : 90;
    if (diffDays > MAX_DAYS) {
      return res.status(400).json({
        error: "Date range too large",
        detail: `Maximum allowed range is ${MAX_DAYS} days for simulation`,
      });
    }

    // RBAC / scope
    const scope = getUserScope(user);
    const isGlobal = scope.allVentures || user.role === "CEO" || user.role === "ADMIN";
    if (!isGlobal && !scope.ventureIds.includes(ventureId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const needsCustomRules = mode === "custom_rules" || mode === "compare_current_vs_custom";
    if (needsCustomRules) {
      if (!customPlan || !Array.isArray(customPlan.rules) || !customPlan.rules.length) {
        return res.status(400).json({ error: "customPlan.rules is required for this mode" });
      }
    }

    // Resolve users in scope for this venture
    const usersInVenture = await prisma.user.findMany({
      where: {
        ventures: { some: { ventureId } },
      },
      select: { id: true, fullName: true },
    });

    const allowedUserIds = new Set<number>(
      usersInVenture.map((u: (typeof usersInVenture)[number]) => u.id),
    );

    let targetUserIds: number[];
    if (userIds && userIds.length) {
      const invalid = userIds.filter((id) => !allowedUserIds.has(id));
      if (invalid.length > 0) {
        return res.status(403).json({
          error: "Forbidden",
          detail: `Some userIds are not part of venture ${ventureId} or not visible in your scope`,
        });
      }
      targetUserIds = [...new Set(userIds)];
    } else {
      targetUserIds = [...allowedUserIds];
    }

    const days: string[] = [];
    for (let d = 0; d < diffDays; d++) {
      const dt = new Date(fromDay.getTime());
      dt.setDate(dt.getDate() + d);
      days.push(dt.toISOString().slice(0, 10));
    }

    // Helper to compute with current plan rules from DB
    async function computeWithCurrentPlan(): Promise<any> {
      const rulesFromDb = await prisma.incentiveRule.findMany({
        where: { planId: ventureId, isEnabled: true },
      });
      if (!rulesFromDb.length) {
        return buildSimulationView({
          ventureId,
          fromDay,
          toDay,
          items: [],
          userLabels: usersInVenture,
          planLabel: "Current plan",
        });
      }

      const allItems = await Promise.all(
        days.map((day) =>
          computeIncentivesForDayWithRules({
            ventureId,
            date: day,
            rules: rulesFromDb,
            restrictToUserIds: targetUserIds,
          }),
        ),
      );

      const flat = allItems.flat();

      return buildSimulationView({
        ventureId,
        fromDay,
        toDay,
        items: flat,
        userLabels: usersInVenture,
        planLabel: "Current plan",
      });
    }

    // Helper to compute with custom rules supplied by the client
    async function computeWithCustomRules(): Promise<any> {
      if (!customPlan) {
        return buildSimulationView({
          ventureId,
          fromDay,
          toDay,
          items: [],
          userLabels: usersInVenture,
          planLabel: "Custom simulation",
        });
      }

      let engineRules: EngineRule[];
      try {
        engineRules = mapCustomRulesToEngineRules(customPlan.rules);
      } catch (e: any) {
        return res.status(400).json({
          error: "Unsupported calcType for simulation",
          detail: e.message,
        });
      }

      const allItems = await Promise.all(
        days.map((day) =>
          computeIncentivesForDayWithRules({
            ventureId,
            date: day,
            rules: engineRules,
            restrictToUserIds: targetUserIds,
          }),
        ),
      );

      const flat = allItems.flat();

      return buildSimulationView({
        ventureId,
        fromDay,
        toDay,
        items: flat,
        userLabels: usersInVenture,
        planLabel: customPlan.name || "Custom simulation",
      });
    }

    const baseline =
      mode === "current_plan" || mode === "compare_current_vs_custom"
        ? await computeWithCurrentPlan()
        : null;

    const simulated =
      mode === "custom_rules" || mode === "compare_current_vs_custom"
        ? await computeWithCustomRules()
        : null;

    if (mode === "current_plan") {
      return res.status(200).json({
        ventureId,
        from: fromDay.toISOString().slice(0, 10),
        to: toDay.toISOString().slice(0, 10),
        mode,
        planLabel: baseline?.planLabel ?? "Current plan",
        ...baseline,
      });
    }

    if (mode === "custom_rules") {
      return res.status(200).json({
        ventureId,
        from: fromDay.toISOString().slice(0, 10),
        to: toDay.toISOString().slice(0, 10),
        mode,
        planLabel: simulated?.planLabel ?? customPlan?.name ?? "Custom simulation",
        ...simulated,
      });
    }

    // compare_current_vs_custom
    const diff = buildDiff(baseline, simulated);

    return res.status(200).json({
      ventureId,
      from: fromDay.toISOString().slice(0, 10),
      to: toDay.toISOString().slice(0, 10),
      mode,
      baselinePlanLabel: baseline?.planLabel ?? "Current plan",
      simulatedPlanLabel: simulated?.planLabel ?? customPlan?.name ?? "Custom simulation",
      baseline,
      simulated,
      diff,
    });
  } catch (err: any) {
    console.error("Incentive simulation failed", err);
    return res.status(500).json({ error: "Internal server error", detail: err.message || String(err) });
  }
}

function buildSimulationView(params: {
  ventureId: number;
  fromDay: Date;
  toDay: Date;
  items: { userId: number; amount: number; date: string; ruleId: number; planId: number }[];
  userLabels: { id: number; fullName: string | null }[];
  planLabel: string;
}) {
  const { fromDay, toDay, items, userLabels, planLabel } = params;

  const userMap = new Map<number, { id: number; fullName: string | null }>();
  for (const u of userLabels) {
    userMap.set(u.id, u);
  }

  const byUser = new Map<
    number,
    {
      userId: number;
      userName: string;
      totalAmount: number;
      daysWithIncentives: number;
      daily: {
        date: string;
        amount: number;
      }[];
      dates: Set<string>;
    }
  >();

  for (const item of items) {
    const existing =
      byUser.get(item.userId) ||
      ((): any => {
        const u = userMap.get(item.userId);
        const base = {
          userId: item.userId,
          userName: u?.fullName || `User #${item.userId}`,
          totalAmount: 0,
          daysWithIncentives: 0,
          daily: [] as { date: string; amount: number }[],
          dates: new Set<string>(),
        };
        byUser.set(item.userId, base);
        return base;
      })();

    existing.totalAmount += item.amount;
    existing.daily.push({ date: item.date, amount: item.amount });
    if (item.amount > 0) {
      existing.dates.add(item.date);
    }
  }

  const perUser = Array.from(byUser.values()).map((u) => ({
    userId: u.userId,
    userName: u.userName,
    totalAmount: u.totalAmount,
    daysWithIncentives: u.dates.size,
    avgPerDay: u.daily.length ? u.totalAmount / u.daily.length : 0,
    daily: u.daily,
  }));

  const totalAmount = perUser.reduce((sum, u) => sum + u.totalAmount, 0);
  const totalUsers = perUser.length;
  const totalDays =
    Math.round((toDay.getTime() - fromDay.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return {
    planLabel,
    summary: {
      totalAmount,
      totalUsers,
      totalDays,
    },
    perUser,
  };
}

function buildDiff(baseline: any, simulated: any) {
  if (!baseline || !simulated) return null;

  const baselineTotal = baseline.summary?.totalAmount ?? 0;
  const simulatedTotal = simulated.summary?.totalAmount ?? 0;

  const totalAmountDelta = simulatedTotal - baselineTotal;
  const totalAmountDeltaPct = baselineTotal
    ? (totalAmountDelta / baselineTotal) * 100
    : simulatedTotal
    ? 100
    : 0;

  const baselineByUser = new Map<number, any>();
  for (const u of baseline.perUser || []) {
    baselineByUser.set(u.userId, u);
  }

  const perUserDiff: any[] = [];
  for (const su of simulated.perUser || []) {
    const bu = baselineByUser.get(su.userId);
    const baselineAmount = bu?.totalAmount ?? 0;
    const simulatedAmount = su.totalAmount ?? 0;
    const delta = simulatedAmount - baselineAmount;
    const deltaPct = baselineAmount ? (delta / baselineAmount) * 100 : simulatedAmount ? 100 : 0;

    perUserDiff.push({
      userId: su.userId,
      userName: su.userName,
      baselineAmount,
      simulatedAmount,
      delta,
      deltaPct,
    });
  }

  return {
    summary: {
      totalAmountDelta,
      totalAmountDeltaPct,
    },
    perUser: perUserDiff,
  };
}
