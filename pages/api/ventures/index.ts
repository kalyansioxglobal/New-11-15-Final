import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { getEffectiveUser } from '@/lib/effectiveUser';
import { getUserScope } from '@/lib/scope';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getEffectiveUser(req, res);
  if (!user) return res.status(401).json({ error: 'UNAUTHENTICATED' });

  const scope = getUserScope(user);
  const { id, limit, types, includeTest } = req.query;

  const { withRequestLogging } = await import("@/lib/requestLog");

  const where: any = {};

  // Scope by ID if requested
  if (id) {
    where.id = Number(id);
  } else if (!scope.allVentures && scope.ventureIds.length > 0) {
    where.id = { in: scope.ventureIds };
  }

  // Optional type filter: /api/ventures?types=LOGISTICS,TRANSPORT
  if (types) {
    const typeList = String(types)
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (typeList.length > 0) {
      where.type = { in: typeList as any };
    }
  }

  // Filter by test mode - if includeTest is not 'true', exclude test ventures
  if (includeTest !== 'true') {
    where.isTest = false;
  }

  const pageNum = 1;
  const DEFAULT_PAGE_SIZE = 50;
  const MAX_PAGE_SIZE = 200;

  const take = limit ? Math.min(MAX_PAGE_SIZE, Number(limit)) : DEFAULT_PAGE_SIZE;

  const ventures = await prisma.venture.findMany({
    where,
    orderBy: { name: 'asc' },
    take,
    select: {
      id: true,
      name: true,
      type: true,
      logisticsRole: true,
      offices: {
        select: {
          id: true,
          name: true,
          city: true,
        },
      },
      hotels: {
        select: {
          id: true,
          name: true,
          rooms: true,
        },
      },
    },
  });

  if (id) {
    const venture = ventures[0] || null;
    // If specific ID requested but not found, check if it exists but user doesn't have access
    if (!venture) {
      const exists = await prisma.venture.findUnique({
        where: { id: Number(id) },
        select: { id: true },
      });
      if (exists) {
        // Venture exists but user doesn't have access
        return res.status(403).json({ error: "Forbidden: Access denied to this venture" });
      }
    }
    return res.status(200).json({ venture });
  }

  // Keep response shape for list as raw array to avoid breaking callers,

  withRequestLogging(req, res, { user, ventureId: null, officeId: null }, {
    endpoint: "/ventures",
    page: null,
    pageSize: take,
    dateFrom: null,
    dateTo: null,
  });

  // but ensure the query is safely bounded via `take` above.
  return res.status(200).json(ventures);
}
