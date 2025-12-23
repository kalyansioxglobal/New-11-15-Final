import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '../../../../lib/scope';
import { canCreateTasks, isSuperAdmin } from '../../../../lib/permissions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const shipperId = Number(id);

  if (isNaN(shipperId)) {
    return res.status(400).json({ error: 'Invalid shipper ID' });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const scope = getUserScope(user);

    const shipper = await prisma.logisticsShipper.findUnique({
      where: { id: shipperId },
      include: {
        venture: { select: { id: true, name: true } },
        loads: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            pickupCity: true,
            pickupState: true,
            dropCity: true,
            dropState: true,
            status: true,
            rate: true,
            createdAt: true,
          },
        },
      },
    });

    if (!shipper) {
      return res.status(404).json({ error: 'Shipper not found' });
    }

    if (!scope.ventureIds.includes(shipper.ventureId) && !scope.allVentures) {
      return res.status(403).json({ error: 'Not authorized for this venture' });
    }

    if (req.method === 'GET') {
      return res.json(shipper);
    }

    if (req.method === 'PATCH') {
      if (!canCreateTasks(user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { name, contactName, email, phone, city, state, country, notes, isActive } = req.body;

      const updated = await prisma.logisticsShipper.update({
        where: { id: shipperId },
        data: {
          ...(name !== undefined && { name }),
          ...(contactName !== undefined && { contactName }),
          ...(email !== undefined && { email }),
          ...(phone !== undefined && { phone }),
          ...(city !== undefined && { city }),
          ...(state !== undefined && { state }),
          ...(country !== undefined && { country }),
          ...(notes !== undefined && { notes }),
          ...(isActive !== undefined && { isActive }),
        },
        include: {
          venture: { select: { id: true, name: true } },
        },
      });

      return res.json(updated);
    }

    if (req.method === 'DELETE') {
      if (!isSuperAdmin(user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      await prisma.logisticsShipper.update({
        where: { id: shipperId },
        data: { isActive: false },
      });

      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Shipper detail API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
