import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { canManageUsers } from '@/lib/permissions';
import { UserRole } from '@prisma/client';

// Department and VentureType are treated as simple string identifiers here to
// avoid tight coupling to Prisma's generated enum types.
type Department = string;
type VentureType = string;

type TestUserDef = {
  role: UserRole;
  department: Department | null;
  name: string;
  ventureType?: VentureType;
};

const TEST_USERS: TestUserDef[] = [
  { role: 'CEO', department: 'MANAGEMENT', name: 'CEO Test' },
  { role: 'ADMIN', department: 'OPERATIONS', name: 'Admin Test' },
  { role: 'COO', department: 'MANAGEMENT', name: 'COO Test' },
  { role: 'VENTURE_HEAD', department: 'OPERATIONS', name: 'Logistics Head Test', ventureType: 'LOGISTICS' },
  { role: 'VENTURE_HEAD', department: 'OPERATIONS', name: 'Hotel Head Test', ventureType: 'HOSPITALITY' },
  { role: 'OFFICE_MANAGER', department: 'OPERATIONS', name: 'Office Manager Test', ventureType: 'LOGISTICS' },
  { role: 'TEAM_LEAD', department: 'DISPATCH', name: 'Team Lead Test', ventureType: 'LOGISTICS' },
  { role: 'EMPLOYEE', department: 'DISPATCH', name: 'Dispatcher Test', ventureType: 'LOGISTICS' },
  { role: 'EMPLOYEE', department: 'CARRIER_TEAM', name: 'Carrier Team Test', ventureType: 'LOGISTICS' },
  { role: 'CONTRACTOR', department: null, name: 'Contractor Test' },
  { role: 'AUDITOR', department: null, name: 'Auditor Test' },
  { role: 'FINANCE', department: 'FINANCE', name: 'Finance Test' },
  { role: 'HR_ADMIN', department: 'HR', name: 'HR Admin Test' },
  { role: 'TEST_USER', department: null, name: 'Test User Test' },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Disabled in production" });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end();
  }

  const current = await requireUser(req, res);
  if (!current) return;
  if (!canManageUsers(current.role)) return res.status(403).json({ error: 'FORBIDDEN' });

  const allVentures = await prisma.venture.findMany({
    where: { isTest: true },
    include: { offices: { where: { isTest: true }, take: 1 } },
  });

  let logisticsVenture = allVentures.find((v: any) => v.type === 'LOGISTICS');
  let hotelVenture = allVentures.find((v: any) => v.type === 'HOSPITALITY');

  if (!logisticsVenture) {
    logisticsVenture = await prisma.venture.create({
      data: { name: 'Test Siox Logistics', type: 'LOGISTICS', isTest: true, isActive: true },
      include: { offices: true },
    });
    await prisma.office.create({
      data: { name: 'Test Siox Office', city: 'Test City', ventureId: logisticsVenture.id, isTest: true, isActive: true },
    });
    logisticsVenture = await prisma.venture.findUnique({
      where: { id: logisticsVenture.id },
      include: { offices: { where: { isTest: true }, take: 1 } },
    }) ?? undefined;
  }

  if (!hotelVenture) {
    hotelVenture = await prisma.venture.create({
      data: { name: 'Test Chokshi Hotels', type: 'HOSPITALITY', isTest: true, isActive: true },
      include: { offices: true },
    });
    await prisma.office.create({
      data: { name: 'Test Chokshi Office', city: 'Test City', ventureId: hotelVenture.id, isTest: true, isActive: true },
    });
    hotelVenture = await prisma.venture.findUnique({
      where: { id: hotelVenture.id },
      include: { offices: { where: { isTest: true }, take: 1 } },
    }) ?? undefined;
  }

  const logisticsOffice = logisticsVenture?.offices?.[0];
  const hotelOffice = hotelVenture?.offices?.[0];

  const created = await Promise.all(
    TEST_USERS.map(async (def, idx) => {
      const email = `test_${def.role.toLowerCase().replace('_', '')}${idx}@test.com`;
      const user = await prisma.user.upsert({
        where: { email },
        update: { role: def.role, isTestUser: true },
        create: {
          fullName: def.name,
          email,
          password: 'test123',
          role: def.role,
          isActive: true,
          isTestUser: true,
        },
      });

      let targetVenture = def.ventureType === 'HOSPITALITY' ? hotelVenture : logisticsVenture;
      let targetOffice = def.ventureType === 'HOSPITALITY' ? hotelOffice : logisticsOffice;

      if (['CEO', 'ADMIN', 'COO', 'AUDITOR', 'HR_ADMIN'].includes(def.role)) {
        if (logisticsVenture) {
          await prisma.ventureUser.upsert({
            where: { userId_ventureId: { userId: user.id, ventureId: logisticsVenture.id } },
            update: {},
            create: { userId: user.id, ventureId: logisticsVenture.id },
          });
        }
        if (hotelVenture) {
          await prisma.ventureUser.upsert({
            where: { userId_ventureId: { userId: user.id, ventureId: hotelVenture.id } },
            update: {},
            create: { userId: user.id, ventureId: hotelVenture.id },
          });
        }
      } else if (targetVenture) {
        await prisma.ventureUser.upsert({
          where: { userId_ventureId: { userId: user.id, ventureId: targetVenture.id } },
          update: {},
          create: { userId: user.id, ventureId: targetVenture.id },
        });
        if (targetOffice) {
          await prisma.officeUser.upsert({
            where: { userId_officeId: { userId: user.id, officeId: targetOffice.id } },
            update: {},
            create: { userId: user.id, officeId: targetOffice.id },
          });
        }
      }

      return user;
    })
  );

  await prisma.task.createMany({
    data: [
      {
        title: 'Test: Fix OTA parity issue',
        description: 'Rate parity between Expedia and direct booking',
        status: 'OPEN',
        priority: 'HIGH',
        ventureId: hotelVenture?.id,
        officeId: hotelOffice?.id,
        isTest: true,
      },
      {
        title: 'Test: Push hot lanes today',
        description: 'Chicago-Dallas lane needs coverage',
        status: 'IN_PROGRESS',
        priority: 'CRITICAL',
        ventureId: logisticsVenture?.id,
        officeId: logisticsOffice?.id,
        isTest: true,
      },
      {
        title: 'Test: Follow up with carrier ABC',
        description: 'Pending rate confirmation',
        status: 'BLOCKED',
        priority: 'MEDIUM',
        ventureId: logisticsVenture?.id,
        officeId: logisticsOffice?.id,
        isTest: true,
      },
      {
        title: 'Test: Weekly KPI report done',
        description: 'Compiled and sent weekly metrics',
        status: 'DONE',
        priority: 'LOW',
        ventureId: logisticsVenture?.id,
        officeId: logisticsOffice?.id,
        isTest: true,
      },
    ],
    skipDuplicates: true,
  });

  return res.status(200).json({
    message: `Created/verified ${created.length} test users with venture/office assignments`,
    users: created.map((u) => ({ id: u.id, email: u.email, role: u.role, name: u.fullName })),
    ventures: [logisticsVenture?.name, hotelVenture?.name].filter(Boolean),
  });
}
