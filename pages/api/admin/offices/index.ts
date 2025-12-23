import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { isSuperAdmin } from '../../../../lib/permissions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  try {
    if (!isSuperAdmin(user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (req.method === 'GET') {
      const offices = await prisma.office.findMany({
        include: {
          venture: { select: { id: true, name: true } },
          _count: { select: { users: true } },
        },
        orderBy: { name: 'asc' },
      });

      return res.json(offices);
    }

    if (req.method === 'POST') {
      const { name, ventureId, city, country, timezone } = req.body;

      if (!name || !ventureId) {
        return res.status(400).json({ error: 'Name and ventureId are required' });
      }

      const office = await prisma.office.create({
        data: {
          name,
          ventureId: Number(ventureId),
          city: city || null,
          country: country || null,
          timezone: timezone || null,
        },
        include: {
          venture: { select: { name: true } },
          _count: { select: { users: true } },
        },
      });

      return res.status(201).json(office);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Offices API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
