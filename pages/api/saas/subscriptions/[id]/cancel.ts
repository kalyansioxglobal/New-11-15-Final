import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { logActivity } from '@/lib/activityLog';
import { canCreateTasks } from '@/lib/permissions';
import { getUserScope } from '@/lib/scope';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  // Permission check
  if (!canCreateTasks(user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const id = Number(req.query.id);
  if (!id || isNaN(id)) {
    return res.status(400).json({ error: 'Invalid subscription ID' });
  }

  try {
    const scope = getUserScope(user);
    
    const subscription = await prisma.saasSubscription.findUnique({
      where: { id },
      include: {
        customer: {
          include: { venture: true },
        },
      },
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Venture scope check
    if (!scope.ventureIds.includes(subscription.customer.ventureId) && !scope.allVentures) {
      return res.status(403).json({ error: 'Not authorized for this subscription' });
    }

    if (!subscription.isActive) {
      return res.status(400).json({ error: 'Subscription is already cancelled' });
    }

    const { reason, feedback, saveOffer, acceptOffer } = req.body as {
      reason?: string;
      feedback?: string;
      saveOffer?: string;
      acceptOffer?: boolean;
    };

    if (acceptOffer && saveOffer) {
      await logActivity({
        userId: user.id,
        action: 'SAVE_OFFER_ACCEPTED',
        module: 'SAAS',
        entityType: 'SUBSCRIPTION',
        entityId: String(id),
        description: `Save offer "${saveOffer}" accepted for subscription #${id}`,
        metadata: { saveOffer, reason, feedback },
        req,
      });

      return res.json({
        saved: true,
        message: 'Customer retained with save offer',
        subscription,
      });
    }

    const updated = await prisma.saasSubscription.update({
      where: { id },
      data: {
        isActive: false,
        cancelledAt: new Date(),
        cancelReason: reason || null,
        cancelFeedback: feedback || null,
        saveOfferMade: saveOffer || null,
        saveOfferAccepted: false,
      },
    });

    await logActivity({
      userId: user.id,
      action: 'SUBSCRIPTION_CANCELLED',
      module: 'SAAS',
      entityType: 'SUBSCRIPTION',
      entityId: String(id),
      description: `Cancelled subscription #${id} - Reason: ${reason || 'Not specified'}`,
      metadata: { reason, feedback, saveOffer, mrr: subscription.mrr },
      req,
    });

    return res.json({
      saved: false,
      message: 'Subscription cancelled',
      subscription: updated,
    });
  } catch (err) {
    console.error('Cancel subscription error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
