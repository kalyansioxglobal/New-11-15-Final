import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { requireAdminPanelUser } from "@/lib/apiAuth";

type AgentKpiRow = {
  agentId: number;
  agentName: string;
  campaignId: number | null;
  campaignName?: string | null;
  totalCalls: number;
  totalTalkTimeSec: number;
  totalAppointments: number;
  totalSales: number;
  avgTalkTimeSec: number;
  callsPerDay: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireAdminPanelUser(req, res);
  if (!user) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required" });
    }

    const start = new Date(String(startDate));
    const end = new Date(String(endDate));

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res
        .status(400)
        .json({ error: "Invalid date range", detail: "startDate and endDate must be valid ISO dates" });
    }

    const diffMs = end.getTime() - start.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24) + 1;
    const MAX_WINDOW_DAYS = 90;
    if (diffDays > MAX_WINDOW_DAYS) {
      return res.status(400).json({
        error: "Date range too large",
        detail: `Maximum allowed range is ${MAX_WINDOW_DAYS} days`,
      });
    }

    const rows = await prisma.bpoAgentMetric.findMany({
      where: {
        date: { gte: start, lte: end },
      },
      select: {
        userId: true,
        agentName: true,
        campaignId: true,
        date: true,
        handledCalls: true,
        outboundCalls: true,
        talkTimeMin: true,
        demosBooked: true,
        salesClosed: true,
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
        campaign: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const keyMap = new Map<string, {
      agentId: number;
      agentName: string;
      campaignId: number | null;
      campaignName: string | null;
      totalCalls: number;
      totalTalkTimeSec: number;
      totalAppointments: number;
      totalSales: number;
      daysSeen: Set<string>;
    }>();

    for (const r of rows) {
      const agentId = r.userId ?? 0;
      const agentName = r.user?.fullName ?? r.agentName ?? `Agent ${agentId}`;
      const campaignId = r.campaignId ?? null;
      const campaignName = r.campaign?.name ?? null;

      const key = `${agentId}-${campaignId ?? "none"}`;
      let agg = keyMap.get(key);
      if (!agg) {
        agg = {
          agentId,
          agentName,
          campaignId,
          campaignName,
          totalCalls: 0,
          totalTalkTimeSec: 0,
          totalAppointments: 0,
          totalSales: 0,
          daysSeen: new Set<string>(),
        };
        keyMap.set(key, agg);
      }

      const calls = (r.handledCalls ?? 0) + (r.outboundCalls ?? 0);
      const talkTimeSec = (r.talkTimeMin ?? 0) * 60;

      agg.totalCalls += calls;
      agg.totalTalkTimeSec += talkTimeSec;
      agg.totalAppointments += r.demosBooked ?? 0;
      agg.totalSales += r.salesClosed ?? 0;
      agg.daysSeen.add(r.date.toISOString().slice(0, 10));
    }

    const result: AgentKpiRow[] = [];

    for (const agg of keyMap.values()) {
      const daysCount = agg.daysSeen.size || 1;
      const avgTalkTimeSec = agg.totalCalls > 0 ? agg.totalTalkTimeSec / agg.totalCalls : 0;
      const callsPerDay = agg.totalCalls / daysCount;

      result.push({
        agentId: agg.agentId,
        agentName: agg.agentName,
        campaignId: agg.campaignId,
        campaignName: agg.campaignName,
        totalCalls: agg.totalCalls,
        totalTalkTimeSec: agg.totalTalkTimeSec,
        totalAppointments: agg.totalAppointments,
        totalSales: agg.totalSales,
        avgTalkTimeSec,
        callsPerDay,
      });
    }

    result.sort((a, b) => b.totalCalls - a.totalCalls);

    return res.status(200).json({ items: result });
  } catch (err) {
    console.error("BPO agent KPI error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
