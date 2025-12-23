import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { requireUser } from '@/lib/apiAuth';
import { applyLoadScope } from "@/lib/scopeLoads";
import { openai, isOpenAIConfigured } from "../../../lib/openai";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end();

  const user = await requireUser(req, res);
  if (!user) return;

  const { from, to, filterShipper, filterRep, filterLane } = req.body ?? {};

  if (!from || !to) {
    return res
      .status(400)
      .json({ error: "Missing 'from' and 'to' date range" });
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);
  toDate.setHours(23, 59, 59, 999);

  const baseWhere: any = {
    loadStatus: "LOST",
    lostAt: {
      gte: fromDate,
      lte: toDate,
    },
  };

  if (filterShipper) {
    baseWhere.OR = [
      { shipper: { is: { name: filterShipper } } },
      { shipperName: filterShipper },
    ];
  }

  if (filterRep) {
    baseWhere.createdBy = { is: { fullName: filterRep } };
  }

  if (filterLane) {
    const [origin, dest] = filterLane.split(" → ");
    if (origin && dest) {
      baseWhere.AND = [
        {
          OR: [
            { pickupState: origin.trim() },
            { pickupCity: origin.trim() },
          ],
        },
        {
          OR: [
            { dropState: dest.trim() },
            { dropCity: dest.trim() },
          ],
        },
      ];
    }
  }

  const where = applyLoadScope(user, baseWhere);

  const lostLoads = await prisma.load.findMany({
    where,
    include: {
      shipper: { select: { id: true, name: true } },
      lostReasonRef: { select: { id: true, name: true, category: true } },
      createdBy: { select: { id: true, fullName: true } },
    },
    take: 500,
  });

  const filtered = lostLoads;

  if (!filtered.length) {
    return res.json({
      summary:
        "No lost loads found for this date range and filter selection, so there is nothing to analyze.",
    });
  }

  const byShipper = new Map<string, number>();
  const byRep = new Map<string, number>();
  const byLane = new Map<string, number>();
  const byReason = new Map<string, number>();

  for (const load of filtered) {
    const shipperName = load.shipper?.name || load.shipperName || "Unknown Shipper";
    byShipper.set(shipperName, (byShipper.get(shipperName) || 0) + 1);

    const repName = load.createdBy?.fullName || "Unassigned / Unknown";
    byRep.set(repName, (byRep.get(repName) || 0) + 1);

    const origin = (load.pickupState || load.pickupCity || "?").toString().trim();
    const dest = (load.dropState || load.dropCity || "?").toString().trim();
    const laneKey = `${origin} → ${dest}`;
    byLane.set(laneKey, (byLane.get(laneKey) || 0) + 1);

    const reason = load.lostReasonRef?.name || load.lostReason || "Unspecified";
    byReason.set(reason, (byReason.get(reason) || 0) + 1);
  }

  const totalLost = filtered.length;

  const topList = (map: Map<string, number>, limit: number) =>
    Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

  const summaryData = {
    totalLost,
    dateRange: { from, to },
    filters: {
      shipper: filterShipper || null,
      rep: filterRep || null,
      lane: filterLane || null,
    },
    byShipper: topList(byShipper, 10),
    byRep: topList(byRep, 10),
    byLane: topList(byLane, 10),
    byReason: topList(byReason, 10),
  };

  const systemPrompt = `
You are a freight operations and pricing analyst reviewing why a broker is losing truckload opportunities.

You will receive:
- A date range
- Optional filters (shipper, rep, lane)
- Aggregated statistics on lost loads:
  - Lost loads by shipper
  - Lost loads by rep
  - Lost loads by lane (state-to-state)
  - Lost loads by loss reason

Your job:
- Explain in plain English what the pattern seems to be
- Give 3–5 concrete, practical recommendations the brokerage can act on
- Focus on operational behaviors (response time, follow-up), pricing posture, coverage strategy, carrier relationships
- Keep the tone calm, analytical, not emotional
- Do NOT mention AI or models
- Do NOT assume data that is not in the stats
- Keep the analysis under 400–500 words.
`.trim();

  const userPrompt = `
Here is the aggregated lost load data (JSON):

${JSON.stringify(summaryData, null, 2)}

Please:
1) Summarize what this says about why loads are being lost in this time window.
2) Highlight any standout shippers, reps, lanes, or reasons.
3) Give concrete action items to reduce lost loads in this slice of the business.
`.trim();

  try {
    if (!isOpenAIConfigured()) {
      return res.json({
        summary: buildFallbackSummary(summaryData),
      });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 600,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("Empty AI response");
    }

    return res.json({ summary: content });
  } catch (err: any) {
    const errorMessage = err?.message || "Unknown error";
    const isTimeout = errorMessage.includes("timeout") || errorMessage.includes("ETIMEDOUT");
    const isRateLimit = err?.status === 429;

    console.error("Lost postmortem AI error:", {
      message: errorMessage,
      isTimeout,
      isRateLimit,
    });

    return res.json({
      summary: buildFallbackSummary(summaryData),
    });
  }
}

function buildFallbackSummary(data: any): string {
  const { totalLost, dateRange, filters, byShipper, byLane, byReason } = data;

  let summary = `**Lost Load Analysis**\n\n`;
  summary += `**Period:** ${dateRange.from} to ${dateRange.to}\n`;
  summary += `**Total Lost Loads:** ${totalLost}\n\n`;

  if (filters.shipper || filters.rep || filters.lane) {
    summary += `**Active Filters:**\n`;
    if (filters.shipper) summary += `- Shipper: ${filters.shipper}\n`;
    if (filters.rep) summary += `- Rep: ${filters.rep}\n`;
    if (filters.lane) summary += `- Lane: ${filters.lane}\n`;
    summary += `\n`;
  }

  if (byReason.length > 0) {
    summary += `**Top Loss Reasons:**\n`;
    byReason.slice(0, 5).forEach((r: any) => {
      summary += `- ${r.name}: ${r.count} (${((r.count / totalLost) * 100).toFixed(0)}%)\n`;
    });
    summary += `\n`;
  }

  if (byShipper.length > 0) {
    summary += `**Top Shippers Affected:**\n`;
    byShipper.slice(0, 3).forEach((s: any) => {
      summary += `- ${s.name}: ${s.count} loads\n`;
    });
    summary += `\n`;
  }

  if (byLane.length > 0) {
    summary += `**Most Affected Lanes:**\n`;
    byLane.slice(0, 3).forEach((l: any) => {
      summary += `- ${l.name}: ${l.count} loads\n`;
    });
    summary += `\n`;
  }

  summary += `**Recommendations:**\n`;
  summary += `1. Review pricing strategy for high-loss shippers\n`;
  summary += `2. Improve carrier coverage on frequently lost lanes\n`;
  summary += `3. Analyze response times and follow-up cadence\n`;

  return summary;
}
