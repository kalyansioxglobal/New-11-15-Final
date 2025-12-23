import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../../lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '../../../../../lib/scope';
import { isSuperAdmin } from '../../../../../lib/permissions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const campaignId = Number(id);

  if (isNaN(campaignId)) {
    return res.status(400).json({ error: 'Invalid campaign ID' });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const scope = getUserScope(user);

    const campaign = await prisma.bpoCampaign.findUnique({
      where: { id: campaignId },
      select: { id: true, ventureId: true },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (!scope.allVentures && !scope.ventureIds.includes(campaign.ventureId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (req.method === 'GET') {
      const { from, to, includeTest, limit } = req.query;
      const includeTestFlag = includeTest === 'true';

      const where: any = {
        campaignId,
      };

      if (!includeTestFlag) {
        where.isTest = false;
      }

      if (from || to) {
        where.date = {};
        if (from) where.date.gte = new Date(from as string);
        if (to) where.date.lte = new Date(to as string);
      }

      const metrics = await prisma.bpoDailyMetric.findMany({
        where,
        orderBy: { date: 'desc' },
        take: limit ? Number(limit) : 90,
      });

      return res.json(metrics.reverse());
    }

    if (req.method === 'POST') {
      if (!isSuperAdmin(user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { records, isTest: batchIsTest } = req.body as {
        records: {
          date: string;
          talkTimeMin?: number;
          handledCalls?: number;
          outboundCalls?: number;
          leadsCreated?: number;
          demosBooked?: number;
          salesClosed?: number;
          fteCount?: number;
          avgQaScore?: number;
          revenue?: number;
          cost?: number;
          isTest?: boolean;
        }[];
        isTest?: boolean;
      };

      if (!records || !Array.isArray(records)) {
        return res.status(400).json({ error: 'records array is required' });
      }

      const ops = records.map(r => {
        const testFlag = r.isTest !== undefined ? !!r.isTest : !!batchIsTest;
        return prisma.bpoDailyMetric.upsert({
          where: {
            campaignId_date: {
              campaignId,
              date: new Date(r.date),
            },
          },
          update: {
            talkTimeMin: r.talkTimeMin,
            handledCalls: r.handledCalls,
            outboundCalls: r.outboundCalls,
            leadsCreated: r.leadsCreated,
            demosBooked: r.demosBooked,
            salesClosed: r.salesClosed,
            fteCount: r.fteCount,
            avgQaScore: r.avgQaScore,
            revenue: r.revenue,
            cost: r.cost,
            isTest: testFlag,
          },
          create: {
            campaignId,
            date: new Date(r.date),
            talkTimeMin: r.talkTimeMin,
            handledCalls: r.handledCalls,
            outboundCalls: r.outboundCalls,
            leadsCreated: r.leadsCreated,
            demosBooked: r.demosBooked,
            salesClosed: r.salesClosed,
            fteCount: r.fteCount,
            avgQaScore: r.avgQaScore,
            revenue: r.revenue,
            cost: r.cost,
            isTest: testFlag,
          },
        });
      });

      await prisma.$transaction(ops);
      return res.status(201).json({ ok: true, count: records.length });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('BPO campaign metrics error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
