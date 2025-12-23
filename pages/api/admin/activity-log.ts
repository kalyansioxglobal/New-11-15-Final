import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';

const LEADERSHIP_ROLES = ['CEO', 'ADMIN', 'COO', 'AUDITOR'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  if (!LEADERSHIP_ROLES.includes(user.role)) {
    return res.status(403).json({ error: 'Forbidden - Leadership access required' });
  }

  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(10, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const userId = req.query.userId ? Number(req.query.userId) : undefined;
    const action = req.query.action ? String(req.query.action) : undefined;
    const moduleFilter = req.query.module ? String(req.query.module) : undefined;
    const entityType = req.query.entityType ? String(req.query.entityType) : undefined;
    const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : undefined;
    const endDate = req.query.endDate ? new Date(String(req.query.endDate)) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;

    const where: Record<string, unknown> = {};

    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (moduleFilter) where.module = moduleFilter;
    if (entityType) where.entityType = entityType;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, Date>).gte = startDate;
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        (where.createdAt as Record<string, Date>).lte = endOfDay;
      }
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { entityId: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [logs, totalCount] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, fullName: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.activityLog.count({ 
        where,
      }),
    ]);

    const distinctActions = await prisma.activityLog.findMany({
      select: { action: true },
      distinct: ['action'],
      orderBy: { action: 'asc' },
    });

    const distinctModules = await prisma.activityLog.findMany({
      select: { module: true },
      distinct: ['module'],
      orderBy: { module: 'asc' },
    });

    const distinctEntityTypes = await prisma.activityLog.findMany({
      select: { entityType: true },
      distinct: ['entityType'],
      orderBy: { entityType: 'asc' },
    });

    return res.json({
      logs: logs.map((log: any) => ({
        id: log.id,
        userId: log.userId,
        userName: log.user?.fullName || 'Unknown',
        userEmail: log.user?.email || '',
        userRole: log.user?.role || '',
        action: log.action,
        module: log.module,
        entityType: log.entityType,
        entityId: log.entityId,
        description: log.description,
        metadata: log.metadata,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: log.createdAt,
      })),
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      filters: {
        actions: distinctActions.map((a: any) => a.action),
        modules: distinctModules.map((m: any) => m.module),
        entityTypes: distinctEntityTypes.map((e: any) => e.entityType),
      },
    });
  } catch (err) {
    console.error('Activity log error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
