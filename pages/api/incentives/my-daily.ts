import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getEffectiveUser } from "@/lib/effectiveUser";

function parseDateParam(value: string | string[] | undefined): Date | null {
  if (!value || Array.isArray(value)) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await getEffectiveUser(req, res);
  if (!user) return;

  try {
    const now = new Date();
    const rawFrom = req.query.from as string | undefined;
    const rawTo = req.query.to as string | undefined;

    let from = parseDateParam(rawFrom);
    let to = parseDateParam(rawTo);

    if (!from || !to) {
      // Default to last 30 days
      to = new Date(now);
      const fromDate = new Date(now);
      fromDate.setDate(fromDate.getDate() - 29);
      from = fromDate;
    }

    if (!from || !to) {
      return res.status(400).json({ error: "Invalid date range" });
    }

    // Normalize to start/end of day in UTC
    const fromDay = new Date(from.toISOString().slice(0, 10) + "T00:00:00.000Z");
    const toDay = new Date(to.toISOString().slice(0, 10) + "T23:59:59.999Z");

    const diffMs = toDay.getTime() - fromDay.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24) + 1;
    const MAX_DAYS = 90;
    if (diffDays > MAX_DAYS) {
      return res.status(400).json({
        error: "Date range too large",
        detail: `Maximum allowed range is ${MAX_DAYS} days for incentives history`,
      });
    }

    const rows = await prisma.incentiveDaily.findMany({
      where: {
        userId: user.id,
        date: { gte: fromDay, lte: toDay },
      },
      orderBy: { date: "desc" },
      include: {
        venture: {
          select: { id: true, name: true },
        },
      },
    });

    type MyIncentiveDaily = {
      date: string;
      ventureId: number;
      ventureName: string | null;
      amount: number;
      currency: string;
      breakdown: {
        rules: { ruleId: number; amount: number }[];
      } | null;
    };

    const items: MyIncentiveDaily[] = rows.map((r: (typeof rows)[number]) => {
      const day = r.date.toISOString().slice(0, 10);
      const breakdown = (r.breakdown as any) ?? null;
      return {
        date: day,
        ventureId: r.ventureId,
        ventureName: r.venture?.name ?? null,
        amount: r.amount ?? 0,
        currency: r.currency ?? "USD",
        breakdown: breakdown && Array.isArray(breakdown.rules)
          ? { rules: breakdown.rules as { ruleId: number; amount: number }[] }
          : null,
      };
    });

    const totalAmount = items.reduce(
      (sum: number, i: MyIncentiveDaily) => sum + (i.amount ?? 0),
      0,
    );

    return res.status(200).json({
      items,
      totalAmount,
      from: fromDay.toISOString().slice(0, 10),
      to: toDay.toISOString().slice(0, 10),
    });
  } catch (error: any) {
    console.error("My daily incentives fetch failed", error);
    return res.status(500).json({
      error: "Failed to fetch incentives",
      detail: error.message,
    });
  }
}
