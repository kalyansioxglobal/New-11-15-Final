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
    const hotelId = req.query.hotelId ? Number(req.query.hotelId) : undefined;
    const ventureId = req.query.ventureId ? Number(req.query.ventureId) : undefined;
    const source = req.query.source as string | undefined;
    const unresponded = req.query.unresponded === 'true';
    const includeTest = req.query.includeTest === 'true';

    if (req.method === 'GET') {
      const page = Number(req.query.page || 1);
      const pageSize = Number(req.query.pageSize || 50);

      const safePage = Number.isFinite(page) && page > 0 ? page : 1;
      const safePageSize =
        Number.isFinite(pageSize) && pageSize > 0 && pageSize <= 200 ? pageSize : 50;

      const skip = (safePage - 1) * safePageSize;
      const take = safePageSize;

      const where: any = {
        ...(includeTest ? {} : { isTest: false }),
      };

      if (hotelId) {
        where.hotelId = hotelId;
      }

      if (ventureId) {
        where.hotel = { ventureId };
      } else if (!scope.allVentures) {
        where.hotel = { ventureId: { in: scope.ventureIds } };
      }

      if (source) {
        where.source = source;
      }

      if (unresponded) {
        where.responseText = null;
      }

      const [total, reviews] = await Promise.all([
        prisma.hotelReview.count({ where }),
        prisma.hotelReview.findMany({
          where,
          include: {
            hotel: { select: { id: true, name: true, brand: true, ventureId: true } },
            respondedBy: { select: { id: true, fullName: true } },
          },
          orderBy: { reviewDate: 'desc' },
          skip,
          take,
        }),
      ]);

      return res.json({
        items: reviews,
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

      const {
        hotelId: bodyHotelId,
        source: bodySource,
        externalId,
        reviewerName,
        rating,
        title,
        comment,
        language,
        reviewDate,
        isTest,
      } = req.body;

      if (!bodyHotelId || !bodySource) {
        return res.status(400).json({ error: 'hotelId and source are required' });
      }

      const hotel = await prisma.hotelProperty.findUnique({
        where: { id: Number(bodyHotelId) },
      });

      if (!hotel) {
        return res.status(404).json({ error: 'Hotel not found' });
      }

      if (!scope.ventureIds.includes(hotel.ventureId) && !scope.allVentures) {
        return res.status(403).json({ error: 'Not authorized for this hotel' });
      }

      const review = await prisma.hotelReview.create({
        data: {
          hotelId: Number(bodyHotelId),
          source: bodySource,
          externalId,
          reviewerName,
          rating: rating ? Number(rating) : null,
          title,
          comment,
          language: language || 'en',
          reviewDate: reviewDate ? new Date(reviewDate) : new Date(),
          isTest: !!isTest,
        },
        include: {
          hotel: { select: { id: true, name: true, brand: true } },
        },
      });

      return res.status(201).json(review);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Reviews API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
