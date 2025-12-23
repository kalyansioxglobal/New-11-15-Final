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
    const id = Number(req.query.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid account ID' });
    }

    const account = await prisma.bankAccount.findUnique({
      where: { id },
      include: {
        venture: { select: { id: true, name: true } },
        snapshots: {
          orderBy: { snapshotDate: 'desc' },
        },
      },
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (!scope.allVentures && !scope.ventureIds.includes(account.ventureId)) {
      return res.status(403).json({ error: 'Not authorized for this venture' });
    }

    if (req.method === 'GET') {
      return res.json(account);
    }

    if (req.method === 'PATCH') {
      if (!isSuperAdmin(user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { name, bankName, accountNumber, currency, isActive } = req.body;

      const updated = await prisma.bankAccount.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(bankName !== undefined && { bankName }),
          ...(accountNumber !== undefined && { accountNumber }),
          ...(currency !== undefined && { currency }),
          ...(isActive !== undefined && { isActive }),
        },
        include: {
          venture: { select: { id: true, name: true } },
        },
      });

      return res.json(updated);
    }

    if (req.method === 'DELETE') {
      if (!isSuperAdmin(user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      await prisma.bankAccount.update({
        where: { id },
        data: { isActive: false },
      });

      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Bank Account API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
