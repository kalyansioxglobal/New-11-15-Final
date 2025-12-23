import type { NextApiRequest, NextApiResponse } from "next";
import { getEffectiveUser } from "@/lib/effectiveUser";
import { logAuditEvent } from "@/lib/audit";
import { calculateIncentivesForDay } from "@/lib/incentives/engine";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await getEffectiveUser(req, res);
  if (!user) return;

  if (user.role !== "CEO" && user.role !== "ADMIN") {
    return res
      .status(403)
      .json({ error: "Forbidden", detail: "Insufficient permissions" });
  }

  try {
    const { planId, date } = req.body as { planId?: number; date?: string };

    if (!planId || typeof planId !== "number" || planId <= 0) {
      return res
        .status(400)
        .json({ error: "planId is required and must be a positive number" });
    }

    const today = new Date();
    const day = date && typeof date === "string" && date.trim()
      ? date.trim()
      : today.toISOString().slice(0, 10);

    const items = await calculateIncentivesForDay(planId, day);

    await logAuditEvent(req, user, {
      domain: "admin",
      action: "INCENTIVE_COMPUTE_RUN",
      entityType: "incentivePlan",
      entityId: String(planId),
      metadata: {
        planId,
        date: day,
        count: items.length,
      },
    });

    return res.status(200).json({ items, count: items.length });
  } catch (error: any) {
    console.error("Incentive compute run failed", error);
    return res
      .status(500)
      .json({ error: "Failed to compute incentives", detail: error.message });
  }
}
