import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { canViewCustomer } from '@/lib/scope';
import { logger } from '@/lib/logger';
import { generateRequestId } from '@/lib/requestId';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
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

    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Number(req.query.offset) || 0;

    const [touches, total] = await Promise.all([
      prisma.customerTouch.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: { select: { id: true, fullName: true, email: true } },
        },
      }),
      prisma.customerTouch.count({ where: { customerId } }),
    ]);

    logger.info('freight_api', {
      endpoint: '/api/logistics/customers/[id]/touches',
      userId: user.id,
      role: user.role,
      outcome: 'success',
      requestId,
      customerId,
    });

    return res.json({
      touches,
      total,
      limit,
      offset,
    });
  } catch (err) {
    logger.error('freight_api', {
      endpoint: '/api/logistics/customers/[id]/touches',
      userId: user.id,
      role: user.role,
      outcome: 'error',
      requestId,
    });
    console.error('Touch list error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
