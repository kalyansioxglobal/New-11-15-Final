import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '../../../../lib/scope';
import { canCreateTasks } from '../../../../lib/permissions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const subscriptionId = Number(id);

  if (isNaN(subscriptionId)) {
    return res.status(400).json({ error: 'Invalid subscription ID' });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const scope = getUserScope(user);

    const subscription = await prisma.saasSubscription.findUnique({
      where: { id: subscriptionId },
      include: {
        customer: {
          select: { id: true, name: true, email: true, ventureId: true },
        },
      },
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (!scope.ventureIds.includes(subscription.customer.ventureId) && !scope.allVentures) {
      return res.status(403).json({ error: 'Not authorized for this subscription' });
    }

    if (req.method === 'GET') {
      return res.json(subscription);
    }

    if (req.method === 'PATCH') {
      if (!canCreateTasks(user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { planName, mrr, isActive, cancelledAt, notes } = req.body;

      const updated = await prisma.saasSubscription.update({
        where: { id: subscriptionId },
        data: {
          ...(planName !== undefined && { planName }),
          ...(mrr !== undefined && { mrr: Number(mrr) }),
          ...(isActive !== undefined && { isActive }),
          ...(cancelledAt !== undefined && { cancelledAt: cancelledAt ? new Date(cancelledAt) : null }),
          ...(notes !== undefined && { notes }),
        },
        include: {
          customer: { select: { id: true, name: true } },
        },
      });

      return res.json(updated);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('SaaS Subscription detail API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
