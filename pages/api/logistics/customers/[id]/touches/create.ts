import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { canViewCustomer } from '@/lib/scope';
import { logger } from '@/lib/logger';
import { generateRequestId } from '@/lib/requestId';

const VALID_CHANNELS = ['CALL', 'EMAIL', 'TEXT', 'MEETING', 'OTHER'] as const;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  const requestId = (req.headers && (req.headers['x-request-id'] as string)) || generateRequestId();

  const customerId = Number(req.query.id);
  if (!customerId || Number.isNaN(customerId)) {
    return res.status(400).json({ error: 'Invalid customer id' });
  }

  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, ventureId: true, name: true, assignedSalesId: true, assignedCsrId: true, assignedDispatcherId: true },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (!canViewCustomer(user, customer)) {
      return res.status(403).json({ error: 'Not allowed to access this customer' });
    }

    const { channel, outcome, notes } = req.body;

    if (!channel || !VALID_CHANNELS.includes(channel)) {
      return res.status(400).json({ 
        error: `Invalid channel. Must be one of: ${VALID_CHANNELS.join(', ')}` 
      });
    }

    const ventureId = customer.ventureId;
    if (!ventureId) {
      return res.status(400).json({ error: 'Customer has no venture assigned' });
    }

    const [touch] = await prisma.$transaction([
      prisma.customerTouch.create({
        data: {
          ventureId,
          customerId,
          userId: user.id,
          channel,
          outcome: outcome ?? null,
          notes: notes ?? null,
        },
        include: {
          user: { select: { id: true, fullName: true, email: true } },
        },
      }),
      prisma.customer.update({
        where: { id: customerId },
        data: {
          lastTouchAt: new Date(),
          lastTouchByUserId: user.id,
        },
      }),
    ]);

    logger.info('freight_api', {
      endpoint: '/api/logistics/customers/[id]/touches/create',
      userId: user.id,
      role: user.role,
      outcome: 'success',
      requestId,
      customerId,
      channel,
    });

    return res.status(201).json({ touch });
  } catch (err) {
    logger.error('freight_api', {
      endpoint: '/api/logistics/customers/[id]/touches/create',
      userId: user.id,
      role: user.role,
      outcome: 'error',
      requestId,
    });
    console.error('Touch create error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
