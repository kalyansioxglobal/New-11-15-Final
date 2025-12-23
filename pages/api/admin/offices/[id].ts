import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { isSuperAdmin } from '../../../../lib/permissions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const officeId = Number(id);

  if (isNaN(officeId)) {
    return res.status(400).json({ error: 'Invalid office ID' });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    if (!isSuperAdmin(user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (req.method === 'GET') {
      const office = await prisma.office.findUnique({
        where: { id: officeId },
        include: {
          venture: { select: { id: true, name: true } },
          users: {
            include: {
              user: { select: { id: true, fullName: true, email: true, role: true } },
            },
          },
        },
      });

      if (!office) {
        return res.status(404).json({ error: 'Office not found' });
      }

      return res.json(office);
    }

    if (req.method === 'PATCH') {
      const { name, ventureId, city, country, timezone } = req.body;

      const updated = await prisma.office.update({
        where: { id: officeId },
        data: {
          ...(name !== undefined && { name }),
          ...(ventureId !== undefined && { ventureId: Number(ventureId) }),
          ...(city !== undefined && { city }),
          ...(country !== undefined && { country }),
          ...(timezone !== undefined && { timezone }),
        },
        include: {
          venture: { select: { name: true } },
          _count: { select: { users: true } },
        },
      });

      return res.json(updated);
    }

    if (req.method === 'DELETE') {
      const usersCount = await prisma.officeUser.count({
        where: { officeId },
      });

      if (usersCount > 0) {
        return res.status(400).json({
          error: 'Cannot delete office with assigned users. Reassign users first.',
        });
      }

      await prisma.office.delete({
        where: { id: officeId },
      });

      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Office detail API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
