import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '../../../../lib/scope';
import { canCreateTasks } from '../../../../lib/permissions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };
  const hotelId = Number(id);

  if (isNaN(hotelId)) {
    return res.status(400).json({ error: 'Invalid hotel ID' });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const scope = getUserScope(user);

    const hotel = await prisma.hotelProperty.findUnique({
      where: { id: hotelId },
      include: {
        venture: { select: { id: true, name: true } },
      },
    });

    if (!hotel) {
      return res.status(404).json({ error: 'Hotel not found' });
    }

    if (!scope.allVentures && !scope.ventureIds.includes(hotel.ventureId)) {
      return res.status(403).json({ error: 'Not authorized for this hotel' });
    }

    if (req.method === 'GET') {
      return res.json(hotel);
    }

    if (req.method === 'PATCH') {
      if (!canCreateTasks(user.role)) {
        return res.status(403).json({ error: 'Forbidden - cannot update hotels' });
      }

      const { name, brand, city, state, country, rooms, code, status } = req.body;

      const updated = await prisma.hotelProperty.update({
        where: { id: hotelId },
        data: {
          ...(name !== undefined && { name }),
          ...(brand !== undefined && { brand }),
          ...(city !== undefined && { city }),
          ...(state !== undefined && { state }),
          ...(country !== undefined && { country }),
          ...(rooms !== undefined && { rooms: rooms ? Number(rooms) : null }),
          ...(code !== undefined && { code }),
          ...(status !== undefined && { status }),
        },
        include: {
          venture: { select: { id: true, name: true } },
        },
      });

      return res.json(updated);
    }

    if (req.method === 'DELETE') {
      if (!canCreateTasks(user.role)) {
        return res.status(403).json({ error: 'Forbidden - cannot delete hotels' });
      }

      await prisma.hotelProperty.update({
        where: { id: hotelId },
        data: { status: 'CLOSED' },
      });

      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Hotel detail API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
