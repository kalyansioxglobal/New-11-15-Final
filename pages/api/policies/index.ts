import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '@/lib/scope';
import { canEditPolicies } from '@/lib/permissions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return res.status(401).json({ error: 'UNAUTHENTICATED' });

  const scope = getUserScope(user);

  if (req.method === 'GET') {
    const where: any = {
      isTest: user.isTestUser,
    };

    if (!scope.allVentures) {
      where.ventureId = { in: scope.ventureIds };
    }

    const policies = await prisma.policy.findMany({
      where,
      orderBy: { endDate: 'asc' },
      include: {
        venture: true,
        office: true,
      },
    });

    const now = new Date();
    const in30Days = new Date();
    in30Days.setDate(now.getDate() + 30);

    return res.status(200).json(
      policies.map((p) => {
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
      })
    );
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
