import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '../../../lib/scope';
import { isSuperAdmin } from '../../../lib/permissions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const scope = getUserScope(user);
    const ventureId = req.query.ventureId ? Number(req.query.ventureId) : undefined;

    switch (req.method) {
      case 'GET':
        return listBankAccounts(req, res, scope, ventureId);
      case 'POST':
        return createBankAccount(req, res, user, scope, ventureId);
      default: {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: 'Method not allowed' });
      }
    }
  } catch (err: any) {
    console.error('Bank Accounts API error:', err);
    return res.status(500).json({ error: 'Internal server error', detail: err.message || String(err) });
  }
}

async function listBankAccounts(
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

  const where: any = { isActive: true };

  if (ventureId) {
    if (!scope.allVentures && !scope.ventureIds.includes(ventureId)) {
      return res.status(403).json({ error: 'Not authorized for this venture' });
    }
    where.ventureId = ventureId;
  } else if (!scope.allVentures) {
    where.ventureId = { in: scope.ventureIds };
  }

  const [accounts, total] = await Promise.all([
    prisma.bankAccount.findMany({
      where,
      include: {
        venture: { select: { id: true, name: true } },
        snapshots: {
          orderBy: { snapshotDate: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
      skip,
      take,
    }),
    prisma.bankAccount.count({ where }),
  ]);

  return res.status(200).json({
    items: accounts,
    page: pageNum,
    pageSize: take,
    total,
    totalPages: Math.ceil(total / take) || 1,
  });
}

async function createBankAccount(
  req: NextApiRequest,
  res: NextApiResponse,
  user: any,
  scope: any,
  ventureId: number | undefined,
) {
  if (!isSuperAdmin(user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { 
    ventureId: bodyVentureId, 
    name, 
    bankName, 
    accountNumber, 
    currency,
  } = req.body;
  const targetVentureId = bodyVentureId ? Number(bodyVentureId) : ventureId;

  if (!targetVentureId || !name || !bankName || !accountNumber) {
    return res.status(400).json({ 
      error: 'ventureId, name, bankName, and accountNumber are required',
    });
  }

  if (!scope.allVentures && !scope.ventureIds.includes(targetVentureId)) {
    return res.status(403).json({ error: 'Not authorized for this venture' });
  }

  const account = await prisma.bankAccount.create({
    data: {
      ventureId: targetVentureId,
      name,
      bankName,
      accountNumber,
      currency: currency || 'USD',
    },
    include: {
      venture: { select: { id: true, name: true } },
    },
  });

  return res.status(201).json({ account });
}
