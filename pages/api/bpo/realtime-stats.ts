import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '@/lib/scope';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const scope = getUserScope(user);
    const ventureId = req.query.ventureId ? Number(req.query.ventureId) : undefined;
    const campaignId = req.query.campaignId ? Number(req.query.campaignId) : undefined;

    if (!ventureId) {
      return res.status(400).json({ error: 'ventureId is required' });
    }

    if (!scope.allVentures && !scope.ventureIds.includes(ventureId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const campaigns = await prisma.bpoCampaign.findMany({
      where: { 
        ventureId, 
        isActive: true,
        ...(campaignId ? { id: campaignId } : {})
      },
      select: { id: true, name: true, clientName: true },
    });

    const campaignIds = campaigns.map((c: any) => c.id);

    const agents = await prisma.bpoAgent.findMany({
      where: {
        ventureId,
        isActive: true,
        campaignId: { in: campaignIds },
      },
      include: {
        user: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
        campaign: {
          select: { id: true, name: true },
        },
      },
    });

    const todayCallLogs = await prisma.bpoCallLog.findMany({
      where: {
        ventureId,
        campaignId: { in: campaignIds },
        callStartedAt: { gte: todayStart },
      },
    });

    const todayMetrics = await prisma.bpoDailyMetric.findMany({
      where: {
        campaignId: { in: campaignIds },
        date: { gte: todayStart },
      },
    });

    const todayAgentMetrics = await prisma.bpoAgentMetric.findMany({
      where: {
        campaignId: { in: campaignIds },
        date: { gte: todayStart },
      },
    });

    type AgentStats = {
      id: number;
      name: string;
      avatarUrl: string | null;
      campaignName: string;
      status: 'online' | 'busy' | 'idle' | 'offline';
      callsToday: number;
      connectedCalls: number;
      talkTimeMin: number;
      leadsToday: number;
      demosToday: number;
      salesToday: number;
      lastCallAt: Date | null;
      connectionRate: number;
    };

    const agentStatsMap = new Map<number, AgentStats>();

    for (const agent of agents) {
      agentStatsMap.set(agent.id, {
        id: agent.id,
        name: agent.user?.fullName || `Agent #${agent.id}`,
        avatarUrl: agent.user?.avatarUrl || null,
        campaignName: agent.campaign?.name || 'Unassigned',
        status: 'offline',
        callsToday: 0,
        connectedCalls: 0,
        talkTimeMin: 0,
        leadsToday: 0,
        demosToday: 0,
        salesToday: 0,
        lastCallAt: null,
        connectionRate: 0,
      });
    }

    for (const call of todayCallLogs) {
      const stats = agentStatsMap.get(call.agentId);
      if (stats) {
        stats.callsToday += 1;
        if (call.isConnected) stats.connectedCalls += 1;
        if (call.appointmentSet) stats.leadsToday += 1;
        if (call.dealWon) stats.salesToday += 1;
        
        if (call.callStartedAt && call.callEndedAt) {
          const durationMs = call.callEndedAt.getTime() - call.callStartedAt.getTime();
          stats.talkTimeMin += durationMs / 60000;
        }
        
        if (!stats.lastCallAt || call.callStartedAt > stats.lastCallAt) {
          stats.lastCallAt = call.callStartedAt;
        }
      }
    }

    for (const metric of todayAgentMetrics) {
      if (metric.userId) {
        const agent = agents.find((a: any) => a.user?.id === metric.userId);
        if (agent) {
          const stats = agentStatsMap.get(agent.id);
          if (stats) {
            stats.demosToday += metric.demosBooked || 0;
          }
        }
      }
    }

    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

    for (const stats of agentStatsMap.values()) {
      if (stats.callsToday > 0) stats.connectionRate = stats.connectedCalls / stats.callsToday;
      
      if (stats.lastCallAt) {
        const isInCall = todayCallLogs.some(
          (c: any) => c.agentId === stats.id && c.callStartedAt && !c.callEndedAt,
        );
        
        if (isInCall) {
          stats.status = 'busy';
        } else if (stats.lastCallAt > fiveMinutesAgo) {
          stats.status = 'online';
        } else if (stats.lastCallAt > fifteenMinutesAgo) {
          stats.status = 'idle';
        } else {
          stats.status = 'offline';
        }
      }
    }

    const agentStats = Array.from(agentStatsMap.values()).sort((a, b) => {
      const statusOrder = { busy: 0, online: 1, idle: 2, offline: 3 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return b.callsToday - a.callsToday;
    });

    const campaignStats = campaigns.map((camp: any) => {
      const campCalls = todayCallLogs.filter((c: any) => c.campaignId === camp.id);
      const campMetric = todayMetrics.find((m: any) => m.campaignId === camp.id);
      
      const totalCalls = campCalls.length;
      const connectedCalls = campCalls.filter((c: any) => c.isConnected).length;
      const leads = campCalls.filter((c: any) => c.appointmentSet).length;
      const sales = campCalls.filter((c: any) => c.dealWon).length;
      
      return {
        id: camp.id,
        name: camp.name,
        clientName: camp.clientName,
        totalCalls,
        connectedCalls,
        connectionRate: totalCalls > 0 ? connectedCalls / totalCalls : 0,
        leads,
        demos: campMetric?.demosBooked || 0,
        sales,
        revenue: campMetric?.revenue || 0,
        activeAgents: agentStats.filter(
          a => a.campaignName === camp.name && a.status !== 'offline'
        ).length,
      };
    });

    const summary = {
      totalAgents: agents.length,
      onlineAgents: agentStats.filter(a => a.status === 'online' || a.status === 'busy').length,
      busyAgents: agentStats.filter(a => a.status === 'busy').length,
      idleAgents: agentStats.filter(a => a.status === 'idle').length,
      offlineAgents: agentStats.filter((a: any) => a.status === 'offline').length,
      totalCallsToday: todayCallLogs.length,
      connectedCallsToday: todayCallLogs.filter((c: any) => c.isConnected).length,
      leadsToday: todayCallLogs.filter((c: any) => c.appointmentSet).length,
      salesToday: todayCallLogs.filter((c: any) => c.dealWon).length,
      totalRevenue: todayMetrics.reduce((sum: number, m: any) => sum + (m.revenue || 0), 0),
    };

    return res.json({
      timestamp: now.toISOString(),
      summary,
      agents: agentStats,
      campaigns: campaignStats,
    });
  } catch (err) {
    console.error('BPO realtime stats error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
