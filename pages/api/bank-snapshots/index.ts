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
    const bankAccountId = req.query.bankAccountId ? Number(req.query.bankAccountId) : undefined;
    const ventureId = req.query.ventureId ? Number(req.query.ventureId) : undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    if (req.method === 'GET') {
      const where: any = {};

      if (bankAccountId) {
        where.bankAccountId = bankAccountId;
      }

      if (ventureId) {
        if (!scope.allVentures && !scope.ventureIds.includes(ventureId)) {
          return res.status(403).json({ error: 'Not authorized for this venture' });
        }
        where.bankAccount = { ventureId };
      } else if (!scope.allVentures) {
        where.bankAccount = { ventureId: { in: scope.ventureIds } };
      }

      if (from || to) {
        where.snapshotDate = {};
        if (from) where.snapshotDate.gte = new Date(from);
        if (to) where.snapshotDate.lte = new Date(to);
      }

      const snapshots = await prisma.bankSnapshot.findMany({
        where,
        include: {
          bankAccount: {
            include: {
              venture: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { snapshotDate: 'desc' },
        take: 500,
      });

      const latestByAccount = new Map<number, typeof snapshots[0]>();
      for (const snap of snapshots) {
        if (!latestByAccount.has(snap.bankAccountId)) {
          latestByAccount.set(snap.bankAccountId, snap);
        }
      }

      const balanceByCurrency = new Map<string, number>();
      for (const snap of latestByAccount.values()) {
        const currency = snap.bankAccount.currency || 'USD';
        balanceByCurrency.set(
          currency,
          (balanceByCurrency.get(currency) || 0) + snap.balance
        );
      }

      const totalsByMajorCurrency = Object.fromEntries(balanceByCurrency);
      const totalBalance = balanceByCurrency.get('USD') || 0;

      return res.json({
        snapshots,
        summary: {
          totalSnapshots: snapshots.length,
          uniqueAccounts: latestByAccount.size,
          totalBalance,
          totalsByCurrency: totalsByMajorCurrency,
        },
      });
    }

    if (req.method === 'POST') {
      if (!isSuperAdmin(user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { bankAccountId: bodyAccountId, balance, snapshotDate, notes } = req.body;
      const targetAccountId = bodyAccountId ? Number(bodyAccountId) : bankAccountId;

      if (!targetAccountId || balance === undefined || balance === '') {
        return res.status(400).json({ error: 'bankAccountId and balance are required' });
      }

      const parsedBalance = Number(balance);
      if (!Number.isFinite(parsedBalance)) {
        return res.status(400).json({ error: 'balance must be a valid number' });
      }

      const account = await prisma.bankAccount.findUnique({
        where: { id: targetAccountId },
      });

      if (!account) {
        return res.status(404).json({ error: 'Bank account not found' });
      }

      if (!scope.allVentures && !scope.ventureIds.includes(account.ventureId)) {
        return res.status(403).json({ error: 'Not authorized for this venture' });
      }

      const snapshot = await prisma.bankSnapshot.create({
        data: {
          bankAccountId: targetAccountId,
          balance: parsedBalance,
          snapshotDate: snapshotDate ? new Date(snapshotDate) : new Date(),
          notes: notes || null,
        },
        include: {
          bankAccount: {
            include: {
              venture: { select: { id: true, name: true } },
            },
          },
        },
      });

      return res.status(201).json({ snapshot });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Bank Snapshots API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
