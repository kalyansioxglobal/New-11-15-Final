import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '../../../../lib/scope';
import { isSuperAdmin } from '../../../../lib/permissions';

const ALLOWED_ROLES = ["CEO", "ADMIN", "COO", "FINANCE"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  if (!ALLOWED_ROLES.includes(user.role)) {
    return res.status(403).json({ error: 'Forbidden - insufficient role permissions' });
  }

  try {
    const scope = getUserScope(user);
    const ventureId = req.query.ventureId ? Number(req.query.ventureId) : undefined;
    const type = req.query.type as string | undefined;

    if (req.method === 'GET') {
      const where: any = {
        isActive: true,
      };

      if (ventureId) {
        where.ventureId = ventureId;
      } else if (!scope.allVentures) {
        where.OR = [
          { ventureId: { in: scope.ventureIds } },
          { ventureId: null },
        ];
      }

      if (type) {
        where.type = type;
      }

      const assets = await prisma.holdingAsset.findMany({
        where,
        include: {
          venture: { select: { id: true, name: true } },
        },
        orderBy: { name: 'asc' },
      });

      const totalValue = assets.reduce(
        (sum: number, a: (typeof assets)[number]) => sum + (a.valueEstimate || 0),
        0,
      );

      return res.json({
        assets,
        summary: {
          totalAssets: assets.length,
          totalValue,
          byType: assets.reduce((acc: Record<string, number>, a: (typeof assets)[number]) => {
            acc[a.type] = (acc[a.type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
        },
      });
    }

    if (req.method === 'POST') {
      if (!isSuperAdmin(user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { name, type: bodyType, location, valueEstimate, acquiredDate, notes } = req.body;
      const targetVentureId = req.body.ventureId ? Number(req.body.ventureId) : ventureId;

      if (!name || !bodyType) {
        return res.status(400).json({ error: 'name and type are required' });
      }

      if (targetVentureId && !scope.ventureIds.includes(targetVentureId) && !scope.allVentures) {
        return res.status(403).json({ error: 'Not authorized for this venture' });
      }

      const asset = await prisma.holdingAsset.create({
        data: {
          ventureId: targetVentureId || null,
          name,
          type: bodyType,
          location,
          valueEstimate: valueEstimate ? Number(valueEstimate) : null,
          acquiredDate: acquiredDate ? new Date(acquiredDate) : null,
          notes,
        },
        include: {
          venture: { select: { id: true, name: true } },
        },
      });

      return res.status(201).json(asset);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Holdings Assets API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
