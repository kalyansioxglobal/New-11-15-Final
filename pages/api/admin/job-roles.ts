import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { canManageUsers } from '@/lib/permissions';

type JobDepartmentData = {
  id: number;
  name: string;
  ventureType: string | null;
  jobRoles: {
    id: number;
    name: string;
    isManager: boolean;
  }[];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  if (!canManageUsers(user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const departments = await prisma.jobDepartment.findMany({
      include: {
        jobRoles: {
          select: {
            id: true,
            name: true,
            isManager: true,
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: [
        { ventureType: 'asc' },
        { name: 'asc' },
      ],
    });

    const response: JobDepartmentData[] = departments.map((d: any) => ({
      id: d.id,
      name: d.name,
      ventureType: d.ventureType,
      jobRoles: d.jobRoles,
    }));

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching job roles:', error);
    return res.status(500).json({ error: 'Failed to fetch job roles' });
  }
}
