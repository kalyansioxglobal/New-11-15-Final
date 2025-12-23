/**
 * System Connectivity Tests
 * 
 * These tests verify the wiring between system components:
 * - Load creation and status updates
 * - Load DELIVERED → Incentive engine calculation
 * - Task lifecycle
 * - EOD report submission → DB persistence
 * - Carrier outreach records
 */

import { prisma } from '../../lib/prisma';
import { 
  createTestFixtures, 
  cleanupTestFixtures, 
  createTestLoad,
  createTestCarrier,
  createTestTask,
  createTestIncentiveRule,
  createTestEodReport,
  createTestOutreachConversation,
  createTestQuote,
  type TestFixtures 
} from './test-fixtures';
import { 
  computeIncentivesForDayWithRules,
  saveIncentivesForDay,
  saveIncentivesForDayIdempotent,
  type EngineRule 
} from '../../lib/incentives/engine';
import { runIncentiveDailyJob } from '../../lib/jobs/incentiveDailyJob';
import { awardPoints, awardPointsForEvent } from '../../lib/gamification/awardPoints';

describe('System Connectivity Tests', () => {
  let fixtures: TestFixtures;
  const testDate = '2025-12-15';

  beforeAll(async () => {
    fixtures = await createTestFixtures();
  });

  afterAll(async () => {
    await cleanupTestFixtures(fixtures);
  });

  describe('Flow 1: Load Creation and Status Updates', () => {
    beforeEach(async () => {
      await prisma.load.deleteMany({ where: { ventureId: fixtures.ventureId } });
    });

    it('should create a load in the database', async () => {
      const load = await createTestLoad(fixtures, {
        loadStatus: 'COVERED',
        origin: 'Chicago, IL',
        destination: 'Dallas, TX',
        billAmount: 3000,
      });

      const dbLoad = await prisma.load.findUnique({ where: { id: load.id } });
      expect(dbLoad).not.toBeNull();
      expect(dbLoad?.loadStatus).toBe('COVERED');
      expect(dbLoad?.pickupCity).toBe('Chicago');
      expect(dbLoad?.dropCity).toBe('Dallas');
    });

    it('should update load status to DELIVERED', async () => {
      const load = await createTestLoad(fixtures, {
        loadStatus: 'COVERED',
        billAmount: 3000,
      });

      await prisma.load.update({
        where: { id: load.id },
        data: { 
          loadStatus: 'DELIVERED',
          billingDate: new Date(),
        },
      });

      const dbLoad = await prisma.load.findUnique({ where: { id: load.id } });
      expect(dbLoad?.loadStatus).toBe('DELIVERED');
      expect(dbLoad?.billingDate).not.toBeNull();
    });

    it('should track load status transitions', async () => {
      const load = await createTestLoad(fixtures, {
        loadStatus: 'COVERED',
        billAmount: 5000,
      });

      await prisma.load.update({
        where: { id: load.id },
        data: { loadStatus: 'WORKING' },
      });

      let dbLoad = await prisma.load.findUnique({ where: { id: load.id } });
      expect(dbLoad?.loadStatus).toBe('WORKING');

      await prisma.load.update({
        where: { id: load.id },
        data: { 
          loadStatus: 'DELIVERED',
          billingDate: new Date(),
        },
      });

      dbLoad = await prisma.load.findUnique({ where: { id: load.id } });
      expect(dbLoad?.loadStatus).toBe('DELIVERED');
    });
  });

  describe('Flow 2: Load DELIVERED → Incentive Engine', () => {
    beforeEach(async () => {
      await prisma.incentiveDaily.deleteMany({ where: { ventureId: fixtures.ventureId } });
      await prisma.load.deleteMany({ where: { ventureId: fixtures.ventureId } });
      await prisma.incentiveRule.deleteMany({ where: { planId: fixtures.planId } });
    });

    it('should calculate incentives when loads are DELIVERED', async () => {
      await prisma.load.createMany({
        data: [
          {
            ventureId: fixtures.ventureId,
            createdById: fixtures.userId,
            loadStatus: 'DELIVERED',
            billingDate: new Date(`${testDate}T12:00:00.000Z`),
            billAmount: 1000,
          },
          {
            ventureId: fixtures.ventureId,
            createdById: fixtures.userId,
            loadStatus: 'DELIVERED',
            billingDate: new Date(`${testDate}T14:00:00.000Z`),
            billAmount: 2000,
          },
        ],
      });

      const rules: EngineRule[] = [
        {
          id: 1,
          metricKey: 'loads_completed',
          calcType: 'FLAT_PER_UNIT',
          rate: 50,
          config: null,
        },
      ];

      const results = await computeIncentivesForDayWithRules({
        ventureId: fixtures.ventureId,
        date: testDate,
        rules,
        restrictToUserIds: [fixtures.userId],
      });

      expect(results).toHaveLength(1);
      expect(results[0].userId).toBe(fixtures.userId);
      expect(results[0].amount).toBe(100);
    });

    it('should persist IncentiveDaily records to database', async () => {
      await createTestIncentiveRule(fixtures, {
        metricKey: 'loads_completed',
        calcType: 'FLAT_PER_UNIT',
        rate: 30,
      });

      await prisma.load.createMany({
        data: Array(3).fill(null).map(() => ({
          ventureId: fixtures.ventureId,
          createdById: fixtures.userId,
          loadStatus: 'DELIVERED',
          billingDate: new Date(`${testDate}T12:00:00.000Z`),
          billAmount: 1500,
        })),
      });

      const result = await saveIncentivesForDay(fixtures.planId, testDate);

      expect(result.items).toHaveLength(1);
      expect(result.inserted).toBe(1);

      const dbRecord = await prisma.incentiveDaily.findFirst({
        where: { userId: fixtures.userId, ventureId: fixtures.ventureId },
      });

      expect(dbRecord).not.toBeNull();
      expect(dbRecord?.amount).toBe(90);
    });

    it('should NOT count non-DELIVERED loads for incentives', async () => {
      await prisma.load.createMany({
        data: [
          {
            ventureId: fixtures.ventureId,
            createdById: fixtures.userId,
            loadStatus: 'DELIVERED',
            billingDate: new Date(`${testDate}T12:00:00.000Z`),
            billAmount: 1000,
          },
          {
            ventureId: fixtures.ventureId,
            createdById: fixtures.userId,
            loadStatus: 'COVERED',
            billingDate: new Date(`${testDate}T12:00:00.000Z`),
            billAmount: 1000,
          },
          {
            ventureId: fixtures.ventureId,
            createdById: fixtures.userId,
            loadStatus: 'LOST',
            billingDate: new Date(`${testDate}T12:00:00.000Z`),
            billAmount: 1000,
          },
        ],
      });

      const rules: EngineRule[] = [
        {
          id: 1,
          metricKey: 'loads_completed',
          calcType: 'FLAT_PER_UNIT',
          rate: 100,
          config: null,
        },
      ];

      const results = await computeIncentivesForDayWithRules({
        ventureId: fixtures.ventureId,
        date: testDate,
        rules,
        restrictToUserIds: [fixtures.userId],
      });

      expect(results).toHaveLength(1);
      expect(results[0].amount).toBe(100);
    });
  });

  describe('Flow 3: Task Lifecycle', () => {
    beforeEach(async () => {
      await prisma.task.deleteMany({ where: { assignedTo: fixtures.userId } });
    });

    it('should create task and persist to database', async () => {
      const task = await createTestTask(fixtures, {
        title: 'Follow up with shipper',
        status: 'OPEN',
      });

      const dbTask = await prisma.task.findUnique({ where: { id: task.id } });
      expect(dbTask).not.toBeNull();
      expect(dbTask?.title).toBe('Follow up with shipper');
      expect(dbTask?.status).toBe('OPEN');
    });

    it('should update task status to DONE', async () => {
      const task = await createTestTask(fixtures, {
        title: 'Process invoice',
        status: 'OPEN',
      });

      await prisma.task.update({
        where: { id: task.id },
        data: { 
          status: 'DONE',
          completedAt: new Date(),
        },
      });

      const dbTask = await prisma.task.findUnique({ where: { id: task.id } });
      expect(dbTask?.status).toBe('DONE');
      expect(dbTask?.completedAt).not.toBeNull();
    });

    it('should track task status transitions', async () => {
      const task = await createTestTask(fixtures, {
        title: 'Review carrier documents',
        status: 'OPEN',
      });

      await prisma.task.update({
        where: { id: task.id },
        data: { status: 'IN_PROGRESS' },
      });

      let dbTask = await prisma.task.findUnique({ where: { id: task.id } });
      expect(dbTask?.status).toBe('IN_PROGRESS');

      await prisma.task.update({
        where: { id: task.id },
        data: { 
          status: 'DONE',
          completedAt: new Date(),
        },
      });

      dbTask = await prisma.task.findUnique({ where: { id: task.id } });
      expect(dbTask?.status).toBe('DONE');
    });
  });

  describe('Flow 4: EOD Report Submission', () => {
    beforeEach(async () => {
      await prisma.eodReport.deleteMany({ where: { userId: fixtures.userId } });
    });

    it('should create EOD report and persist to database', async () => {
      const eodReport = await createTestEodReport(fixtures, {
        summary: 'Completed 5 loads today. 2 new customer contracts secured.',
        blockers: 'Carrier capacity tight in the Northeast region.',
        tomorrowPlan: 'Follow up on 3 pending quotes tomorrow.',
      });

      const dbReport = await prisma.eodReport.findUnique({ where: { id: eodReport.id } });
      expect(dbReport).not.toBeNull();
      expect(dbReport?.userId).toBe(fixtures.userId);
      expect(dbReport?.summary).toContain('5 loads');
    });

    it('should track EOD report submission date', async () => {
      const reportDate = new Date('2025-12-15');
      reportDate.setHours(0, 0, 0, 0);

      const eodReport = await createTestEodReport(fixtures, {
        date: reportDate,
        summary: 'Daily summary',
      });

      const dbReport = await prisma.eodReport.findFirst({
        where: {
          userId: fixtures.userId,
          date: {
            gte: reportDate,
            lt: new Date(reportDate.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      });

      expect(dbReport).not.toBeNull();
      expect(dbReport?.id).toBe(eodReport.id);
    });
  });

  describe('Flow 5: Carrier Outreach Records', () => {
    let testCarrierId: number;

    beforeAll(async () => {
      const carrier = await createTestCarrier(fixtures);
      testCarrierId = carrier.id;
    });

    beforeEach(async () => {
      await prisma.outreachConversation.deleteMany({ where: { ventureId: fixtures.ventureId } });
    });

    afterAll(async () => {
      await prisma.outreachConversation.deleteMany({ where: { carrierId: testCarrierId } });
      await prisma.carrier.deleteMany({ where: { id: testCarrierId } });
    });

    it('should create outreach conversation record in database', async () => {
      const conversation = await createTestOutreachConversation(fixtures, testCarrierId, {
        channel: 'EMAIL',
      });

      const dbConversation = await prisma.outreachConversation.findUnique({ where: { id: conversation.id } });
      expect(dbConversation).not.toBeNull();
      expect(dbConversation?.channel).toBe('EMAIL');
      expect(dbConversation?.carrierId).toBe(testCarrierId);
    });

    it('should track outreach conversation updates', async () => {
      const conversation = await createTestOutreachConversation(fixtures, testCarrierId, {
        channel: 'SMS',
      });

      const newMessageTime = new Date();
      await prisma.outreachConversation.update({
        where: { id: conversation.id },
        data: { 
          lastMessageAt: newMessageTime,
        },
      });

      const dbConversation = await prisma.outreachConversation.findUnique({ where: { id: conversation.id } });
      expect(dbConversation?.channel).toBe('SMS');
      expect(dbConversation?.lastMessageAt).not.toBeNull();
    });
  });

  describe('Cross-System Integration: Load → Incentive', () => {
    beforeEach(async () => {
      await prisma.incentiveDaily.deleteMany({ where: { ventureId: fixtures.ventureId } });
      await prisma.load.deleteMany({ where: { ventureId: fixtures.ventureId } });
      await prisma.incentiveRule.deleteMany({ where: { planId: fixtures.planId } });
    });

    it('should trace full load creation → delivery → incentive calculation flow', async () => {
      const load = await createTestLoad(fixtures, {
        loadStatus: 'COVERED',
        billAmount: 5000,
      });

      await prisma.load.update({
        where: { id: load.id },
        data: {
          loadStatus: 'DELIVERED',
          billingDate: new Date(`${testDate}T12:00:00.000Z`),
        },
      });

      await createTestIncentiveRule(fixtures, {
        metricKey: 'loads_revenue',
        calcType: 'PERCENT_OF_METRIC',
        rate: 0.02,
      });

      const result = await saveIncentivesForDay(fixtures.planId, testDate);

      expect(result.items).toHaveLength(1);

      const dbIncentive = await prisma.incentiveDaily.findFirst({
        where: { userId: fixtures.userId, ventureId: fixtures.ventureId },
      });

      expect(dbIncentive?.amount).toBe(100);

      const dbLoad = await prisma.load.findUnique({ where: { id: load.id } });
      expect(dbLoad?.loadStatus).toBe('DELIVERED');
    });
  });

  describe('Flow 6: Gamification Point Awards', () => {
    beforeEach(async () => {
      await prisma.gamificationEvent.deleteMany({ where: { userId: fixtures.userId } });
      await prisma.gamificationPointsBalance.deleteMany({ where: { userId: fixtures.userId } });
    });

    it('should award points and create GamificationEvent', async () => {
      const result = await awardPoints({
        userId: fixtures.userId,
        ventureId: fixtures.ventureId,
        eventType: 'TEST_EVENT',
        points: 15,
        metadata: { testKey: 'testValue' },
      });

      expect(result.success).toBe(true);
      expect(result.eventId).toBeDefined();

      const dbEvent = await prisma.gamificationEvent.findUnique({ where: { id: result.eventId } });
      expect(dbEvent).not.toBeNull();
      expect(dbEvent?.userId).toBe(fixtures.userId);
      expect(dbEvent?.type).toBe('TEST_EVENT');
      expect(dbEvent?.points).toBe(15);
    });

    it('should increment GamificationPointsBalance', async () => {
      await awardPoints({
        userId: fixtures.userId,
        ventureId: fixtures.ventureId,
        eventType: 'TEST_EVENT_1',
        points: 10,
      });

      await awardPoints({
        userId: fixtures.userId,
        ventureId: fixtures.ventureId,
        eventType: 'TEST_EVENT_2',
        points: 20,
      });

      const balance = await prisma.gamificationPointsBalance.findUnique({ where: { userId: fixtures.userId } });
      expect(balance).not.toBeNull();
      expect(balance?.points).toBe(30);
    });

    it('should respect idempotency key and skip duplicate awards', async () => {
      const idempotencyKey = `test-idempotent-${Date.now()}`;

      const firstResult = await awardPoints({
        userId: fixtures.userId,
        ventureId: fixtures.ventureId,
        eventType: 'IDEMPOTENT_TEST',
        points: 25,
        idempotencyKey,
      });

      expect(firstResult.success).toBe(true);
      expect(firstResult.skipped).toBeUndefined();

      const secondResult = await awardPoints({
        userId: fixtures.userId,
        ventureId: fixtures.ventureId,
        eventType: 'IDEMPOTENT_TEST',
        points: 25,
        idempotencyKey,
      });

      expect(secondResult.success).toBe(true);
      expect(secondResult.skipped).toBe(true);
      expect(secondResult.eventId).toBe(firstResult.eventId);

      const balance = await prisma.gamificationPointsBalance.findUnique({ where: { userId: fixtures.userId } });
      expect(balance?.points).toBe(25);
    });

    it('should use default points from awardPointsForEvent', async () => {
      const result = await awardPointsForEvent(fixtures.userId, fixtures.ventureId, 'EOD_REPORT_SUBMITTED', {
        idempotencyKey: `test-eod-${Date.now()}`,
      });

      expect(result.success).toBe(true);

      const dbEvent = await prisma.gamificationEvent.findUnique({ where: { id: result.eventId } });
      expect(dbEvent?.points).toBe(10);
    });

    it('should use venture-specific config if available', async () => {
      await prisma.gamificationConfig.upsert({
        where: { ventureId: fixtures.ventureId },
        update: { config: { EOD_REPORT_SUBMITTED: 50 } },
        create: { ventureId: fixtures.ventureId, config: { EOD_REPORT_SUBMITTED: 50 } },
      });

      const result = await awardPointsForEvent(fixtures.userId, fixtures.ventureId, 'EOD_REPORT_SUBMITTED', {
        idempotencyKey: `test-eod-custom-${Date.now()}`,
      });

      expect(result.success).toBe(true);

      const dbEvent = await prisma.gamificationEvent.findUnique({ where: { id: result.eventId } });
      expect(dbEvent?.points).toBe(50);

      await prisma.gamificationConfig.deleteMany({ where: { ventureId: fixtures.ventureId } });
    });
  });

  describe('Flow 7: Incentive Daily Job (Idempotent)', () => {
    const incentiveTestDate = '2025-12-14';

    beforeEach(async () => {
      await prisma.incentiveDaily.deleteMany({ where: { ventureId: fixtures.ventureId } });
      await prisma.incentiveRule.deleteMany({ where: { planId: fixtures.planId } });
      await prisma.load.deleteMany({ where: { ventureId: fixtures.ventureId } });
    }, 15000);

    it('should create IncentiveDaily record when load is delivered with billingDate', async () => {
      const billingDate = new Date(incentiveTestDate);

      await createTestLoad(fixtures, {
        loadStatus: 'DELIVERED',
        billAmount: 2000,
        billingDate,
      });

      await createTestIncentiveRule(fixtures, {
        metricKey: 'loads_completed',
        calcType: 'FLAT_PER_UNIT',
        rate: 50,
      });

      const result = await runIncentiveDailyJob({
        ventureId: fixtures.ventureId,
        date: incentiveTestDate,
        dryRun: false,
      });

      expect(result.stats.plansProcessed).toBe(1);
      expect(result.stats.totalInserted).toBeGreaterThanOrEqual(1);

      const incentives = await prisma.incentiveDaily.findMany({
        where: { ventureId: fixtures.ventureId },
      });

      expect(incentives.length).toBeGreaterThanOrEqual(1);

      const userIncentive = incentives.find(i => i.userId === fixtures.userId);
      expect(userIncentive).toBeDefined();
      expect(userIncentive?.amount).toBe(50);
    });

    it('should be idempotent - running twice should NOT double the amounts', async () => {
      const billingDate = new Date(incentiveTestDate);

      await createTestLoad(fixtures, {
        loadStatus: 'DELIVERED',
        billAmount: 3000,
        billingDate,
      });

      await createTestIncentiveRule(fixtures, {
        metricKey: 'loads_completed',
        calcType: 'FLAT_PER_UNIT',
        rate: 100,
      });

      const firstRun = await runIncentiveDailyJob({
        ventureId: fixtures.ventureId,
        date: incentiveTestDate,
        dryRun: false,
      });

      expect(firstRun.stats.totalInserted).toBeGreaterThanOrEqual(1);

      const afterFirstRun = await prisma.incentiveDaily.findFirst({
        where: { ventureId: fixtures.ventureId, userId: fixtures.userId },
      });
      expect(afterFirstRun?.amount).toBe(100);

      const secondRun = await runIncentiveDailyJob({
        ventureId: fixtures.ventureId,
        date: incentiveTestDate,
        dryRun: false,
      });

      expect(secondRun.stats.totalDeleted).toBeGreaterThanOrEqual(1);
      expect(secondRun.stats.totalInserted).toBeGreaterThanOrEqual(1);

      const afterSecondRun = await prisma.incentiveDaily.findFirst({
        where: { ventureId: fixtures.ventureId, userId: fixtures.userId },
      });

      expect(afterSecondRun?.amount).toBe(100);
      expect(afterSecondRun?.amount).not.toBe(200);
    }, 20000);

    it('should use saveIncentivesForDayIdempotent for replace semantics', async () => {
      const billingDate = new Date(incentiveTestDate);

      await createTestLoad(fixtures, {
        loadStatus: 'DELIVERED',
        billAmount: 1500,
        billingDate,
      });

      const rule = await createTestIncentiveRule(fixtures, {
        metricKey: 'loads_completed',
        calcType: 'FLAT_PER_UNIT',
        rate: 75,
      });

      const first = await saveIncentivesForDayIdempotent(fixtures.planId, incentiveTestDate);
      expect(first.inserted).toBeGreaterThanOrEqual(1);

      const second = await saveIncentivesForDayIdempotent(fixtures.planId, incentiveTestDate);
      expect(second.deleted).toBeGreaterThanOrEqual(1);
      expect(second.inserted).toBeGreaterThanOrEqual(1);

      const finalRecords = await prisma.incentiveDaily.findMany({
        where: { ventureId: fixtures.ventureId },
      });

      const userRecord = finalRecords.find(r => r.userId === fixtures.userId);
      expect(userRecord?.amount).toBe(75);
    });

    it('should log job run to JobRunLog', async () => {
      const result = await runIncentiveDailyJob({
        ventureId: fixtures.ventureId,
        date: incentiveTestDate,
        dryRun: false,
      });

      const jobLog = await prisma.jobRunLog.findUnique({
        where: { id: result.jobRunLogId },
      });

      expect(jobLog).not.toBeNull();
      expect(jobLog?.jobName).toBe('INCENTIVE_DAILY');
      expect(jobLog?.status).toBe('SUCCESS');
    });

    it('should support dry run mode without creating records', async () => {
      const billingDate = new Date(incentiveTestDate);

      await createTestLoad(fixtures, {
        loadStatus: 'DELIVERED',
        billAmount: 2500,
        billingDate,
      });

      await createTestIncentiveRule(fixtures, {
        metricKey: 'loads_completed',
        calcType: 'FLAT_PER_UNIT',
        rate: 60,
      });

      const result = await runIncentiveDailyJob({
        ventureId: fixtures.ventureId,
        date: incentiveTestDate,
        dryRun: true,
      });

      expect(result.stats.usersAffected).toBeGreaterThanOrEqual(1);
      expect(result.stats.totalInserted).toBe(0);

      const incentives = await prisma.incentiveDaily.findMany({
        where: { ventureId: fixtures.ventureId },
      });

      expect(incentives.length).toBe(0);
    }, 20000);

    it('should handle multiple plans for the same venture correctly', async () => {
      const billingDate = new Date(incentiveTestDate);

      await createTestLoad(fixtures, {
        loadStatus: 'DELIVERED',
        billAmount: 5000,
        billingDate,
      });

      const plan2 = await prisma.incentivePlan.create({
        data: {
          ventureId: fixtures.ventureId,
          name: `Second Test Plan ${Date.now()}`,
          isActive: true,
          effectiveFrom: new Date('2025-01-01'),
        },
      });

      await createTestIncentiveRule(fixtures, {
        metricKey: 'loads_completed',
        calcType: 'FLAT_PER_UNIT',
        rate: 30,
      });

      await prisma.incentiveRule.create({
        data: {
          planId: plan2.id,
          roleKey: 'EMPLOYEE',
          metricKey: 'loads_completed',
          calcType: 'FLAT_PER_UNIT',
          rate: 20,
          isEnabled: true,
        },
      });

      const firstRun = await runIncentiveDailyJob({
        ventureId: fixtures.ventureId,
        date: incentiveTestDate,
        dryRun: false,
      });

      expect(firstRun.stats.plansProcessed).toBe(2);

      const afterFirstRun = await prisma.incentiveDaily.findFirst({
        where: { ventureId: fixtures.ventureId, userId: fixtures.userId },
      });

      expect(afterFirstRun?.amount).toBe(50);

      const secondRun = await runIncentiveDailyJob({
        ventureId: fixtures.ventureId,
        date: incentiveTestDate,
        dryRun: false,
      });

      const afterSecondRun = await prisma.incentiveDaily.findFirst({
        where: { ventureId: fixtures.ventureId, userId: fixtures.userId },
      });

      expect(afterSecondRun?.amount).toBe(50);
      expect(afterSecondRun?.amount).not.toBe(100);

      await prisma.incentiveRule.deleteMany({ where: { planId: plan2.id } });
      await prisma.incentivePlan.delete({ where: { id: plan2.id } });
    });
  });

  describe('Flow 8: Quote → Load Conversion', () => {
    beforeEach(async () => {
      await prisma.freightQuote.deleteMany({ where: { ventureId: fixtures.ventureId } });
      await prisma.load.deleteMany({ where: { ventureId: fixtures.ventureId } });
      await prisma.customer.deleteMany({ where: { ventureId: fixtures.ventureId } });
    });

    it('should create a quote and persist to database', async () => {
      const quote = await createTestQuote(fixtures, {
        status: 'DRAFT',
        origin: 'Houston, TX',
        destination: 'Miami, FL',
        sellRate: 3500,
        buyRateEstimate: 2800,
      });

      const dbQuote = await prisma.freightQuote.findUnique({ where: { id: quote.id } });
      expect(dbQuote).not.toBeNull();
      expect(dbQuote?.status).toBe('DRAFT');
      expect(dbQuote?.sellRate).toBe(3500);
    });

    it('should update quote status through lifecycle', async () => {
      const quote = await createTestQuote(fixtures, { status: 'DRAFT' });

      await prisma.freightQuote.update({
        where: { id: quote.id },
        data: { status: 'SENT', sentAt: new Date() },
      });

      let dbQuote = await prisma.freightQuote.findUnique({ where: { id: quote.id } });
      expect(dbQuote?.status).toBe('SENT');

      await prisma.freightQuote.update({
        where: { id: quote.id },
        data: { status: 'ACCEPTED', respondedAt: new Date() },
      });

      dbQuote = await prisma.freightQuote.findUnique({ where: { id: quote.id } });
      expect(dbQuote?.status).toBe('ACCEPTED');
    });

    it('should convert ACCEPTED quote to Load and link them', async () => {
      const quote = await createTestQuote(fixtures, {
        status: 'ACCEPTED',
        origin: 'Denver, CO',
        destination: 'Phoenix, AZ',
        sellRate: 4000,
        buyRateEstimate: 3200,
      });

      const load = await prisma.load.create({
        data: {
          ventureId: quote.ventureId,
          customerId: quote.customerId,
          shipperId: quote.shipperId ?? undefined,
          billAmount: quote.sellRate ?? undefined,
          costAmount: quote.buyRateEstimate ?? undefined,
          pickupCity: quote.origin?.split(',')[0]?.trim() ?? undefined,
          pickupState: quote.origin?.split(',')[1]?.trim() ?? undefined,
          dropCity: quote.destination?.split(',')[0]?.trim() ?? undefined,
          dropState: quote.destination?.split(',')[1]?.trim() ?? undefined,
          loadStatus: 'OPEN',
          createdById: fixtures.userId,
        },
      });

      const updatedQuote = await prisma.freightQuote.update({
        where: { id: quote.id },
        data: {
          status: 'BOOKED',
          bookedAt: new Date(),
          loadId: load.id,
        },
      });

      expect(updatedQuote.loadId).toBe(load.id);
      expect(updatedQuote.status).toBe('BOOKED');

      const dbLoad = await prisma.load.findUnique({ where: { id: load.id } });
      expect(dbLoad).not.toBeNull();
      expect(dbLoad?.billAmount).toBe(4000);
      expect(dbLoad?.pickupCity).toBe('Denver');
      expect(dbLoad?.dropCity).toBe('Phoenix');
    });

    it('should track full quote→load→delivered→incentive flow', async () => {
      await prisma.incentiveDaily.deleteMany({ where: { ventureId: fixtures.ventureId } });
      await prisma.incentiveRule.deleteMany({ where: { planId: fixtures.planId } });

      await createTestIncentiveRule(fixtures, {
        metricKey: 'loads_completed',
        calcType: 'FLAT_PER_UNIT',
        rate: 75,
      });

      const quote = await createTestQuote(fixtures, {
        status: 'ACCEPTED',
        sellRate: 5000,
        buyRateEstimate: 4000,
      });

      const load = await prisma.load.create({
        data: {
          ventureId: quote.ventureId,
          customerId: quote.customerId,
          billAmount: quote.sellRate ?? undefined,
          costAmount: quote.buyRateEstimate ?? undefined,
          loadStatus: 'OPEN',
          createdById: fixtures.userId,
        },
      });

      await prisma.freightQuote.update({
        where: { id: quote.id },
        data: { status: 'BOOKED', bookedAt: new Date(), loadId: load.id },
      });

      const testDate = '2025-12-16';
      await prisma.load.update({
        where: { id: load.id },
        data: {
          loadStatus: 'DELIVERED',
          billingDate: new Date(`${testDate}T12:00:00.000Z`),
        },
      });

      const result = await runIncentiveDailyJob({
        ventureId: fixtures.ventureId,
        date: testDate,
        dryRun: false,
      });

      expect(result.stats.usersAffected).toBeGreaterThanOrEqual(1);

      const incentive = await prisma.incentiveDaily.findFirst({
        where: { ventureId: fixtures.ventureId, userId: fixtures.userId },
      });

      expect(incentive).not.toBeNull();
      expect(incentive?.amount).toBe(75);
    });
  });
});
