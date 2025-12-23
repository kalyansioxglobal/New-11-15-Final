/**
 * Venture Isolation Tests
 * 
 * These tests verify that users can only access data from ventures they are assigned to.
 * Tests cross-venture data leakage prevention.
 */

import { prisma } from '../../lib/prisma';
import { getUserScope } from '../../lib/scope';

describe('Venture Isolation', () => {
  let ventureA: { id: number };
  let ventureB: { id: number };
  let userA: { id: number; email: string };
  let userB: { id: number; email: string };
  let loadA: { id: number };
  let loadB: { id: number };

  beforeAll(async () => {
    // Create two test ventures
    ventureA = await prisma.venture.create({
      data: {
        name: 'Test Venture A',
        type: 'LOGISTICS',
        isActive: true,
      },
    });

    ventureB = await prisma.venture.create({
      data: {
        name: 'Test Venture B',
        type: 'LOGISTICS',
        isActive: true,
      },
    });

    // Create user A assigned to venture A only
    const userA_data = await prisma.user.create({
      data: {
        email: `venture-isolation-user-a-${Date.now()}@test.com`,
        fullName: 'Venture A User',
        role: 'EMPLOYEE',
        ventures: {
          create: { ventureId: ventureA.id },
        },
      },
      include: { ventures: true },
    });
    userA = userA_data;

    // Create user B assigned to venture B only
    const userB_data = await prisma.user.create({
      data: {
        email: `venture-isolation-user-b-${Date.now()}@test.com`,
        fullName: 'Venture B User',
        role: 'EMPLOYEE',
        ventures: {
          create: { ventureId: ventureB.id },
        },
      },
      include: { ventures: true },
    });
    userB = userB_data;

    // Create load in venture A
    loadA = await prisma.load.create({
      data: {
        ventureId: ventureA.id,
        reference: 'LOAD-A-001',
        shipperName: 'Shipper A',
        pickupCity: 'City A',
        dropCity: 'City B',
        status: 'OPEN',
        isTest: true,
      },
    });

    // Create load in venture B
    loadB = await prisma.load.create({
      data: {
        ventureId: ventureB.id,
        reference: 'LOAD-B-001',
        shipperName: 'Shipper B',
        pickupCity: 'City C',
        dropCity: 'City D',
        status: 'OPEN',
        isTest: true,
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.load.deleteMany({
      where: { id: { in: [loadA.id, loadB.id] } },
    });
    await prisma.ventureUser.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userA.id, userB.id] } },
    });
    await prisma.venture.deleteMany({
      where: { id: { in: [ventureA.id, ventureB.id] } },
    });
  });

  describe('getUserScope() - Venture Isolation', () => {
    it('should return only venture A for user A', () => {
      const scope = getUserScope(userA);
      expect(scope.ventureIds).toContain(ventureA.id);
      expect(scope.ventureIds).not.toContain(ventureB.id);
      expect(scope.allVentures).toBe(false);
    });

    it('should return only venture B for user B', () => {
      const scope = getUserScope(userB);
      expect(scope.ventureIds).toContain(ventureB.id);
      expect(scope.ventureIds).not.toContain(ventureA.id);
      expect(scope.allVentures).toBe(false);
    });
  });

  describe('Load Access - Venture Isolation', () => {
    it('user A should only see loads from venture A', async () => {
      const scope = getUserScope(userA);
      const loads = await prisma.load.findMany({
        where: {
          ventureId: { in: scope.ventureIds },
          isTest: true,
        },
      });

      expect(loads.length).toBeGreaterThan(0);
      expect(loads.every(l => l.ventureId === ventureA.id)).toBe(true);
      expect(loads.some(l => l.ventureId === ventureB.id)).toBe(false);
    });

    it('user B should only see loads from venture B', async () => {
      const scope = getUserScope(userB);
      const loads = await prisma.load.findMany({
        where: {
          ventureId: { in: scope.ventureIds },
          isTest: true,
        },
      });

      expect(loads.length).toBeGreaterThan(0);
      expect(loads.every(l => l.ventureId === ventureB.id)).toBe(true);
      expect(loads.some(l => l.ventureId === ventureA.id)).toBe(false);
    });

    it('user A should not be able to access load from venture B', async () => {
      const scope = getUserScope(userA);
      const load = await prisma.load.findFirst({
        where: {
          id: loadB.id,
          ventureId: { in: scope.ventureIds },
        },
      });

      expect(load).toBeNull();
    });

    it('user B should not be able to access load from venture A', async () => {
      const scope = getUserScope(userB);
      const load = await prisma.load.findFirst({
        where: {
          id: loadA.id,
          ventureId: { in: scope.ventureIds },
        },
      });

      expect(load).toBeNull();
    });
  });
});


