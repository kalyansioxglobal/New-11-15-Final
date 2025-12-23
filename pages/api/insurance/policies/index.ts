import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { policyWhereForUser, canManagePolicy, SessionUser } from '../../../../lib/scope';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  try {
    switch (req.method) {
      case 'GET':
        return getPolicies(req, res, user);
      case 'POST':
        return createPolicy(req, res, user);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    console.error('Insurance policy API error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getPolicies(req: NextApiRequest, res: NextApiResponse, user: SessionUser) {
  const where = policyWhereForUser(user);

  const policies = await prisma.insurancePolicy.findMany({
    where,
    include: {
      venture: { select: { id: true, name: true, type: true } },
      createdBy: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { endDate: 'asc' },
  });

  return res.json(policies);
}

async function createPolicy(req: NextApiRequest, res: NextApiResponse, user: SessionUser) {
  const {
    ventureId,
    name,
    provider,
    policyNumber,
    coverageType,
    fileUrl,
    startDate,
    endDate,
    status,
  } = req.body;

  if (!ventureId || !name || !fileUrl) {
    return res.status(400).json({ error: 'ventureId, name, fileUrl are required' });
  }

  if (!canManagePolicy(user, Number(ventureId))) {
    return res.status(403).json({ error: 'Not allowed to create policies for this venture' });
  }

  const policy = await prisma.insurancePolicy.create({
    data: {
      ventureId: Number(ventureId),
      name,
      provider: provider ?? null,
      policyNumber: policyNumber ?? null,
      coverageType: coverageType ?? null,
      fileUrl,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      status: status ?? 'Active',
      createdById: user.id,
    },
  });

  return res.status(201).json(policy);
}
