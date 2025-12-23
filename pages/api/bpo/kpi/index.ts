// pages/api/bpo/kpi/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { withUser, parseDateRange } from "@/lib/api";
import { getUserScope } from "@/lib/scope";
import { canViewPortfolioResource } from "@/lib/permissions";
import { withRequestLogging } from "@/lib/requestLog";
import { getTeamAttendanceContext, TeamAttendanceContext } from "@/lib/attendanceKpi";


type AgentKpi = {
  agentId: number;
  agentName: string;
  campaignName: string | null;
  totalDials: number;
  totalConnects: number;
  totalTalkSeconds: number;
  totalAppointments: number;
  totalDeals: number;
  totalRevenue: number;
};

type KpiResponse = {
  from: string;
  to: string;
  agents: AgentKpi[];
  totals: {
    totalDials: number;
    totalConnects: number;
    totalTalkSeconds: number;
    totalAppointments: number;
    totalDeals: number;
    totalRevenue: number;
  };
  attendance: TeamAttendanceContext | null;
};

function parseDateOrDefault(value: string | string[] | undefined, fallback: Date): Date {
  if (!value || Array.isArray(value)) return fallback;
  const d = new Date(value);
  if (isNaN(d.getTime())) return fallback;
  return d;
}

export default withUser(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  user
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!canViewPortfolioResource(user, "BPO_DASHBOARD_VIEW")) {
    return res.status(403).json({ error: "Forbidden", detail: "Insufficient permissions for BPO KPI" });
  }

  try {
    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setDate(defaultFrom.getDate() - 7); // last 7 days

    const from = parseDateOrDefault(req.query.from, defaultFrom);
    const to = parseDateOrDefault(req.query.to, now);

    const ventureId = req.query.ventureId ? Number(req.query.ventureId) : undefined;
    const officeId = req.query.officeId ? Number(req.query.officeId) : undefined;
    const campaignId = req.query.campaignId ? Number(req.query.campaignId) : undefined;
    const agentId = req.query.agentId ? Number(req.query.agentId) : undefined;

    const where: any = {
      callStartedAt: {
        gte: from,
        lte: to,
      },
    };

    const scope = getUserScope(user);

    if (ventureId) {
      if (!scope.allVentures && !scope.ventureIds.includes(ventureId)) {
        return res.status(403).json({ error: "Forbidden: no access to this venture" });
      }
      where.ventureId = ventureId;
    } else if (!scope.allVentures) {
      where.ventureId = { in: scope.ventureIds };
    }

    if (officeId) where.officeId = officeId;
    if (campaignId) where.campaignId = campaignId;
    if (agentId) where.agentId = agentId;

    const MAX_DAYS = 90;
    const diffMs = to.getTime() - from.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24) + 1;
    if (diffDays > MAX_DAYS) {
      return res.status(400).json({
        error: "Date range too large",
        detail: `Maximum allowed range is ${MAX_DAYS} days for BPO KPIs`,
      });
    }

    // Aggregate by agent using BpoCallLog, similar to /api/bpo/agent-kpi
    const grouped = await prisma.bpoCallLog.groupBy({
      by: ["agentId"],
      where,
      _sum: {
        dialCount: true,
        revenue: true,
      },
      _count: {
        isConnected: true,
        appointmentSet: true,
        dealWon: true,
      },
    });

    const agentIds = grouped
      .map((g: any) => g.agentId ?? 0)
      .filter((id: number) => id > 0);

    const agents = await prisma.bpoAgent.findMany({
      where: {
        userId: { in: agentIds },
      },
      include: {
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

    // For talk time we need per-call duration
    const talkLogs = await prisma.bpoCallLog.findMany({
      where,
      select: {
        agentId: true,
        callStartedAt: true,
        callEndedAt: true,
      },
    });

    const talkSecondsByAgent = new Map<number, number>();
    for (const log of talkLogs) {
      const start = new Date(log.callStartedAt).getTime();
      const end = log.callEndedAt ? new Date(log.callEndedAt).getTime() : start;
      const diffSec = Math.max(0, Math.round((end - start) / 1000));
      const key = log.agentId ?? 0;
      talkSecondsByAgent.set(key, (talkSecondsByAgent.get(key) || 0) + diffSec);
    }

    const agentMap = new Map<number, (typeof agents)[number]>();
    for (const a of agents) {
      agentMap.set(a.userId, a);
    }

    const resultAgents: AgentKpi[] = grouped.map((g: any) => {
      const agent = agentMap.get(g.agentId ?? 0);
      const talkSeconds = talkSecondsByAgent.get(g.agentId ?? 0) || 0;

      return {
        agentId: g.agentId ?? 0,
        agentName: agent?.user?.fullName || `Agent #${g.agentId ?? "unknown"}`,
        campaignName: agent?.campaign?.name || null,
        totalDials: g._sum.dialCount ?? 0,
        totalConnects: g._count.isConnected ?? 0,
        totalTalkSeconds: talkSeconds,
        totalAppointments: g._count.appointmentSet ?? 0,
        totalDeals: g._count.dealWon ?? 0,
        totalRevenue: g._sum.revenue ?? 0,
      };
    });

    const totals = resultAgents.reduce(
      (acc, a) => {
        acc.totalDials += a.totalDials;
        acc.totalConnects += a.totalConnects;
        acc.totalTalkSeconds += a.totalTalkSeconds;
        acc.totalAppointments += a.totalAppointments;
        acc.totalDeals += a.totalDeals;
        acc.totalRevenue += a.totalRevenue;
        return acc;
      },
      {
        totalDials: 0,
        totalConnects: 0,
        totalTalkSeconds: 0,
        totalAppointments: 0,
        totalDeals: 0,
        totalRevenue: 0,
      }
    );

    let attendance: TeamAttendanceContext | null = null;
    const includeAttendance = req.query.includeAttendance === "true";
    
    if (includeAttendance && agentIds.length > 0) {
      attendance = await getTeamAttendanceContext(
        agentIds,
        from,
        to,
        { ventureId: ventureId, isTest: user.isTestUser }
      );
    }

    const response: KpiResponse = {
      from: from.toISOString(),
      to: to.toISOString(),
      agents: resultAgents,
      totals,
      attendance,
    };

    const ctxUser = user ?? null;
    withRequestLogging(req, res, { user: ctxUser, ventureId: ventureId ?? null, officeId: officeId ?? null }, {
      endpoint: "/bpo/kpi",
      page: null,
      pageSize: null,
      dateFrom: from,
      dateTo: to,
    });

    return res.status(200).json(response);
  } catch (error) {
    console.error("BPO KPI fetch error:", error);
    return res.status(500).json({ error: "Failed to fetch BPO KPIs" });
  }
});
