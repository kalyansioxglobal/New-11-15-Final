import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '../../../../lib/scope';
import { canCreateTasks } from '../../../../lib/permissions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const customerId = Number(id);

  if (isNaN(customerId)) {
    return res.status(400).json({ error: 'Invalid customer ID' });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const scope = getUserScope(user);

    const customer = await prisma.saasCustomer.findUnique({
      where: { id: customerId },
      include: {
        venture: { select: { id: true, name: true } },
        subscriptions: {
          orderBy: { startedAt: 'desc' },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (!scope.ventureIds.includes(customer.ventureId) && !scope.allVentures) {
      return res.status(403).json({ error: 'Not authorized for this venture' });
    }

    if (req.method === 'GET') {
      return res.json({
        ...customer,
        totalMrr: customer.subscriptions.filter(s => s.isActive).reduce((sum, s) => sum + s.mrr, 0),
      });
    }

    if (req.method === 'PATCH') {
      if (!canCreateTasks(user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { name, email, domain, notes } = req.body;

      const updated = await prisma.saasCustomer.update({
        where: { id: customerId },
        data: {
          ...(name !== undefined && { name }),
          ...(email !== undefined && { email }),
          ...(domain !== undefined && { domain }),
          ...(notes !== undefined && { notes }),
        },
        include: {
          venture: { select: { id: true, name: true } },
        },
      });

      return res.json(updated);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('SaaS Customer detail API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
