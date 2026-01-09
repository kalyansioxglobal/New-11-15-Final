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
    const includeTest = req.query.includeTest === 'true';

    if (req.method === 'GET') {
      const where: any = {
        ...(includeTest ? {} : { isTest: false }),
      };

      if (ventureId) {
        where.ventureId = ventureId;
      } else if (!scope.allVentures) {
        where.ventureId = { in: scope.ventureIds };
      }

      // Pagination parameters
      const page = Number(req.query.page || 1);
      const pageSize = Number(req.query.pageSize || 50);

      const safePage = Number.isFinite(page) && page > 0 ? page : 1;
      const safePageSize =
        Number.isFinite(pageSize) && pageSize > 0 && pageSize <= 200 ? pageSize : 50;

      const skip = (safePage - 1) * safePageSize;
      const take = safePageSize;

      const [total, hotels] = await Promise.all([
        prisma.hotelProperty.count({ where }),
        prisma.hotelProperty.findMany({
          where,
          include: {
            venture: { select: { id: true, name: true } },
          },
          orderBy: { name: 'asc' },
          skip,
          take,
        }),
      ]);

      return res.json({
        items: hotels,
        page: safePage,
        pageSize: safePageSize,
        total,
        totalPages: Math.ceil(total / safePageSize) || 1,
      });
    }

    if (req.method === 'POST') {
      if (!canCreateTasks(user.role)) {
        return res.status(403).json({ error: 'Forbidden - cannot create hotels' });
      }

      const bodyVentureId = req.body.ventureId ? Number(req.body.ventureId) : ventureId;
      if (!bodyVentureId) {
        return res.status(400).json({ error: 'ventureId is required' });
      }

      if (!scope.allVentures && !scope.ventureIds.includes(bodyVentureId)) {
        return res.status(403).json({ error: 'Not authorized for this venture' });
      }

      const { name, brand, city, state, country, rooms, code } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'name is required' });
      }

      const hotel = await prisma.hotelProperty.create({
        data: {
          ventureId: bodyVentureId,
          name,
          brand,
          city,
          state,
          country,
          rooms: rooms ? Number(rooms) : null,
          code,
        },
        include: {
          venture: { select: { id: true, name: true } },
        },
      });

      return res.status(201).json(hotel);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Hotels API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
