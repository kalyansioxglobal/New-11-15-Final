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

    if (req.method === 'GET') {
      const q = (req.query.q as string | undefined)?.trim();
      const page = Number(req.query.page || 1);
      const pageSize = Number(req.query.pageSize || 50);

      const safePage = Number.isFinite(page) && page > 0 ? page : 1;
      const safePageSize =
        Number.isFinite(pageSize) && pageSize > 0 && pageSize <= 200 ? pageSize : 50;

      const skip = (safePage - 1) * safePageSize;
      const take = safePageSize;

      const where: any = {};

      if (ventureId) {
        where.ventureId = ventureId;
      } else if (!scope.allVentures) {
        where.ventureId = { in: scope.ventureIds };
      }

      if (q) {
        where.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { domain: { contains: q, mode: 'insensitive' } },
        ];
      }

      const [total, customers] = await Promise.all([
        prisma.saasCustomer.count({ where }),
        prisma.saasCustomer.findMany({
          where,
          include: {
            venture: { select: { id: true, name: true } },
            subscriptions: {
              where: { isActive: true },
              select: { id: true, planName: true, mrr: true, startedAt: true },
            },
          },
          orderBy: { name: 'asc' },
          skip,
          take,
        }),
      ]);

      const customersWithMrr = customers.map(c => ({
        ...c,
        totalMrr: c.subscriptions.reduce((sum, s) => sum + s.mrr, 0),
        activeSubscriptions: c.subscriptions.length,
      }));

      return res.json({
        items: customersWithMrr,
        page: safePage,
        pageSize: safePageSize,
        total,
        totalPages: Math.ceil(total / safePageSize) || 1,
      });
    }

    if (req.method === 'POST') {
      if (!canCreateTasks(user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { name, email, domain, notes, subscription } = req.body;
      const targetVentureId = req.body.ventureId ? Number(req.body.ventureId) : ventureId;

      if (!targetVentureId || !name) {
        return res.status(400).json({ error: 'ventureId and name are required' });
      }

      if (!scope.ventureIds.includes(targetVentureId) && !scope.allVentures) {
        return res.status(403).json({ error: 'Not authorized for this venture' });
      }

      const customer = await prisma.saasCustomer.create({
        data: {
          ventureId: targetVentureId,
          name,
          email,
          domain,
          notes,
        },
        include: {
          venture: { select: { id: true, name: true } },
        },
      });

      if (subscription && subscription.monthlyPrice) {
        const serviceLabels: Record<string, string> = {
          revenue: 'Revenue',
          reputation: 'Reputation',
          combo: 'Combo (Revenue + Reputation)',
        };
        
        const planName = serviceLabels[subscription.serviceType] || subscription.serviceType;
        const billingNote = subscription.billingCycle !== 'monthly' 
          ? ` (billed ${subscription.billingCycle})`
          : '';

        await prisma.saasSubscription.create({
          data: {
            customerId: customer.id,
            planName: planName + billingNote,
            mrr: Number(subscription.monthlyPrice),
            startedAt: subscription.startDate ? new Date(subscription.startDate) : new Date(),
            notes: `Service: ${planName}, Billing: ${subscription.billingCycle}`,
            isActive: true,
          },
        });
      }

      const customerWithSubscriptions = await prisma.saasCustomer.findUnique({
        where: { id: customer.id },
        include: {
          venture: { select: { id: true, name: true } },
          subscriptions: {
            where: { isActive: true },
            select: { id: true, planName: true, mrr: true, startedAt: true },
          },
        },
      });

      return res.status(201).json(customerWithSubscriptions);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('SaaS Customers API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
