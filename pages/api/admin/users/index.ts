import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { canManageUsers } from '@/lib/permissions';
import { UserRole, Department } from '@prisma/client';
import { logActivity, ACTIVITY_ACTIONS, ACTIVITY_MODULES } from '@/lib/activityLog';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return res.status(401).json({ error: 'UNAUTHENTICATED' });
  if (!canManageUsers(user.role)) return res.status(403).json({ error: 'FORBIDDEN' });

  if (req.method === 'GET') {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
    const skip = (page - 1) * limit;
    const search = req.query.search ? String(req.query.search) : undefined;

    const where = search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { email: 'asc' },
        skip,
        take: limit,
        include: {
          ventures: { include: { venture: true } },
          offices: { include: { office: true } },
          jobDepartment: true,
          jobRole: true,
          reportsTo: { select: { id: true, fullName: true, email: true, role: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return res.status(200).json({
      users: users.map((u: any) => ({
        id: u.id,
        name: u.fullName,
        email: u.email,
        phone: u.phone,
        phoneUs: u.phoneUs,
        phoneIn: u.phoneIn,
        extension: u.extension,
        alias: u.alias,
        role: u.role,
        legacyDepartment: u.legacyDepartment,
        jobDepartmentId: u.jobDepartmentId,
        jobDepartmentName: u.jobDepartment?.name ?? null,
        jobRoleId: u.jobRoleId,
        jobRoleName: u.jobRole?.name ?? null,
        isActive: u.isActive,
        isTestUser: u.isTestUser,
        ventureIds: u.ventures.map((v: any) => v.ventureId),
        officeIds: u.offices.map((o: any) => o.officeId),
        ventures: u.ventures,
        offices: u.offices,
        reportsToId: u.reportsToId,
        reportsToName: u.reportsTo?.fullName ?? null,
        reportsToEmail: u.reportsTo?.email ?? null,
      })),
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    });
  }

  if (req.method === 'POST') {
    const { 
      name, email, role, legacyDepartment, jobDepartmentId, jobRoleId,
      phone, phoneUs, phoneIn, extension, alias 
    } = req.body as {
      name: string;
      email: string;
      role: UserRole;
      legacyDepartment?: Department | null;
      jobDepartmentId?: number | null;
      jobRoleId?: number | null;
      phone?: string | null;
      phoneUs?: string | null;
      phoneIn?: string | null;
      extension?: string | null;
      alias?: string | null;
    };

    if (!email) {
      return res.status(400).json({ error: 'EMAIL_REQUIRED' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'EMAIL_EXISTS' });
    }

    if (alias) {
      const existingAlias = await prisma.user.findUnique({ where: { alias } });
      if (existingAlias) {
        return res.status(400).json({ error: 'ALIAS_EXISTS' });
      }
    }

    const created = await prisma.user.create({
      data: {
        fullName: name || email.split('@')[0],
        email,
        role: role || UserRole.EMPLOYEE,
        legacyDepartment: legacyDepartment ?? null,
        jobDepartmentId: jobDepartmentId ?? null,
        jobRoleId: jobRoleId ?? null,
        phone: phone ?? null,
        phoneUs: phoneUs ?? null,
        phoneIn: phoneIn ?? null,
        extension: extension ?? null,
        alias: alias ?? null,
        isActive: true,
        isTestUser: false,
      },
    });

    await logActivity({
      userId: user.id,
      action: ACTIVITY_ACTIONS.CREATE,
      module: ACTIVITY_MODULES.ADMIN,
      entityType: 'User',
      entityId: String(created.id),
      description: `Created user: ${email}`,
      metadata: { email, role: role || 'EMPLOYEE', createdBy: user.email },
      req,
    });

    return res.status(201).json({ id: created.id });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end();
}
