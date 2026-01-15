import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '../../../../lib/scope';
const ALLOWED_ROLES = ["CEO", "ADMIN", "COO", "FINANCE"];
const WRITE_ROLES = ["CEO", "ADMIN", "FINANCE"]; // Roles that can perform CRUD operations

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  if (!ALLOWED_ROLES.includes(user.role)) {
    return res.status(403).json({ error: 'Forbidden - insufficient role permissions' });
  }

  try {
    const scope = getUserScope(user);
    const ventureId = req.query.ventureId ? Number(req.query.ventureId) : undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    if (req.method === 'GET') {
      const where: any = {};

      if (ventureId) {
        where.ventureId = ventureId;
      } else if (!scope.allVentures) {
        where.OR = [
          { ventureId: { in: scope.ventureIds } },
          { ventureId: null },
        ];
      }

      if (from || to) {
        where.date = {};
        if (from) where.date.gte = new Date(from);
        if (to) where.date.lte = new Date(to);
      }

      const snapshots = await prisma.bankAccountSnapshot.findMany({
        where,
        include: {
          venture: { select: { id: true, name: true } },
        },
        orderBy: { date: 'desc' },
        take: 500,
      });

      const latestByAccount = new Map<string, typeof snapshots[0]>();
      for (const snap of snapshots) {
        const key = `${snap.ventureId || 'global'}-${snap.bankName}-${snap.accountLast4}`;
        if (!latestByAccount.has(key)) {
          latestByAccount.set(key, snap);
        }
      }

      const totalBalance = Array.from(latestByAccount.values()).reduce(
        (sum, s) => sum + (s.balance || 0),
        0
      );

      return res.json({
        snapshots,
        summary: {
          totalSnapshots: snapshots.length,
          uniqueAccounts: latestByAccount.size,
          totalBalance,
        },
      });
    }

    if (req.method === 'POST') {
      if (!WRITE_ROLES.includes(user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { bankName, accountName, accountLast4, date, balance, currency, notes } = req.body;
      const targetVentureId = req.body.ventureId ? Number(req.body.ventureId) : ventureId;

      if (!date || balance === undefined) {
        return res.status(400).json({ error: 'date and balance are required' });
      }

      if (targetVentureId && !scope.ventureIds.includes(targetVentureId) && !scope.allVentures) {
        return res.status(403).json({ error: 'Not authorized for this venture' });
      }

      const snapshot = await prisma.bankAccountSnapshot.create({
        data: {
          ventureId: targetVentureId || null,
          bankName,
          accountName,
          accountLast4,
          date: new Date(date),
          balance: Number(balance),
          currency: currency || 'USD',
          notes,
        },
        include: {
          venture: { select: { id: true, name: true } },
        },
      });

      return res.status(201).json(snapshot);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Bank Snapshots API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
