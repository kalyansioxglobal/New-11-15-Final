import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { can } from '@/lib/permissions';

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

  try {
    const quoteId = Number(req.query.id);
    if (!quoteId || isNaN(quoteId)) {
      return res.status(400).json({ error: 'Invalid quote id' });
    }

    const quote = await prisma.freightQuote.findUnique({
      where: { id: quoteId },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        shipper: { select: { id: true, name: true } },
        salesperson: { select: { id: true, fullName: true, email: true } },
        venture: { select: { id: true, name: true } },
        load: { select: { id: true, tmsLoadId: true, status: true } },
      },
    });

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    if (!can(user, 'view', 'TASK', { ventureId: quote.ventureId })) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    const serializedQuote = {
      ...quote,
      createdAt: quote.createdAt.toISOString(),
      updatedAt: quote.updatedAt.toISOString(),
      sentAt: quote.sentAt?.toISOString() ?? null,
      respondedAt: quote.respondedAt?.toISOString() ?? null,
      bookedAt: quote.bookedAt?.toISOString() ?? null,
      expiresAt: quote.expiresAt?.toISOString() ?? null,
    };

    return res.json(serializedQuote);
  } catch (err) {
    console.error('Get quote error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
