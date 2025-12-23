import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '../../../../lib/scope';
import { canCreateTasks } from '../../../../lib/permissions';
import { validateIdOr400, validateTextField } from "@/lib/validation";
import { logger } from "@/lib/logger";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const reviewId = validateIdOr400(id, 'id', res);
  if (reviewId === null) return;

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const scope = getUserScope(user);

    const review = await prisma.hotelReview.findUnique({
      where: { id: reviewId },
      include: {
        hotel: { select: { id: true, name: true, brand: true, ventureId: true } },
        respondedBy: { select: { id: true, fullName: true } },
      },
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (!scope.ventureIds.includes(review.hotel.ventureId) && !scope.allVentures) {
      return res.status(403).json({ error: 'Not authorized for this hotel' });
    }

    if (req.method === 'GET') {
      return res.json(review);
    }

    if (req.method === 'PATCH') {
      if (!canCreateTasks(user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { responseText } = req.body;
      const safeResponseText = validateTextField(responseText, 'responseText', 4000, res);
      if (responseText && safeResponseText === null) return;

      const updated = await prisma.hotelReview.update({
        where: { id: reviewId },
        data: {
          responseText: safeResponseText ?? null,
          respondedById: safeResponseText ? user.id : null,
          respondedAt: safeResponseText ? new Date() : null,
        },
        include: {
          hotel: { select: { id: true, name: true, brand: true, ventureId: true } },
          respondedBy: { select: { id: true, fullName: true } },
        },
      });

      // Award gamification points for hotel review response
      if (safeResponseText && updated.respondedById) {
        const { awardPointsForEvent } = await import('@/lib/gamification/awardPoints');
        await awardPointsForEvent(
          updated.respondedById,
          updated.hotel.ventureId,
          'HOTEL_REVIEW_RESPONDED',
          {
            metadata: { reviewId: reviewId, hotelId: updated.hotel.id },
            idempotencyKey: `hotel_review_${reviewId}_responded`,
          }
        ).catch(async (err) => {
          const { logger } = await import("@/lib/logger");
          logger.error('gamification_hotel_review_award_failed', {
            event: 'HOTEL_REVIEW_RESPONDED',
            userId: updated.respondedById,
            ventureId: updated.hotel.ventureId,
            key: `hotel_review_${reviewId}_responded`,
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }

      return res.json(updated);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    logger.error('hotel_review_api_failed', {
      reviewId: req.query.id,
      error: err?.message || String(err),
      stack: process.env.NODE_ENV !== 'production' ? err?.stack : undefined,
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
