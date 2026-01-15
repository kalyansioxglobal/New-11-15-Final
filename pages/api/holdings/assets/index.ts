import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '../../../../lib/scope';
const ALLOWED_ROLES = ["CEO", "ADMIN", "COO", "FINANCE"];
const WRITE_ROLES = ["CEO", "ADMIN", "FINANCE"]; // Roles that can perform CRUD operations

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  if (!ALLOWED_ROLES.includes(user.role)) {
    return res.status(403).json({ error: 'Forbidden - insufficient role permissions' });
  }

  try {
    const scope = getUserScope(user);

    if (req.method === 'GET') {
      // Validate and parse pagination parameters
      const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 30;
      const page = Math.max(Number(req.query.page) || 1, 1);
      
      // Validate pagination parameters
      if (isNaN(page) || page < 1) {
        return res.status(400).json({ error: 'Invalid page parameter. Must be a positive integer.' });
      }
      if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
        return res.status(400).json({ error: 'Invalid pageSize parameter. Must be between 1 and 100.' });
      }
      
      // Validate ventureId if provided
      let ventureId: number | undefined;
      if (req.query.ventureId) {
        ventureId = Number(req.query.ventureId);
        if (isNaN(ventureId) || ventureId < 1) {
          return res.status(400).json({ error: 'Invalid ventureId parameter. Must be a positive integer.' });
        }
      }
      
      const type = req.query.type as string | undefined;
      const limit = pageSize;
      const skip = (page - 1) * limit;
    
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
    
      // Fetch paginated assets + total count in parallel
      const [assets, totalCount] = await Promise.all([
        prisma.holdingAsset.findMany({
          where,
          include: {
            venture: { select: { id: true, name: true } },
          },
          orderBy: { name: 'asc' },
          skip,
          take: limit,
        }),
        prisma.holdingAsset.count({ where }),
      ]);
    
      const totalValue = assets.reduce(
        (sum: number, a: (typeof assets)[number]) =>
          sum + (a.valueEstimate || 0),
        0
      );
    
      return res.json({
        assets,
        summary: {
          totalAssets: totalCount,
          totalValue,
          byType: assets.reduce(
            (acc: Record<string, number>, a: (typeof assets)[number]) => {
              acc[a.type] = (acc[a.type] || 0) + 1;
              return acc;
            },
            {}
          ),
        },
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNextPage: skip + assets.length < totalCount,
          hasPrevPage: page > 1,
        },
      });
    }    

    if (req.method === 'POST') {
      if (!WRITE_ROLES.includes(user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { name, type: bodyType, location, valueEstimate, acquiredDate, notes } = req.body;
      const targetVentureId = req.body.ventureId ? Number(req.body.ventureId) : null;

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
