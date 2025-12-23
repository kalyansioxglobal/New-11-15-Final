import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { canViewPortfolioResource } from "@/lib/permissions";

import { getUserScope } from '../../../lib/scope';

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  if (!canViewPortfolioResource(user, "BPO_DASHBOARD_VIEW")) {
    return res.status(403).json({ error: 'Forbidden', detail: 'Insufficient permissions for BPO dashboard' });
  }

  try {
    const scope = getUserScope(user);
    const ventureId = req.query.ventureId ? Number(req.query.ventureId) : undefined;
    const includeTest = req.query.includeTest === 'true';

    if (!ventureId) {
      return res.status(400).json({ error: 'ventureId is required' });
    }

    if (!scope.allVentures && !scope.ventureIds.includes(ventureId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const now = new Date();
    const todayEnd = endOfDay(now);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const sevenStart = startOfDay(sevenDaysAgo);

    const campaigns = await prisma.bpoCampaign.findMany({
      where: { ventureId, isActive: true },
      select: { id: true, name: true, clientName: true, officeId: true, vertical: true },
    });

    const campaignIds = campaigns.map((c: any) => c.id);

    const baseMetricWhere: any = {
      campaignId: { in: campaignIds },
      date: { gte: sevenStart, lte: todayEnd },
    };
    if (!includeTest) {
      baseMetricWhere.isTest = false;
    }

    const metrics = await prisma.bpoDailyMetric.findMany({
      where: baseMetricWhere,
    });

    type CampAgg = {
      campaignId: number;
      days: number;
      talkTimeMin: number;
      handledCalls: number;
      outboundCalls: number;
      leadsCreated: number;
      demosBooked: number;
      salesClosed: number;
      revenue: number;
      cost: number;
      avgQaScoreSum: number;
      qaCount: number;
    };

    const campMap = new Map<number, CampAgg>();

    for (const m of metrics) {
      if (!campMap.has(m.campaignId)) {
        campMap.set(m.campaignId, {
          campaignId: m.campaignId,
          days: 0,
          talkTimeMin: 0,
          handledCalls: 0,
          outboundCalls: 0,
          leadsCreated: 0,
          demosBooked: 0,
          salesClosed: 0,
          revenue: 0,
          cost: 0,
          avgQaScoreSum: 0,
          qaCount: 0,
        });
      }
      const agg = campMap.get(m.campaignId)!;
      agg.days += 1;
      agg.talkTimeMin += m.talkTimeMin || 0;
      agg.handledCalls += m.handledCalls || 0;
      agg.outboundCalls += m.outboundCalls || 0;
      agg.leadsCreated += m.leadsCreated || 0;
      agg.demosBooked += m.demosBooked || 0;
      agg.salesClosed += m.salesClosed || 0;
      agg.revenue += m.revenue || 0;
      agg.cost += m.cost || 0;
      if (m.avgQaScore != null) {
        agg.avgQaScoreSum += m.avgQaScore;
        agg.qaCount += 1;
      }
    }

    const campaignCards = campaigns.map((c: any) => {
      const agg = campMap.get(c.id);
      const conversion = agg && agg.outboundCalls > 0 ? agg.leadsCreated / agg.outboundCalls : 0;
      const roi = agg && agg.cost > 0 ? (agg.revenue - agg.cost) / agg.cost : 0;
      const avgQa = agg && agg.qaCount > 0 ? agg.avgQaScoreSum / agg.qaCount : 0;

      return {
        id: c.id,
        name: c.name,
        clientName: c.clientName,
        vertical: c.vertical,
        talkTimeMin: agg?.talkTimeMin || 0,
        handledCalls: agg?.handledCalls || 0,
        outboundCalls: agg?.outboundCalls || 0,
        leadsCreated: agg?.leadsCreated || 0,
        demosBooked: agg?.demosBooked || 0,
        salesClosed: agg?.salesClosed || 0,
        revenue: agg?.revenue || 0,
        cost: agg?.cost || 0,
        conversion,
        roi,
        avgQa,
      };
    });

    const totalTalk = campaignCards.reduce((s: number, c: any) => s + c.talkTimeMin, 0);
    const totalHandled = campaignCards.reduce((s: number, c: any) => s + c.handledCalls, 0);
    const totalOutbound = campaignCards.reduce((s: number, c: any) => s + c.outboundCalls, 0);
    const totalLeads = campaignCards.reduce((s: number, c: any) => s + c.leadsCreated, 0);
    const totalDemos = campaignCards.reduce((s: number, c: any) => s + c.demosBooked, 0);
    const totalSales = campaignCards.reduce((s: number, c: any) => s + c.salesClosed, 0);
    const totalRevenue = campaignCards.reduce((s: number, c: any) => s + c.revenue, 0);
    const totalCost = campaignCards.reduce((s: number, c: any) => s + c.cost, 0);

    const portfolioConversion = totalOutbound > 0 ? totalLeads / totalOutbound : 0;
    const portfolioRoi = totalCost > 0 ? (totalRevenue - totalCost) / totalCost : 0;

    const agentMetricWhere: any = {
      campaignId: { in: campaignIds },
      date: { gte: sevenStart, lte: todayEnd },
    };
    if (!includeTest) {
      agentMetricWhere.isTest = false;
    }

    const agentMetrics = await prisma.bpoAgentMetric.findMany({
      where: agentMetricWhere,
    });

    type AgentAgg = {
      userId: number | null;
      agentName: string | null;
      outboundCalls: number;
      leadsCreated: number;
      demosBooked: number;
      salesClosed: number;
    };

    const agentMap = new Map<string, AgentAgg>();

    const keyForAgent = (m: { userId: number | null; agentName: string | null }) =>
      m.userId ? `user_${m.userId}` : m.agentName || 'UNKNOWN';

    for (const m of agentMetrics) {
      const key = keyForAgent(m);
      if (!agentMap.has(key)) {
        agentMap.set(key, {
          userId: m.userId,
          agentName: m.agentName,
          outboundCalls: 0,
          leadsCreated: 0,
          demosBooked: 0,
          salesClosed: 0,
        });
      }
      const agg = agentMap.get(key)!;
      agg.outboundCalls += m.outboundCalls || 0;
      agg.leadsCreated += m.leadsCreated || 0;
      agg.demosBooked += m.demosBooked || 0;
      agg.salesClosed += m.salesClosed || 0;
    }

    const userIds = Array.from(
      new Set(
        Array.from(agentMap.values())
          .map(a => a.userId)
          .filter(Boolean) as number[]
      )
    );

    const users = userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, fullName: true },
        })
      : [];

    const userMap = new Map(users.map((u: any) => [u.id, u.fullName]));

    const leaderboard = Array.from(agentMap.entries())
      .map(([key, agg]) => ({
        key,
        name: (agg.userId && userMap.get(agg.userId)) || agg.agentName || 'Unknown agent',
        outboundCalls: agg.outboundCalls,
        leadsCreated: agg.leadsCreated,
        demosBooked: agg.demosBooked,
        salesClosed: agg.salesClosed,
        leadRate: agg.outboundCalls > 0 ? agg.leadsCreated / agg.outboundCalls : 0,
      }))
      .sort((a, b) => b.leadsCreated - a.leadsCreated)
      .slice(0, 10);

    return res.json({
      summary: {
        totalTalk,
        totalHandled,
        totalOutbound,
        totalLeads,
        totalDemos,
        totalSales,
        totalRevenue,
        totalCost,
        portfolioConversion,
        portfolioRoi,
      },
      campaigns: campaignCards,
      leaderboard,
    });
  } catch (err) {
    console.error('BPO dashboard error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
