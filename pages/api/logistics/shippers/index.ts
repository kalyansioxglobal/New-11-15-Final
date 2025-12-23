import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '../../../../lib/scope';
import { canCreateTasks } from '../../../../lib/permissions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const scope = getUserScope(user);
    const ventureId = req.query.ventureId ? Number(req.query.ventureId) : undefined;
    const includeTest = req.query.includeTest === 'true';

    switch (req.method) {
      case 'GET':
        return listShippers(req, res, scope, ventureId, includeTest);
      case 'POST':
        return createShipper(req, res, user, scope, ventureId);
      default: {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: 'Method not allowed' });
      }
    }
  } catch (err: any) {
    console.error('Shippers API error:', err);
    return res.status(500).json({ error: 'Internal server error', detail: err.message || String(err) });
  }
}

async function listShippers(
  req: NextApiRequest,
  res: NextApiResponse,
  scope: any,
  ventureId: number | undefined,
  includeTest: boolean,
) {
  const q = (req.query.q as string | undefined)?.trim();
  const page = Number(req.query.page || 1);
  const pageSize = Number(req.query.pageSize || 50);

  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safePageSize =
    Number.isFinite(pageSize) && pageSize > 0 && pageSize <= 200 ? pageSize : 50;

  const skip = (safePage - 1) * safePageSize;
  const take = safePageSize;

  const where: any = {
    isActive: true,
    ...(includeTest ? {} : { venture: { isTest: false } }),
  };

  if (ventureId) {
    where.ventureId = ventureId;
  } else if (!scope.allVentures) {
    where.ventureId = { in: scope.ventureIds };
  }

  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { contactName: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.logisticsShipper.findMany({
      where,
      include: {
        venture: { select: { id: true, name: true } },
        _count: { select: { loads: true } },
      },
      orderBy: { name: 'asc' },
      skip,
      take,
    }),
    prisma.logisticsShipper.count({ where }),
  ]);

  return res.status(200).json({
    items,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.ceil(total / safePageSize) || 1,
  });
}

async function createShipper(
  req: NextApiRequest,
  res: NextApiResponse,
  user: any,
  scope: any,
  ventureId: number | undefined,
) {
  if (!canCreateTasks(user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const {
    name,
    contactName,
    email,
    phone,
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
    country,
    notes,
  } = req.body;
  const targetVentureId = req.body.ventureId ? Number(req.body.ventureId) : ventureId;

  if (!targetVentureId) {
    return res.status(400).json({ error: 'ventureId is required' });
  }

  if (!scope.ventureIds.includes(targetVentureId) && !scope.allVentures) {
    return res.status(403).json({ error: 'Not authorized for this venture' });
  }

  const shipper = await prisma.logisticsShipper.create({
    data: {
      ventureId: targetVentureId,
      name,
      contactName,
      email,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      notes,
    },
    include: {
      venture: { select: { id: true, name: true } },
    },
  });

  return res.status(201).json(shipper);
}
