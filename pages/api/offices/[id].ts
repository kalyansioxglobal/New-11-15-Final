import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '@/lib/scope';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const { id } = req.query;
  const officeId = Number(id);

  if (!officeId || Number.isNaN(officeId)) {
    return res.status(400).json({ error: 'INVALID_ID' });
  }

  const user = await requireUser(req, res);
  if (!user) {
    return res.status(401).json({ error: 'UNAUTHENTICATED' });
  }

  const office = await prisma.office.findUnique({
    where: { id: officeId },
    include: {
      venture: true,
      tasks: {
        orderBy: { dueDate: 'asc' },
        take: 10,
      },
      policies: {
        orderBy: { endDate: 'asc' },
        take: 10,
      },
    },
  });

  if (!office) {
    return res.status(404).json({ error: 'NOT_FOUND' });
  }

  const scope = getUserScope(user);

  if (!scope.allOffices && !scope.officeIds.includes(office.id)) {
    return res.status(403).json({ error: 'FORBIDDEN_OFFICE' });
  }

  return res.status(200).json({ office });
}
