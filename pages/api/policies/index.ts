import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '@/lib/scope';
import { canEditPolicies } from '@/lib/permissions';

function getQueryParamValue(param: string | string[] | undefined): string | undefined {
  if (typeof param === 'string') {
    return param;
  }
  if (Array.isArray(param) && param.length > 0) {
    return String(param[0]);
  }
  return undefined;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return res.status(401).json({ error: 'UNAUTHENTICATED' });

  const scope = getUserScope(user);

  if (req.method === 'GET') {
    // Parse pagination parameters
    const { page: rawPage, pageSize: rawPageSize, deletedOnly: deletedOnlyRaw } = req.query;
    const page = Number(rawPage || 1);
    const pageSize = Number(rawPageSize || 20);

    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safePageSize =
      Number.isFinite(pageSize) && pageSize > 0 && pageSize <= 200 ? pageSize : 20;

    const skip = (safePage - 1) * safePageSize;
    const take = safePageSize;

    // Determine if we're showing deleted policies
    const deletedOnlyValue = getQueryParamValue(deletedOnlyRaw);
    const showDeleted = deletedOnlyValue === 'true';

    const where: any = {
      isTest: user.isTestUser,
      isDeleted: showDeleted, // Show deleted if deletedOnly=true, otherwise show non-deleted
    };

    if (!scope.allVentures) {
      where.ventureId = { in: scope.ventureIds };
    }

    const now = new Date();

    // Build where clauses for active and expired policies
    const activeWhere = {
      ...where,
      OR: [
        { endDate: null },
        { endDate: { gt: now } },
      ],
    };

    const expiredWhere = {
      ...where,
      endDate: { lt: now },
    };

    // Fetch active and expired policies separately to ensure proper ordering
    const [activePolicies, expiredPolicies] = await Promise.all([
      prisma.policy.findMany({
        where: activeWhere,
        orderBy: { endDate: 'asc' },
        include: {
          venture: true,
          office: true,
        },
      }),
      prisma.policy.findMany({
        where: expiredWhere,
        orderBy: { endDate: 'asc' },
        include: {
          venture: true,
          office: true,
        },
      }),
    ]);

    // Sort active policies: null endDate first, then by endDate ascending
    activePolicies.sort((a, b) => {
      if (!a.endDate && !b.endDate) return 0;
      if (!a.endDate) return -1; // null comes first
      if (!b.endDate) return 1; // null comes first
      return a.endDate.getTime() - b.endDate.getTime();
    });

    // Combine: active first, then expired
    const allPolicies = [...activePolicies, ...expiredPolicies];

    // Get total count for pagination
    const total = allPolicies.length;

    // Apply pagination to the combined sorted list
    const paginatedPolicies = allPolicies.slice(skip, skip + take);

    const in30Days = new Date();
    in30Days.setDate(now.getDate() + 30);

    return res.status(200).json({
      items: paginatedPolicies.map((p) => {
        const isExpiringSoon =
          p.endDate && p.endDate > now && p.endDate <= in30Days;
        const isExpired = p.endDate && p.endDate < now;

        return {
          id: p.id,
          name: p.name,
          type: p.type,
          provider: p.provider,
          policyNo: p.policyNo,
          status: p.status,
          startDate: p.startDate,
          endDate: p.endDate,
          ventureName: p.venture?.name ?? null,
          officeName: p.office?.name ?? null,
          isExpiringSoon,
          isExpired,
          daysToExpiry: p.endDate
            ? Math.ceil((p.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : null,
        };
      }),
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.ceil(total / safePageSize),
    });
  }

  if (req.method === 'POST') {
    if (!canEditPolicies(user.role)) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    const {
      name,
      type,
      provider,
      policyNo,
      status,
      startDate,
      endDate,
      ventureId,
      officeId,
      fileUrl,
      notes,
    } = req.body as {
      name: string;
      type: string;
      provider?: string;
      policyNo?: string;
      status?: string;
      startDate?: string | null;
      endDate?: string | null;
      ventureId: number;
      officeId?: number | null;
      fileUrl?: string;
      notes?: string;
    };

    if (!name) return res.status(400).json({ error: 'NAME_REQUIRED' });
    if (!type) return res.status(400).json({ error: 'TYPE_REQUIRED' });
    if (!ventureId) return res.status(400).json({ error: 'VENTURE_REQUIRED' });

    if (!scope.allVentures && !scope.ventureIds.includes(ventureId)) {
      return res.status(403).json({ error: 'FORBIDDEN_VENTURE' });
    }
    if (officeId && !scope.allOffices && !scope.officeIds.includes(officeId)) {
      return res.status(403).json({ error: 'FORBIDDEN_OFFICE' });
    }

    const policy = await prisma.policy.create({
      data: {
        name,
        type: type as any,
        provider: provider || null,
        policyNo: policyNo || null,
        status: (status as any) || 'ACTIVE',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        ventureId,
        officeId: officeId || null,
        fileUrl: fileUrl || null,
        notes: notes || null,
        createdBy: user.id,
        isTest: user.isTestUser,
      },
    });

    return res.status(201).json({ id: policy.id });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end();
}
