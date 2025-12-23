/**
 * Test Fixtures for Connectivity Tests
 * 
 * Provides shared setup/teardown helpers for creating test data
 * that spans the full freight + incentives + gamification + tasks + EOD + outreach system.
 */

import { prisma } from '../../lib/prisma';

export interface TestFixtures {
  ventureId: number;
  userId: number;
  planId: number;
  officeId: number;
}

const testSuffix = Date.now();

export async function createTestFixtures(): Promise<TestFixtures> {
  const venture = await prisma.venture.create({
    data: {
      name: `Connectivity Test Venture ${testSuffix}`,
      type: 'LOGISTICS',
      isActive: true,
    },
  });

  const office = await prisma.office.create({
    data: {
      name: `Test Office ${testSuffix}`,
      ventureId: venture.id,
    },
  });

  const user = await prisma.user.create({
    data: {
      email: `connectivity-test-${testSuffix}@test.com`,
      fullName: 'Connectivity Test User',
      role: 'EMPLOYEE',
      ventures: {
        create: { ventureId: venture.id },
      },
    },
  });

  // Create an IncentivePlan for the tests
  const plan = await prisma.incentivePlan.create({
    data: {
      ventureId: venture.id,
      name: `Test Incentive Plan ${testSuffix}`,
      isActive: true,
      effectiveFrom: new Date('2025-01-01'),
    },
  });

  return {
    ventureId: venture.id,
    userId: user.id,
    planId: plan.id,
    officeId: office.id,
  };
}

export async function cleanupTestFixtures(fixtures: TestFixtures): Promise<void> {
  const { ventureId, userId, planId, officeId } = fixtures;

  await prisma.gamificationEvent.deleteMany({ where: { userId } });
  await prisma.gamificationPointsBalance.deleteMany({ where: { userId } });
  await prisma.incentiveDaily.deleteMany({ where: { ventureId } });
  await prisma.outreachConversation.deleteMany({ where: { ventureId } });
  await prisma.freightQuote.deleteMany({ where: { ventureId } });
  await prisma.load.deleteMany({ where: { ventureId } });
  await prisma.customer.deleteMany({ where: { ventureId } });
  await prisma.incentiveRule.deleteMany({ where: { planId } });
  await prisma.incentivePlan.deleteMany({ where: { id: planId } });
  await prisma.eodReport.deleteMany({ where: { userId } });
  await prisma.task.deleteMany({ where: { assignedTo: userId } });
  await prisma.jobRunLog.deleteMany({ where: { ventureId } });
  await prisma.ventureUser.deleteMany({ where: { ventureId } });
  await prisma.office.deleteMany({ where: { id: officeId } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.venture.deleteMany({ where: { id: ventureId } });
}

export async function createTestQuote(fixtures: TestFixtures, overrides: Partial<any> = {}) {
  const customer = await prisma.customer.create({
    data: {
      name: `Test Customer ${testSuffix}`,
      ventureId: fixtures.ventureId,
      isActive: true,
    },
  });

  return prisma.freightQuote.create({
    data: {
      ventureId: fixtures.ventureId,
      customerId: customer.id,
      salespersonUserId: fixtures.userId,
      status: 'DRAFT',
      customerTypeAtQuote: 'EXISTING',
      origin: 'Chicago, IL',
      destination: 'Los Angeles, CA',
      sellRate: 2500,
      buyRateEstimate: 2000,
      ...overrides,
    },
  });
}

export async function createTestLoad(fixtures: TestFixtures, overrides: Partial<any> = {}) {
  const { origin, destination, ...rest } = overrides;
  return prisma.load.create({
    data: {
      venture: { connect: { id: fixtures.ventureId } },
      createdBy: { connect: { id: fixtures.userId } },
      loadStatus: 'COVERED',
      billAmount: 2500,
      pickupCity: origin?.split(',')[0]?.trim() || null,
      dropCity: destination?.split(',')[0]?.trim() || null,
      ...rest,
    },
  });
}

export async function createTestCarrier(fixtures: TestFixtures) {
  return prisma.carrier.create({
    data: {
      name: `Test Carrier ${testSuffix}`,
      mcNumber: `MC${testSuffix}`,
      email: `carrier-${testSuffix}@test.com`,
      phone: '+15551234567',
    },
  });
}

export async function createTestTask(fixtures: TestFixtures, overrides: Partial<any> = {}) {
  return prisma.task.create({
    data: {
      title: `Test Task ${testSuffix}`,
      status: 'OPEN',
      assignedTo: fixtures.userId,
      ventureId: fixtures.ventureId,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ...overrides,
    },
  });
}

export async function createTestIncentiveRule(fixtures: TestFixtures, overrides: Partial<any> = {}) {
  return prisma.incentiveRule.create({
    data: {
      planId: fixtures.planId,
      roleKey: 'EMPLOYEE',
      metricKey: 'loads_completed',
      calcType: 'FLAT_PER_UNIT',
      rate: 25,
      isEnabled: true,
      ...overrides,
    },
  });
}

export async function createTestEodReport(fixtures: TestFixtures, overrides: Partial<any> = {}) {
  return prisma.eodReport.create({
    data: {
      userId: fixtures.userId,
      ventureId: fixtures.ventureId,
      date: new Date(),
      summary: 'Test EOD summary',
      ...overrides,
    },
  });
}

export async function createTestOutreachConversation(fixtures: TestFixtures, carrierId: number, overrides: Partial<any> = {}) {
  return prisma.outreachConversation.create({
    data: {
      ventureId: fixtures.ventureId,
      carrierId,
      channel: 'EMAIL',
      ...overrides,
    },
  });
}
