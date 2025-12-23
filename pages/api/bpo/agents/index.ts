import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '../../../../lib/scope';
import { isSuperAdmin } from '../../../../lib/permissions';
import { applyBpoScope } from '@/lib/scopeBpo';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const scope = getUserScope(user);
    const {
      ventureId: ventureIdParam,
      campaignId: campaignIdParam,
      page = '1',
      pageSize = '50',
      search,
    } = req.query;

    const ventureId = ventureIdParam ? Number(ventureIdParam) : undefined;
    const campaignId = campaignIdParam ? Number(campaignIdParam) : undefined;

    switch (req.method) {
      case 'GET':
        return listAgents(req, res, user, scope, ventureId, campaignId, String(page), String(pageSize), search);
      case 'POST':
        return createAgent(req, res, user, scope, ventureId);
      default: {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: 'Method not allowed' });
      }
    }
  } catch (err: any) {
    console.error('BPO Agents API error:', err);
    return res.status(500).json({ error: 'Internal server error', detail: err.message || String(err) });
  }
}

async function listAgents(
  req: NextApiRequest,
  res: NextApiResponse,
  user: any,
  scope: any,
  ventureId: number | undefined,
  campaignId: number | undefined,
  pageRaw: string,
  pageSizeRaw: string,
  search: string | string[] | undefined,
) {
  const pageNumRaw = parseInt(pageRaw, 10);
  const pageSizeParsed = parseInt(pageSizeRaw, 10);

  const pageNum = Number.isFinite(pageNumRaw) && pageNumRaw > 0 ? pageNumRaw : 1;
  const take =
    Number.isFinite(pageSizeParsed) && pageSizeParsed > 0 && pageSizeParsed <= 200
      ? pageSizeParsed
      : 50;
  const skip = (pageNum - 1) * take;

  let where: Record<string, unknown> = {
    isActive: true,
  };

  if (ventureId) {
    where.ventureId = ventureId;
  } else if (!scope.allVentures) {
    where.ventureId = { in: scope.ventureIds };
  }

  if (campaignId) {
    where.campaignId = campaignId;
  }

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim();
    where.OR = [
      { user: { fullName: { contains: q, mode: 'insensitive' } } },
      { user: { email: { contains: q, mode: 'insensitive' } } },
      { employeeId: { contains: q, mode: 'insensitive' } },
    ];
  }

  where = applyBpoScope(user, where);

  const [agents, total] = await Promise.all([
    prisma.bpoAgent.findMany({
      where,
      skip,
      take,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        venture: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true, clientName: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.bpoAgent.count({ where }),
  ]);

  return res.status(200).json({
    items: agents,
    total,
    page: pageNum,
    pageSize: take,
    totalPages: Math.ceil(total / take) || 1,
  });
}

async function createAgent(
  req: NextApiRequest,
  res: NextApiResponse,
  user: any,
  scope: any,
  ventureId: number | undefined,
) {
  if (!isSuperAdmin(user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { userId, campaignId: bodyCampaignId, employeeId } = req.body;
  const targetVentureId = req.body.ventureId ? Number(req.body.ventureId) : ventureId;

  if (!targetVentureId || !userId) {
    return res.status(400).json({ error: 'ventureId and userId are required' });
  }

  if (!scope.ventureIds.includes(targetVentureId) && !scope.allVentures) {
    return res.status(403).json({ error: 'Not authorized for this venture' });
  }

  const agent = await prisma.bpoAgent.create({
    data: {
      userId: Number(userId),
      ventureId: targetVentureId,
      campaignId: bodyCampaignId ? Number(bodyCampaignId) : null,
      employeeId,
    },
    include: {
      user: { select: { id: true, fullName: true, email: true } },
      venture: { select: { id: true, name: true } },
      campaign: { select: { id: true, name: true } },
    },
  });

  return res.status(201).json(agent);
}
