import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '../../../../lib/scope';
import { canCreateTasks } from '../../../../lib/permissions';
import { normalizeNonNegativeNumber, validateIdOr400, validateTextField } from "@/lib/validation";


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const scope = getUserScope(user);
    const rawCustomerId = req.query.customerId;
    const rawVentureId = req.query.ventureId;

    const customerIdParsed = rawCustomerId
      ? validateIdOr400(rawCustomerId, 'customerId', res)
      : undefined;
    if (rawCustomerId && customerIdParsed === null) return;

    const ventureIdParsed = rawVentureId
      ? validateIdOr400(rawVentureId, 'ventureId', res)
      : undefined;
    if (rawVentureId && ventureIdParsed === null) return;

    const activeOnly = req.query.activeOnly !== 'false';

    if (req.method === 'GET') {
      const where: any = {};

      if (customerIdParsed) {
        where.customerId = customerIdParsed;
      }

      if (ventureIdParsed) {
        where.customer = { ventureId: ventureIdParsed };
      }

      if (!scope.allVentures) {
        if (ventureIdParsed && !scope.ventureIds.includes(ventureIdParsed)) {
          return res.status(403).json({
            error: 'Forbidden',
            detail: 'No access to this venture',
          });
        }
        if (!ventureIdParsed) {
          where.customer = { ...where.customer, ventureId: { in: scope.ventureIds } };
        }
      }

      if (activeOnly) {
        where.isActive = true;
      }

      const subscriptions = await prisma.saasSubscription.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true, email: true, ventureId: true },
          },
        },
        orderBy: { startedAt: 'desc' },
        take: 200,
      });

      const formatted = subscriptions.map(s => {
        let status = 'ACTIVE';
        if (s.cancelledAt) {
          status = 'CANCELLED';
        } else if (!s.isActive) {
          status = 'PAUSED';
        }

        return {
          id: s.id,
          plan: s.planName,
          status,
          mrr: s.mrr,
          startDate: s.startedAt,
          endDate: s.cancelledAt,
          customerName: s.customer?.name || 'Unknown',
          customerId: s.customerId,
        };
      });

      return res.json({ subscriptions: formatted });
    }

    if (req.method === 'POST') {
      if (!canCreateTasks(user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { customerId: bodyCustomerId, planName, mrr, startedAt, notes } = req.body;

      if (!bodyCustomerId || !planName || mrr === undefined) {
        return res.status(400).json({ error: 'customerId, planName, and mrr are required' });
      }

      const customerIdValue = validateIdOr400(bodyCustomerId, 'customerId', res);
      if (customerIdValue === null) return;

      const mrrValue = normalizeNonNegativeNumber(mrr, 'mrr', res);
      if (mrrValue === null) return;

      const customer = await prisma.saasCustomer.findUnique({
        where: { id: customerIdValue },
      });

      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      if (!scope.ventureIds.includes(customer.ventureId) && !scope.allVentures) {
        return res.status(403).json({ error: 'Not authorized for this customer' });
      }

      const safeNotes = validateTextField(notes, 'notes', 2000, res);
      if (notes && safeNotes === null) return;

      const subscription = await prisma.saasSubscription.create({
        data: {
          customerId: customerIdValue,
          planName,
          mrr: mrrValue,
          startedAt: startedAt ? new Date(startedAt) : new Date(),
          notes: safeNotes ?? undefined,
        },
        include: {
          customer: { select: { id: true, name: true } },
        },
      });

      return res.status(201).json(subscription);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('SaaS Subscriptions API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
