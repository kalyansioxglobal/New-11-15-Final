import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '@/lib/scope';
import { canEditPolicies } from '@/lib/permissions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return res.status(401).json({ error: 'UNAUTHENTICATED' });

  const { id } = req.query;
  const policyId = Number(id);
  if (isNaN(policyId)) return res.status(400).json({ error: 'INVALID_ID' });

  const policy = await prisma.policy.findUnique({
    where: { id: policyId },
    include: {
      venture: true,
      office: true,
      creator: true,
    },
  });

  if (!policy) return res.status(404).json({ error: 'NOT_FOUND' });

  if (policy.isTest !== user.isTestUser) {
    return res.status(403).json({ error: 'FORBIDDEN_CONTEXT' });
  }

  const scope = getUserScope(user);

  if (!scope.allVentures && !scope.ventureIds.includes(policy.ventureId)) {
    return res.status(403).json({ error: 'FORBIDDEN_VENTURE' });
  }
  if (
    policy.officeId &&
    !scope.allOffices &&
    !scope.officeIds.includes(policy.officeId)
  ) {
    return res.status(403).json({ error: 'FORBIDDEN_OFFICE' });
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      id: policy.id,
      name: policy.name,
      type: policy.type,
      provider: policy.provider,
      policyNo: policy.policyNo,
      status: policy.status,
      startDate: policy.startDate,
      endDate: policy.endDate,
      fileUrl: policy.fileUrl,
      notes: policy.notes,
      ventureId: policy.ventureId,
      ventureName: policy.venture?.name ?? null,
      officeId: policy.officeId,
      officeName: policy.office?.name ?? null,
      createdByName: policy.creator?.fullName ?? null,
      isTest: policy.isTest,
    });
  }

  if (req.method === 'PATCH') {
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
      fileUrl,
      notes,
    } = req.body as {
      name?: string;
      type?: string;
      provider?: string | null;
      policyNo?: string | null;
      status?: string;
      startDate?: string | null;
      endDate?: string | null;
      fileUrl?: string | null;
      notes?: string | null;
    };

    const updated = await prisma.policy.update({
      where: { id: policyId },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type: type as any }),
        ...(provider !== undefined && { provider }),
        ...(policyNo !== undefined && { policyNo }),
        ...(status !== undefined && { status: status as any }),
        ...(startDate !== undefined && {
          startDate: startDate ? new Date(startDate) : null,
        }),
        ...(endDate !== undefined && {
          endDate: endDate ? new Date(endDate) : null,
        }),
        ...(fileUrl !== undefined && { fileUrl }),
        ...(notes !== undefined && { notes }),
      },
    });

    return res.status(200).json({ id: updated.id });
  }

  res.setHeader('Allow', ['GET', 'PATCH']);
  return res.status(405).end();
}
