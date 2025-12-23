import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { can } from '@/lib/permissions';
import { logger } from '@/lib/logger';
import { generateRequestId } from '@/lib/requestId';
import { awardPointsForEvent } from '@/lib/gamification/awardPoints';

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

  try {
    const quoteId = Number(req.query.id);
    if (!quoteId || isNaN(quoteId)) {
      return res.status(400).json({ error: 'Invalid quote id' });
    }

    const quote = await prisma.freightQuote.findUnique({
      where: { id: quoteId },
      include: {
        customer: { select: { id: true, name: true } },
        shipper: { select: { id: true, name: true } },
      },
    });

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    if (!can(user, 'create', 'TASK', { ventureId: quote.ventureId })) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    if (quote.loadId) {
      const existingLoad = await prisma.load.findUnique({
        where: { id: quote.loadId },
        select: { id: true, tmsLoadId: true },
      });
      
      return res.status(200).json({ 
        quote,
        load: existingLoad,
        alreadyConverted: true,
        message: 'Quote already converted to load',
      });
    }

    if (quote.status !== 'ACCEPTED' && quote.status !== 'BOOKED') {
      return res.status(400).json({ 
        error: `Cannot convert quote with status ${quote.status}. Quote must be ACCEPTED or BOOKED.`,
      });
    }

    const { tmsLoadId, pickupDate, deliveryDate, notes } = req.body;

    const load = await prisma.load.create({
      data: {
        ventureId: quote.ventureId,
        customerId: quote.customerId,
        shipperId: quote.shipperId ?? undefined,
        billAmount: quote.sellRate ?? undefined,
        costAmount: quote.buyRateEstimate ?? undefined,
        pickupCity: quote.origin?.split(',')[0]?.trim() ?? undefined,
        pickupState: quote.origin?.split(',')[1]?.trim() ?? undefined,
        dropCity: quote.destination?.split(',')[0]?.trim() ?? undefined,
        dropState: quote.destination?.split(',')[1]?.trim() ?? undefined,
        equipmentType: quote.equipmentType ?? undefined,
        tmsLoadId: tmsLoadId ?? undefined,
        pickupDate: pickupDate ? new Date(pickupDate) : undefined,
        dropDate: deliveryDate ? new Date(deliveryDate) : undefined,
        notes: notes ?? quote.notes ?? undefined,
        status: 'QUOTED',
        createdById: user.id,
      },
    });

    const updatedQuote = await prisma.freightQuote.update({
      where: { id: quoteId },
      data: {
        status: 'BOOKED',
        bookedAt: new Date(),
        loadId: load.id,
      },
      include: {
        customer: { select: { id: true, name: true } },
        shipper: { select: { id: true, name: true } },
        salesperson: { select: { id: true, fullName: true } },
      },
    });

    logger.info('freight_api', {
      endpoint: '/api/freight/quotes/[id]/convert-to-load',
      userId: user.id,
      role: user.role,
      outcome: 'success',
      requestId,
      quoteId,
      loadId: load.id,
    });

    // Award gamification points for quote conversion
    awardPointsForEvent(user.id, quote.ventureId, 'QUOTE_CONVERTED', {
      metadata: { quoteId, loadId: load.id },
      idempotencyKey: `quote-converted-${quoteId}`,
    }).catch(err => console.error('[gamification] Quote converted award error:', err));

    return res.status(201).json({
      quote: updatedQuote,
      load,
      alreadyConverted: false,
      message: 'Quote successfully converted to load',
    });
  } catch (err: unknown) {
    logger.error('freight_api', {
      endpoint: '/api/freight/quotes/[id]/convert-to-load',
      userId: user.id,
      role: user.role,
      outcome: 'error',
      requestId,
    });
    console.error('Convert quote to load error', err);
    const error = err as { statusCode?: number; message?: string };
    return res.status(error.statusCode ?? 500).json({ 
      error: error.message ?? 'Internal server error' 
    });
  }
}
