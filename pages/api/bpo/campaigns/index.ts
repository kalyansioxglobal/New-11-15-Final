import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '../../../../lib/scope';
import { isSuperAdmin } from '../../../../lib/permissions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const scope = getUserScope(user);
    const ventureId = req.query.ventureId ? Number(req.query.ventureId) : undefined;

    switch (req.method) {
      case 'GET':
        return listCampaigns(req, res, scope, ventureId);
      case 'POST':
        return createCampaign(req, res, user, scope, ventureId);
      default: {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: 'Method not allowed' });
      }
    }
  } catch (err: any) {
    console.error('BPO Campaigns API error:', err);
    return res.status(500).json({ error: 'Internal server error', detail: err.message || String(err) });
  }
}

async function listCampaigns(
  req: NextApiRequest,
  res: NextApiResponse,
  scope: any,
  ventureId: number | undefined,
) {
  const { page = '1', pageSize = '50' } = req.query;
  const pageNumRaw = parseInt(String(page), 10);
  const pageSizeParsed = parseInt(String(pageSize), 10);

  const pageNum = Number.isFinite(pageNumRaw) && pageNumRaw > 0 ? pageNumRaw : 1;
  const take =
    Number.isFinite(pageSizeParsed) && pageSizeParsed > 0 && pageSizeParsed <= 200
      ? pageSizeParsed
      : 50;
  const skip = (pageNum - 1) * take;

  const where: any = {
    isActive: true,
  };

  if (ventureId) {
    where.ventureId = ventureId;
  } else if (!scope.allVentures) {
    where.ventureId = { in: scope.ventureIds };
  }

  const [campaigns, total] = await Promise.all([
    prisma.bpoCampaign.findMany({
      where,
      include: {
        venture: { select: { id: true, name: true } },
        office: { select: { id: true, name: true, city: true } },
        _count: { select: { agents: true, kpiRecords: true } },
      },
      orderBy: { name: 'asc' },
      skip,
      take,
    }),
    prisma.bpoCampaign.count({ where }),
  ]);

  return res.status(200).json({
    items: campaigns,
    total,
    page: pageNum,
    pageSize: take,
    totalPages: Math.ceil(total / take) || 1,
  });
}

async function createCampaign(
  req: NextApiRequest,
  res: NextApiResponse,
  user: any,
  scope: any,
  ventureId: number | undefined,
) {
  if (!isSuperAdmin(user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { name, clientName, formulaJson, description, vertical, timezone, officeId } = req.body;
  const targetVentureId = req.body.ventureId ? Number(req.body.ventureId) : ventureId;

  if (!targetVentureId || !name) {
    return res.status(400).json({ error: 'ventureId and name are required' });
  }

  if (!scope.ventureIds.includes(targetVentureId) && !scope.allVentures) {
    return res.status(403).json({ error: 'Not authorized for this venture' });
  }

  const campaign = await prisma.bpoCampaign.create({
    data: {
      ventureId: targetVentureId,
      officeId: officeId ? Number(officeId) : null,
      name,
      clientName,
      vertical,
      timezone,
      formulaJson: formulaJson || null,
      description,
    },
    include: {
      venture: { select: { id: true, name: true } },
      office: { select: { id: true, name: true, city: true } },
    },
  });

  return res.status(201).json(campaign);
}
