import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { canViewPolicy, canManagePolicy, SessionUser } from '../../../../lib/scope';
import { InsurancePolicy } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  const id = Number(req.query.id);
  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  const policy = await prisma.insurancePolicy.findUnique({ where: { id } });
  if (!policy) return res.status(404).json({ error: 'Policy not found' });

  if (!canViewPolicy(user, policy)) {
    return res.status(403).json({ error: 'Not allowed to view this policy' });
  }

  try {
    switch (req.method) {
      case 'GET':
        return res.json(policy);
      case 'PUT':
      case 'PATCH':
        return updatePolicy(req, res, user, policy);
      case 'DELETE':
        return deletePolicy(req, res, user, policy);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    console.error('Insurance policy detail API error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function updatePolicy(
  req: NextApiRequest,
  res: NextApiResponse,
  user: SessionUser,
  policy: InsurancePolicy
) {
  if (!canManagePolicy(user, policy.ventureId)) {
    return res.status(403).json({ error: 'Not allowed to update this policy' });
  }

  const {
    name,
    provider,
    policyNumber,
    coverageType,
    fileUrl,
    startDate,
    endDate,
    status,
  } = req.body;

  const updated = await prisma.insurancePolicy.update({
    where: { id: policy.id },
    data: {
      name: name ?? undefined,
      provider: provider ?? undefined,
      policyNumber: policyNumber ?? undefined,
      coverageType: coverageType ?? undefined,
      fileUrl: fileUrl ?? undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status: status ?? undefined,
    },
  });

  return res.json(updated);
}

async function deletePolicy(
  req: NextApiRequest,
  res: NextApiResponse,
  user: SessionUser,
  policy: InsurancePolicy
) {
  if (!canManagePolicy(user, policy.ventureId)) {
    return res.status(403).json({ error: 'Not allowed to delete this policy' });
  }

  await prisma.insurancePolicy.delete({ where: { id: policy.id } });
  return res.status(204).end();
}
