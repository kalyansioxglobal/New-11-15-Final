import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '../../../../lib/scope';
import { isSuperAdmin } from '../../../../lib/permissions';

const ALLOWED_ROLES = ["CEO", "ADMIN", "COO", "FINANCE"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const assetId = Number(id);

  if (isNaN(assetId)) {
    return res.status(400).json({ error: 'Invalid asset ID' });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  if (!ALLOWED_ROLES.includes(user.role)) {
    return res.status(403).json({ error: 'Forbidden - insufficient role permissions' });
  }

  try {
    const scope = getUserScope(user);

    const asset = await prisma.holdingAsset.findUnique({
      where: { id: assetId },
      include: {
        venture: { select: { id: true, name: true } },
      },
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    if (asset.ventureId && !scope.ventureIds.includes(asset.ventureId) && !scope.allVentures) {
      return res.status(403).json({ error: 'Not authorized for this venture' });
    }

    if (req.method === 'GET') {
      return res.json(asset);
    }

    if (req.method === 'PATCH') {
      if (!isSuperAdmin(user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { name, type, location, valueEstimate, acquiredDate, notes, isActive } = req.body;

      const updated = await prisma.holdingAsset.update({
        where: { id: assetId },
        data: {
          ...(name !== undefined && { name }),
          ...(type !== undefined && { type }),
          ...(location !== undefined && { location }),
          ...(valueEstimate !== undefined && { valueEstimate: valueEstimate ? Number(valueEstimate) : null }),
          ...(acquiredDate !== undefined && { acquiredDate: acquiredDate ? new Date(acquiredDate) : null }),
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

      await prisma.holdingAsset.update({
        where: { id: assetId },
        data: { isActive: false },
      });

      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Holdings Asset detail API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
