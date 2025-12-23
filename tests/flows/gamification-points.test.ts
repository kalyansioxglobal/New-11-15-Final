/**
 * Gamification Points Flow Tests
 * 
 * These tests verify real database state changes for gamification events.
 * They test: API → GamificationEvent → GamificationPointsBalance
 */

import { prisma } from '../../lib/prisma';
import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';

// Import the handler
import pointsHandler from '../../pages/api/gamification/points';

// Mock getEffectiveUser for testing
jest.mock('../../lib/effectiveUser', () => ({
  getEffectiveUser: jest.fn().mockResolvedValue({
    id: 1,
    email: 'admin@test.com',
    role: 'ADMIN',
  }),
}));

describe('Gamification Points Flow', () => {
  let testVentureId: number;
  let testUserId: number;

  beforeAll(async () => {
    // Create test venture
    const venture = await prisma.venture.create({
      data: {
        name: 'Test Gamification Venture',
        type: 'LOGISTICS',
        isActive: true,
      },
    });
    testVentureId = venture.id;

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `gamification-test-${Date.now()}@test.com`,
        fullName: 'Gamification Test User',
        role: 'EMPLOYEE',
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.gamificationEvent.deleteMany({
      where: { ventureId: testVentureId },
    });
    await prisma.gamificationPointsBalance.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });
    await prisma.venture.deleteMany({
      where: { id: testVentureId },
    });
  });

  beforeEach(async () => {
    // Clean up events and balances before each test
    await prisma.gamificationEvent.deleteMany({
      where: { ventureId: testVentureId },
    });
    await prisma.gamificationPointsBalance.deleteMany({
      where: { userId: testUserId },
    });
  });

  describe('POST /api/gamification/points', () => {
    it('should create GamificationEvent in database', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          userId: testUserId,
          ventureId: testVentureId,
          eventType: 'load_completed',
          points: 10,
          metadata: { loadId: 123 },
        },
      });

      await pointsHandler(req, res);

      expect(res._getStatusCode()).toBe(201);

      // Verify database state
      const event = await prisma.gamificationEvent.findFirst({
        where: {
          userId: testUserId,
          ventureId: testVentureId,
          type: 'load_completed',
        },
      });

      expect(event).not.toBeNull();
      expect(event?.points).toBe(10);
      expect(event?.metadata).toEqual({ loadId: 123 });
    });

    it('should create GamificationPointsBalance for new user', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          userId: testUserId,
          ventureId: testVentureId,
          eventType: 'first_login',
          points: 5,
        },
      });

      await pointsHandler(req, res);

      expect(res._getStatusCode()).toBe(201);

      // Verify balance created
      const balance = await prisma.gamificationPointsBalance.findUnique({
        where: { userId: testUserId },
      });

      expect(balance).not.toBeNull();
      expect(balance?.points).toBe(5);
    });

    it('should increment existing GamificationPointsBalance', async () => {
      // First award
      const { req: req1, res: res1 } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          userId: testUserId,
          ventureId: testVentureId,
          eventType: 'task_completed',
          points: 10,
        },
      });
      await pointsHandler(req1, res1);

      // Second award
      const { req: req2, res: res2 } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          userId: testUserId,
          ventureId: testVentureId,
          eventType: 'outreach_sent',
          points: 15,
        },
      });
      await pointsHandler(req2, res2);

      // Verify accumulated balance
      const balance = await prisma.gamificationPointsBalance.findUnique({
        where: { userId: testUserId },
      });

      expect(balance?.points).toBe(25); // 10 + 15
    });

    it('should create separate GamificationEvent for each award', async () => {
      // Award 3 times
      for (let i = 0; i < 3; i++) {
        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'POST',
          body: {
            userId: testUserId,
            ventureId: testVentureId,
            eventType: `event_${i}`,
            points: 5,
          },
        });
        await pointsHandler(req, res);
      }

      // Verify 3 separate events
      const events = await prisma.gamificationEvent.findMany({
        where: {
          userId: testUserId,
          ventureId: testVentureId,
        },
      });

      expect(events).toHaveLength(3);

      // Verify single balance
      const balance = await prisma.gamificationPointsBalance.findUnique({
        where: { userId: testUserId },
      });

      expect(balance?.points).toBe(15); // 5 × 3
    });

    it('should return 400 if required fields missing', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          userId: testUserId,
          // Missing ventureId, eventType, points
        },
      });

      await pointsHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(res._getJSONData()).toEqual({
        error: 'userId, ventureId, eventType, and points are required',
      });
    });
  });

  describe('GET /api/gamification/points', () => {
    beforeEach(async () => {
      // Create some events for testing
      await prisma.gamificationEvent.createMany({
        data: [
          {
            userId: testUserId,
            ventureId: testVentureId,
            type: 'load_completed',
            points: 10,
          },
          {
            userId: testUserId,
            ventureId: testVentureId,
            type: 'eod_submitted',
            points: 15,
          },
          {
            userId: testUserId,
            ventureId: testVentureId,
            type: 'outreach_sent',
            points: 5,
          },
        ],
      });
    });

    it('should return events and total points', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          userId: String(testUserId),
          ventureId: String(testVentureId),
        },
      });

      await pointsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);

      const data = res._getJSONData();
      expect(data.events).toHaveLength(3);
      expect(data.totalPoints).toBe(30); // 10 + 15 + 5
    });

    it('should filter by userId', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          userId: String(testUserId),
        },
      });

      await pointsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);

      const data = res._getJSONData();
      data.events.forEach((event: any) => {
        expect(event.userId).toBe(testUserId);
      });
    });
  });
});

describe('Gamification Leaderboard Integration', () => {
  let testVentureId: number;
  let testUserIds: number[];

  beforeAll(async () => {
    // Create test venture
    const venture = await prisma.venture.create({
      data: {
        name: 'Test Leaderboard Venture',
        type: 'LOGISTICS',
        isActive: true,
      },
    });
    testVentureId = venture.id;

    // Create multiple test users
    testUserIds = [];
    for (let i = 0; i < 5; i++) {
      const user = await prisma.user.create({
        data: {
          email: `leaderboard-test-${Date.now()}-${i}@test.com`,
          fullName: `Leaderboard User ${i}`,
          role: 'EMPLOYEE',
        },
      });
      testUserIds.push(user.id);
    }
  });

  afterAll(async () => {
    await prisma.gamificationEvent.deleteMany({
      where: { ventureId: testVentureId },
    });
    await prisma.gamificationPointsBalance.deleteMany({
      where: { userId: { in: testUserIds } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: testUserIds } },
    });
    await prisma.venture.deleteMany({
      where: { id: testVentureId },
    });
  });

  it('should aggregate points correctly for leaderboard ranking', async () => {
    // Award different points to each user
    const pointsPerUser = [100, 250, 75, 300, 150];

    for (let i = 0; i < testUserIds.length; i++) {
      await prisma.gamificationEvent.create({
        data: {
          userId: testUserIds[i],
          ventureId: testVentureId,
          type: 'test_event',
          points: pointsPerUser[i],
        },
      });
    }

    // Query leaderboard data
    const leaderboard = await prisma.gamificationEvent.groupBy({
      by: ['userId'],
      where: { ventureId: testVentureId },
      _sum: { points: true },
      orderBy: { _sum: { points: 'desc' } },
    });

    // Verify ranking order
    expect(leaderboard[0]._sum.points).toBe(300); // User 3
    expect(leaderboard[1]._sum.points).toBe(250); // User 1
    expect(leaderboard[2]._sum.points).toBe(150); // User 4
    expect(leaderboard[3]._sum.points).toBe(100); // User 0
    expect(leaderboard[4]._sum.points).toBe(75);  // User 2
  });
});

describe('Gamification Trigger Idempotency', () => {
  let testVentureId: number;
  let testUserId: number;
  let testHotelId: number;
  let testDisputeId: number;

  beforeAll(async () => {
    // Create test venture
    const venture = await prisma.venture.create({
      data: {
        name: 'Test Idempotency Venture',
        type: 'HOSPITALITY',
        isActive: true,
      },
    });
    testVentureId = venture.id;

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `idempotency-test-${Date.now()}@test.com`,
        fullName: 'Idempotency Test User',
        role: 'EMPLOYEE',
        ventures: {
          create: { ventureId: testVentureId },
        },
      },
    });
    testUserId = user.id;

    // Create test hotel
    const hotel = await prisma.hotelProperty.create({
      data: {
        ventureId: testVentureId,
        name: 'Test Hotel',
        brand: 'TEST',
        isTest: true,
      },
    });
    testHotelId = hotel.id;

    // Create test dispute
    const dispute = await prisma.hotelDispute.create({
      data: {
        propertyId: testHotelId,
        type: 'CHARGEBACK',
        channel: 'CREDIT_CARD',
        disputedAmount: 100,
        originalAmount: 100,
        status: 'OPEN',
        createdById: testUserId,
      },
    });
    testDisputeId = dispute.id;
  });

  afterAll(async () => {
    await prisma.gamificationEvent.deleteMany({
      where: { ventureId: testVentureId },
    });
    await prisma.gamificationPointsBalance.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.hotelDispute.deleteMany({
      where: { id: testDisputeId },
    });
    await prisma.hotelReview.deleteMany({
      where: { hotelId: testHotelId },
    });
    await prisma.hotelProperty.deleteMany({
      where: { id: testHotelId },
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

  beforeEach(async () => {
    await prisma.gamificationEvent.deleteMany({
      where: { ventureId: testVentureId },
    });
    await prisma.gamificationPointsBalance.deleteMany({
      where: { userId: testUserId },
    });
  });

  it('should award points only once for hotel review response (idempotent)', async () => {
    const { awardPointsForEvent } = await import('../../lib/gamification/awardPoints');

    // Create review
    const review = await prisma.hotelReview.create({
      data: {
        hotelId: testHotelId,
        source: 'GOOGLE',
        rating: 5,
        comment: 'Great hotel',
        respondedById: testUserId,
        respondedAt: new Date(),
      },
    });

    const idempotencyKey = `hotel_review_${review.id}_responded`;

    // First call
    const result1 = await awardPointsForEvent(
      testUserId,
      testVentureId,
      'HOTEL_REVIEW_RESPONDED',
      {
        metadata: { reviewId: review.id },
        idempotencyKey,
      }
    );

    expect(result1.success).toBe(true);
    expect(result1.skipped).toBeUndefined();

    // Second call (should be skipped)
    const result2 = await awardPointsForEvent(
      testUserId,
      testVentureId,
      'HOTEL_REVIEW_RESPONDED',
      {
        metadata: { reviewId: review.id },
        idempotencyKey,
      }
    );

    expect(result2.success).toBe(true);
    expect(result2.skipped).toBe(true);

    // Verify only one event created
    const events = await prisma.gamificationEvent.findMany({
      where: {
        userId: testUserId,
        ventureId: testVentureId,
        type: 'HOTEL_REVIEW_RESPONDED',
      },
    });

    expect(events).toHaveLength(1);
  });

  it('should award points only once for hotel dispute resolution (idempotent)', async () => {
    const { awardPointsForEvent } = await import('../../lib/gamification/awardPoints');

    // Update dispute to resolved
    await prisma.hotelDispute.update({
      where: { id: testDisputeId },
      data: {
        status: 'WON',
        ownerId: testUserId,
      },
    });

    const idempotencyKey = `hotel_dispute_${testDisputeId}_resolved_WON`;

    // First call
    const result1 = await awardPointsForEvent(
      testUserId,
      testVentureId,
      'HOTEL_DISPUTE_RESOLVED',
      {
        metadata: { disputeId: testDisputeId, status: 'WON' },
        idempotencyKey,
      }
    );

    expect(result1.success).toBe(true);

    // Second call (should be skipped)
    const result2 = await awardPointsForEvent(
      testUserId,
      testVentureId,
      'HOTEL_DISPUTE_RESOLVED',
      {
        metadata: { disputeId: testDisputeId, status: 'WON' },
        idempotencyKey,
      }
    );

    expect(result2.success).toBe(true);
    expect(result2.skipped).toBe(true);

    // Verify only one event created
    const events = await prisma.gamificationEvent.findMany({
      where: {
        userId: testUserId,
        ventureId: testVentureId,
        type: 'HOTEL_DISPUTE_RESOLVED',
      },
    });

    expect(events).toHaveLength(1);
  });

  it('should award perfect week bonus only once per week (idempotent)', async () => {
    const { awardPointsForEvent } = await import('../../lib/gamification/awardPoints');

    // Create 5 EODs in the same week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);

    for (let i = 0; i < 5; i++) {
      const eodDate = new Date(weekStart);
      eodDate.setDate(eodDate.getDate() + i);

      await prisma.eodReport.create({
        data: {
          userId: testUserId,
          ventureId: testVentureId,
          date: eodDate,
          summary: `EOD ${i + 1}`,
          status: 'SUBMITTED',
        },
      });
    }

    const idempotencyKey = `perfect_week_${testUserId}_${testVentureId}_${weekStart.toISOString().split('T')[0]}`;

    // First call
    const result1 = await awardPointsForEvent(
      testUserId,
      testVentureId,
      'PERFECT_WEEK_EOD',
      {
        metadata: { weekStart: weekStart.toISOString() },
        idempotencyKey,
      }
    );

    expect(result1.success).toBe(true);

    // Second call (should be skipped)
    const result2 = await awardPointsForEvent(
      testUserId,
      testVentureId,
      'PERFECT_WEEK_EOD',
      {
        metadata: { weekStart: weekStart.toISOString() },
        idempotencyKey,
      }
    );

    expect(result2.success).toBe(true);
    expect(result2.skipped).toBe(true);

    // Verify only one event created
    const events = await prisma.gamificationEvent.findMany({
      where: {
        userId: testUserId,
        ventureId: testVentureId,
        type: 'PERFECT_WEEK_EOD',
      },
    });

    expect(events).toHaveLength(1);
  });

  it('should award first daily login only once per day (idempotent)', async () => {
    const { awardPointsForEvent } = await import('../../lib/gamification/awardPoints');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const idempotencyKey = `first_login_${testUserId}_${today.toISOString().split('T')[0]}`;

    // First call
    const result1 = await awardPointsForEvent(
      testUserId,
      testVentureId,
      'FIRST_DAILY_LOGIN',
      {
        metadata: { loginDate: today.toISOString().split('T')[0] },
        idempotencyKey,
      }
    );

    expect(result1.success).toBe(true);

    // Second call (should be skipped)
    const result2 = await awardPointsForEvent(
      testUserId,
      testVentureId,
      'FIRST_DAILY_LOGIN',
      {
        metadata: { loginDate: today.toISOString().split('T')[0] },
        idempotencyKey,
      }
    );

    expect(result2.success).toBe(true);
    expect(result2.skipped).toBe(true);

    // Verify only one event created
    const events = await prisma.gamificationEvent.findMany({
      where: {
        userId: testUserId,
        ventureId: testVentureId,
        type: 'FIRST_DAILY_LOGIN',
        createdAt: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    expect(events).toHaveLength(1);
  });
});