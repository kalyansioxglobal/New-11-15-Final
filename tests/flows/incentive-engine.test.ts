/**
 * Incentive Engine Flow Tests
 * 
 * These tests verify real database state changes through the incentive calculation pipeline.
 * They test: Load → Metrics → IncentiveDaily
 */

import { prisma } from '../../lib/prisma';
import { 
  computeIncentivesForDayWithRules, 
  saveIncentivesForDay,
  saveIncentivesForDayIdempotent,
  getDayBounds,
  type EngineRule 
} from '../../lib/incentives/engine';

describe('Incentive Engine Flow', () => {
  let testVentureId: number;
  let testUserId: number;
  let testPlanId: number;
  const testDate = '2025-12-15';

  beforeAll(async () => {
    // Create test venture
    const venture = await prisma.venture.create({
      data: {
        name: 'Test Freight Venture',
        type: 'LOGISTICS',
        isActive: true,
      },
    });
    testVentureId = venture.id;

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `incentive-test-${Date.now()}@test.com`,
        fullName: 'Incentive Test User',
        role: 'EMPLOYEE',
        ventures: {
          create: { ventureId: testVentureId },
        },
      },
    });
    testUserId = user.id;

    // Create actual IncentivePlan
    const plan = await prisma.incentivePlan.create({
      data: {
        ventureId: testVentureId,
        name: 'Test Incentive Plan',
        isActive: true,
        effectiveFrom: new Date('2025-01-01'),
      },
    });
    testPlanId = plan.id;
  });

  afterAll(async () => {
    // Cleanup in reverse dependency order
    await prisma.incentiveDaily.deleteMany({
      where: { ventureId: testVentureId },
    });
    await prisma.load.deleteMany({
      where: { ventureId: testVentureId },
    });
    await prisma.incentiveRule.deleteMany({
      where: { planId: testPlanId },
    });
    await prisma.incentivePlan.deleteMany({
      where: { id: testPlanId },
    });
    await prisma.ventureUser.deleteMany({
      where: { ventureId: testVentureId },
    });
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });
    await prisma.venture.deleteMany({
      where: { id: testVentureId },
    });
  });

  describe('getDayBounds', () => {
    it('should return correct day bounds for a date string', () => {
      const { day, start, end } = getDayBounds('2025-12-15');
      
      expect(day).toBe('2025-12-15');
      expect(start.toISOString()).toBe('2025-12-15T00:00:00.000Z');
      expect(end.toISOString()).toBe('2025-12-15T23:59:59.999Z');
    });

    it('should throw on invalid date', () => {
      expect(() => getDayBounds('invalid-date')).toThrow('Invalid date');
    });
  });

  describe('Load → Freight Metrics', () => {
    beforeEach(async () => {
      // Clean up previous loads
      await prisma.load.deleteMany({
        where: { ventureId: testVentureId },
      });
    });

    it('should calculate loads_completed metric from DELIVERED loads', async () => {
      const { start, end } = getDayBounds(testDate);

      // Create 3 delivered loads
      await prisma.load.createMany({
        data: [
          {
            ventureId: testVentureId,
            createdById: testUserId,
            loadStatus: 'DELIVERED',
            billingDate: new Date(`${testDate}T12:00:00.000Z`),
            billAmount: 1000,
            miles: 500,
            marginAmount: 150,
          },
          {
            ventureId: testVentureId,
            createdById: testUserId,
            loadStatus: 'DELIVERED',
            billingDate: new Date(`${testDate}T14:00:00.000Z`),
            billAmount: 2000,
            miles: 800,
            marginAmount: 300,
          },
          {
            ventureId: testVentureId,
            createdById: testUserId,
            loadStatus: 'DELIVERED',
            billingDate: new Date(`${testDate}T16:00:00.000Z`),
            billAmount: 1500,
            miles: 600,
            marginAmount: 200,
          },
        ],
      });

      // Create a rule that pays $5 per load completed
      const rules: EngineRule[] = [
        {
          id: 1,
          metricKey: 'loads_completed',
          calcType: 'FLAT_PER_UNIT',
          rate: 5,
          config: null,
        },
      ];

      const results = await computeIncentivesForDayWithRules({
        ventureId: testVentureId,
        date: testDate,
        rules,
        restrictToUserIds: [testUserId],
      });

      expect(results).toHaveLength(1);
      expect(results[0].userId).toBe(testUserId);
      expect(results[0].amount).toBe(15); // 3 loads × $5 = $15
    });

    it('should calculate loads_revenue metric', async () => {
      const { start, end } = getDayBounds(testDate);

      await prisma.load.create({
        data: {
          ventureId: testVentureId,
          createdById: testUserId,
          loadStatus: 'DELIVERED',
          billingDate: new Date(`${testDate}T12:00:00.000Z`),
          billAmount: 10000,
        },
      });

      const rules: EngineRule[] = [
        {
          id: 2,
          metricKey: 'loads_revenue',
          calcType: 'PERCENT_OF_METRIC',
          rate: 0.02, // 2% commission
          config: null,
        },
      ];

      const results = await computeIncentivesForDayWithRules({
        ventureId: testVentureId,
        date: testDate,
        rules,
        restrictToUserIds: [testUserId],
      });

      expect(results).toHaveLength(1);
      expect(results[0].amount).toBe(200); // $10,000 × 2% = $200
    });

    it('should NOT include non-DELIVERED loads', async () => {
      await prisma.load.createMany({
        data: [
          {
            ventureId: testVentureId,
            createdById: testUserId,
            loadStatus: 'DELIVERED',
            billingDate: new Date(`${testDate}T12:00:00.000Z`),
            billAmount: 1000,
          },
          {
            ventureId: testVentureId,
            createdById: testUserId,
            loadStatus: 'COVERED', // Should NOT count
            billingDate: new Date(`${testDate}T12:00:00.000Z`),
            billAmount: 1000,
          },
          {
            ventureId: testVentureId,
            createdById: testUserId,
            loadStatus: 'LOST', // Should NOT count
            billingDate: new Date(`${testDate}T12:00:00.000Z`),
            billAmount: 1000,
          },
        ],
      });

      const rules: EngineRule[] = [
        {
          id: 3,
          metricKey: 'loads_completed',
          calcType: 'FLAT_PER_UNIT',
          rate: 10,
          config: null,
        },
      ];

      const results = await computeIncentivesForDayWithRules({
        ventureId: testVentureId,
        date: testDate,
        rules,
        restrictToUserIds: [testUserId],
      });

      expect(results).toHaveLength(1);
      expect(results[0].amount).toBe(10); // Only 1 DELIVERED load
    });

    it('should NOT include loads outside date range', async () => {
      await prisma.load.createMany({
        data: [
          {
            ventureId: testVentureId,
            createdById: testUserId,
            loadStatus: 'DELIVERED',
            billingDate: new Date(`${testDate}T12:00:00.000Z`), // In range
            billAmount: 1000,
          },
          {
            ventureId: testVentureId,
            createdById: testUserId,
            loadStatus: 'DELIVERED',
            billingDate: new Date('2025-12-14T12:00:00.000Z'), // Day before
            billAmount: 1000,
          },
          {
            ventureId: testVentureId,
            createdById: testUserId,
            loadStatus: 'DELIVERED',
            billingDate: new Date('2025-12-16T12:00:00.000Z'), // Day after
            billAmount: 1000,
          },
        ],
      });

      const rules: EngineRule[] = [
        {
          id: 4,
          metricKey: 'loads_completed',
          calcType: 'FLAT_PER_UNIT',
          rate: 100,
          config: null,
        },
      ];

      const results = await computeIncentivesForDayWithRules({
        ventureId: testVentureId,
        date: testDate,
        rules,
        restrictToUserIds: [testUserId],
      });

      expect(results).toHaveLength(1);
      expect(results[0].amount).toBe(100); // Only 1 load in range
    });
  });

  describe('BONUS_ON_TARGET calculation', () => {
    beforeEach(async () => {
      await prisma.load.deleteMany({
        where: { ventureId: testVentureId },
      });
    });

    it('should award bonus when target is met', async () => {
      // Create 5 loads to meet threshold
      await prisma.load.createMany({
        data: Array(5).fill(null).map(() => ({
          ventureId: testVentureId,
          createdById: testUserId,
          loadStatus: 'DELIVERED',
          billingDate: new Date(`${testDate}T12:00:00.000Z`),
          billAmount: 1000,
        })),
      });

      const rules: EngineRule[] = [
        {
          id: 5,
          metricKey: 'loads_completed',
          calcType: 'BONUS_ON_TARGET',
          rate: null,
          config: {
            thresholdValue: 5,
            bonusAmount: 500,
          },
        },
      ];

      const results = await computeIncentivesForDayWithRules({
        ventureId: testVentureId,
        date: testDate,
        rules,
        restrictToUserIds: [testUserId],
      });

      expect(results).toHaveLength(1);
      expect(results[0].amount).toBe(500);
    });

    it('should NOT award bonus when target is not met', async () => {
      // Create only 3 loads (below threshold of 5)
      await prisma.load.createMany({
        data: Array(3).fill(null).map(() => ({
          ventureId: testVentureId,
          createdById: testUserId,
          loadStatus: 'DELIVERED',
          billingDate: new Date(`${testDate}T12:00:00.000Z`),
          billAmount: 1000,
        })),
      });

      const rules: EngineRule[] = [
        {
          id: 6,
          metricKey: 'loads_completed',
          calcType: 'BONUS_ON_TARGET',
          rate: null,
          config: {
            thresholdValue: 5,
            bonusAmount: 500,
          },
        },
      ];

      const results = await computeIncentivesForDayWithRules({
        ventureId: testVentureId,
        date: testDate,
        rules,
        restrictToUserIds: [testUserId],
      });

      // No results because bonus not met
      expect(results).toHaveLength(0);
    });
  });

  describe('saveIncentivesForDay - DB persistence', () => {
    beforeEach(async () => {
      await prisma.incentiveDaily.deleteMany({
        where: { ventureId: testVentureId },
      });
      await prisma.incentiveRule.deleteMany({
        where: { planId: testPlanId },
      });
      await prisma.load.deleteMany({
        where: { ventureId: testVentureId },
      });
    });

    it('should create IncentiveDaily records in database', async () => {
      // Setup: Create rule
      await prisma.incentiveRule.create({
        data: {
          plan: { connect: { id: testPlanId } },
          roleKey: 'EMPLOYEE',
          metricKey: 'loads_completed',
          calcType: 'FLAT_PER_UNIT',
          rate: 25,
          isEnabled: true,
        },
      });

      // Setup: Create loads
      await prisma.load.createMany({
        data: Array(4).fill(null).map(() => ({
          ventureId: testVentureId,
          createdById: testUserId,
          loadStatus: 'DELIVERED',
          billingDate: new Date(`${testDate}T12:00:00.000Z`),
          billAmount: 1000,
        })),
      });

      // Act: Save incentives
      const result = await saveIncentivesForDay(testPlanId, testDate);

      // Assert: Check return value
      expect(result.items).toHaveLength(1);
      expect(result.inserted).toBe(1);
      expect(result.updated).toBe(0);

      // Assert: Verify database state
      const dbRecord = await prisma.incentiveDaily.findFirst({
        where: {
          userId: testUserId,
          ventureId: testVentureId,
        },
      });

      expect(dbRecord).not.toBeNull();
      expect(dbRecord?.amount).toBe(100); // 4 loads × $25
      expect(dbRecord?.currency).toBe('USD');
      expect(dbRecord?.isTest).toBe(false);
      
      const breakdown = dbRecord?.breakdown as any;
      expect(breakdown?.rules).toHaveLength(1);
      expect(breakdown?.rules[0].amount).toBe(100);
    });

    it('should update existing IncentiveDaily when run twice', async () => {
      // Setup: Create rule
      const rule = await prisma.incentiveRule.create({
        data: {
          plan: { connect: { id: testPlanId } },
          roleKey: 'EMPLOYEE',
          metricKey: 'loads_completed',
          calcType: 'FLAT_PER_UNIT',
          rate: 10,
          isEnabled: true,
        },
      });

      // Setup: Create loads
      await prisma.load.createMany({
        data: Array(2).fill(null).map(() => ({
          ventureId: testVentureId,
          createdById: testUserId,
          loadStatus: 'DELIVERED',
          billingDate: new Date(`${testDate}T12:00:00.000Z`),
          billAmount: 1000,
        })),
      });

      // Act: First save
      const result1 = await saveIncentivesForDay(testPlanId, testDate);
      expect(result1.inserted).toBe(1);
      expect(result1.updated).toBe(0);

      // Act: Second save (should update, not insert)
      const result2 = await saveIncentivesForDay(testPlanId, testDate);
      expect(result2.inserted).toBe(0);
      expect(result2.updated).toBe(1);

      // Assert: Check accumulated amount
      const dbRecord = await prisma.incentiveDaily.findFirst({
        where: {
          userId: testUserId,
          ventureId: testVentureId,
        },
      });

      expect(dbRecord?.amount).toBe(40); // $20 + $20 = $40 (accumulated)
    });
  });

  describe('saveIncentivesForDayIdempotent - Idempotency', () => {
    beforeEach(async () => {
      await prisma.incentiveDaily.deleteMany({
        where: { ventureId: testVentureId },
      });
      await prisma.incentiveRule.deleteMany({
        where: { planId: testPlanId },
      });
      await prisma.load.deleteMany({
        where: { ventureId: testVentureId },
      });
    });

    it('should produce same totals when run twice (idempotent)', async () => {
      // Setup: Create rule
      await prisma.incentiveRule.create({
        data: {
          plan: { connect: { id: testPlanId } },
          roleKey: 'EMPLOYEE',
          metricKey: 'loads_completed',
          calcType: 'FLAT_PER_UNIT',
          rate: 50,
          isEnabled: true,
        },
      });

      // Setup: Create loads
      await prisma.load.createMany({
        data: Array(3).fill(null).map(() => ({
          ventureId: testVentureId,
          createdById: testUserId,
          loadStatus: 'DELIVERED',
          billingDate: new Date(`${testDate}T12:00:00.000Z`),
          billAmount: 1000,
        })),
      });

      // Act: First run
      const result1 = await saveIncentivesForDayIdempotent(testPlanId, testDate);
      expect(result1.inserted).toBe(1);
      expect(result1.deleted).toBe(0); // First run, nothing to delete

      const firstTotal = result1.items.reduce((sum, item) => sum + item.amount, 0);
      const firstDbRecord = await prisma.incentiveDaily.findFirst({
        where: {
          userId: testUserId,
          ventureId: testVentureId,
        },
      });
      expect(firstDbRecord?.amount).toBe(150); // 3 loads × $50

      // Act: Second run (idempotent - should produce same totals)
      const result2 = await saveIncentivesForDayIdempotent(testPlanId, testDate);
      expect(result2.inserted).toBe(1); // Deleted and recreated
      expect(result2.deleted).toBe(1); // Deleted previous record

      const secondTotal = result2.items.reduce((sum, item) => sum + item.amount, 0);
      const secondDbRecord = await prisma.incentiveDaily.findFirst({
        where: {
          userId: testUserId,
          ventureId: testVentureId,
        },
      });

      // Assert: Same totals (idempotent)
      expect(firstTotal).toBe(secondTotal);
      expect(firstDbRecord?.amount).toBe(secondDbRecord?.amount);
      expect(secondDbRecord?.amount).toBe(150); // Same as first run
    });

    it('should have same number of records when run twice', async () => {
      // Setup: Create rule
      await prisma.incentiveRule.create({
        data: {
          plan: { connect: { id: testPlanId } },
          roleKey: 'EMPLOYEE',
          metricKey: 'loads_completed',
          calcType: 'FLAT_PER_UNIT',
          rate: 25,
          isEnabled: true,
        },
      });

      // Setup: Create loads
      await prisma.load.createMany({
        data: Array(2).fill(null).map(() => ({
          ventureId: testVentureId,
          createdById: testUserId,
          loadStatus: 'DELIVERED',
          billingDate: new Date(`${testDate}T12:00:00.000Z`),
          billAmount: 1000,
        })),
      });

      // Act: Run twice
      await saveIncentivesForDayIdempotent(testPlanId, testDate);
      const count1 = await prisma.incentiveDaily.count({
        where: { ventureId: testVentureId },
      });

      await saveIncentivesForDayIdempotent(testPlanId, testDate);
      const count2 = await prisma.incentiveDaily.count({
        where: { ventureId: testVentureId },
      });

      // Assert: Same number of records
      expect(count1).toBe(count2);
      expect(count1).toBe(1); // One record per user
    });
  });
});
