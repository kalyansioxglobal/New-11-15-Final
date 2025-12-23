import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { canManageUsers } from '@/lib/permissions';
import type { UserRole } from '@/lib/permissions';
import { logActivity, ACTIVITY_ACTIONS, ACTIVITY_MODULES } from '@/lib/activityLog';

// Department is treated as a simple string label here to avoid coupling to
// Prisma's generated enum type.
type Department = string;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const current = await requireUser(req, res);
  if (!current) return;
  if (!canManageUsers(current.role)) return res.status(403).json({ error: 'FORBIDDEN' });

  const { id } = req.query;
  const userId = Number(id);

  if (!userId || Number.isNaN(userId)) {
    return res.status(400).json({ error: 'INVALID_ID' });
  }

  if (req.method === 'GET') {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ventures: true,
        offices: true,
        jobDepartment: true,
        jobRole: true,
      },
    });
    if (!u) return res.status(404).json({ error: 'NOT_FOUND' });

    return res.status(200).json({
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
    });
  }

  if (req.method === 'PATCH') {
    const {
      name,
      email,
      phone,
      phoneUs,
      phoneIn,
      extension,
      alias,
      role,
      legacyDepartment,
      jobDepartmentId,
      jobRoleId,
      isActive,
      isTestUser,
      ventureIds,
      officeIds,
      reportsToId,
    } = req.body as {
      name?: string;
      email?: string;
      phone?: string | null;
      phoneUs?: string | null;
      phoneIn?: string | null;
      extension?: string | null;
      alias?: string | null;
      role?: UserRole;
      legacyDepartment?: Department | null;
      jobDepartmentId?: number | null;
      jobRoleId?: number | null;
      isActive?: boolean;
      isTestUser?: boolean;
      ventureIds?: number[];
      officeIds?: number[];
      reportsToId?: number | null;
    };

    if (alias !== undefined && alias !== null && alias !== '') {
      const existingAlias = await prisma.user.findFirst({
        where: { alias, id: { not: userId } },
      });
      if (existingAlias) {
        return res.status(400).json({ error: 'ALIAS_EXISTS' });
      }
    }

    if (reportsToId !== undefined && reportsToId !== null) {
      if (reportsToId === userId) {
        return res.status(400).json({ error: 'CANNOT_REPORT_TO_SELF' });
      }
      
      let currentManagerId: number | null = reportsToId;
      const visited = new Set<number>([userId]);
      while (currentManagerId) {
        if (visited.has(currentManagerId)) {
          return res.status(400).json({ error: 'CIRCULAR_REPORTING_CHAIN' });
        }
        visited.add(currentManagerId);
        const manager = await prisma.user.findUnique({
          where: { id: currentManagerId },
          select: { reportsToId: true },
        });
        currentManagerId = manager?.reportsToId ?? null;
      }
    }

    const updated = await prisma.$transaction(async (tx: any) => {
      const u = await tx.user.update({
        where: { id: userId },
        data: {
          fullName: name,
          email,
          phone: phone !== undefined ? phone : undefined,
          phoneUs: phoneUs !== undefined ? phoneUs : undefined,
          phoneIn: phoneIn !== undefined ? phoneIn : undefined,
          extension: extension !== undefined ? extension : undefined,
          alias: alias !== undefined ? (alias || null) : undefined,
          role,
          legacyDepartment: legacyDepartment ?? undefined,
          jobDepartmentId: jobDepartmentId !== undefined ? jobDepartmentId : undefined,
          jobRoleId: jobRoleId !== undefined ? jobRoleId : undefined,
          isActive,
          isTestUser,
          reportsToId: reportsToId !== undefined ? reportsToId : undefined,
        },
      });

      if (Array.isArray(ventureIds)) {
        await tx.ventureUser.deleteMany({ where: { userId } });
        if (ventureIds.length > 0) {
          await tx.ventureUser.createMany({
            data: ventureIds.map((vId) => ({ userId, ventureId: vId })),
            skipDuplicates: true,
          });
        }
      }

      if (Array.isArray(officeIds)) {
        await tx.officeUser.deleteMany({ where: { userId } });
        if (officeIds.length > 0) {
          await tx.officeUser.createMany({
            data: officeIds.map((oId) => ({ userId, officeId: oId })),
            skipDuplicates: true,
          });
        }
      }

      return u;
    });

    await logActivity({
      userId: current.id,
      action: ACTIVITY_ACTIONS.UPDATE,
      module: ACTIVITY_MODULES.ADMIN,
      entityType: 'User',
      entityId: String(userId),
      description: `Updated user: ${updated.email}`,
      metadata: { 
        updatedFields: Object.keys(req.body),
        updatedBy: current.email
      },
      req,
    });

    return res.status(200).json({ id: updated.id });
  }

  res.setHeader('Allow', ['GET', 'PATCH']);
  return res.status(405).end();
}
