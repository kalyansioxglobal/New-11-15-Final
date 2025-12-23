import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '@/lib/scope';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end();
  }

  const user = await requireUser(req, res);
  if (!user) return res.status(401).json({ error: 'UNAUTHENTICATED' });

  const scope = getUserScope(user);
  const { ventureId, includeTest } = req.query;

  const where: any = {};

  if (!scope.allOffices && scope.officeIds.length > 0) {
    where.id = { in: scope.officeIds };
  }

  if (ventureId) {
    where.ventureId = Number(ventureId);
  }

  if (includeTest !== 'true') {
    where.isTest = false;
  }

  const offices = await prisma.office.findMany({
    where,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      city: true,
      ventureId: true,
      isTest: true,
    },
  });

  res.status(200).json(offices);
}
