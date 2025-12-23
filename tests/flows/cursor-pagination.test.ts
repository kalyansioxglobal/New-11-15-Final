/**
 * Cursor Pagination Tests
 * 
 * These tests verify cursor-based pagination functionality.
 */

import { prisma } from '../../lib/prisma';
import { parseCursorParams, createCursorResponse } from '../../lib/pagination/cursor';

describe('Cursor Pagination', () => {
  let testVentureId: number;
  const testLoads: { id: number }[] = [];

  beforeAll(async () => {
    // Create test venture
    const venture = await prisma.venture.create({
      data: {
        name: 'Test Pagination Venture',
        type: 'LOGISTICS',
        isActive: true,
      },
    });
    testVentureId = venture.id;

    // Create 25 test loads
    for (let i = 0; i < 25; i++) {
      const load = await prisma.load.create({
        data: {
          ventureId: testVentureId,
          reference: `PAGINATION-${i}`,
          shipperName: `Shipper ${i}`,
          pickupCity: 'City A',
          dropCity: 'City B',
          status: 'OPEN',
          isTest: true,
        },
      });
      testLoads.push(load);
    }
  });

  afterAll(async () => {
    // Cleanup
    await prisma.load.deleteMany({
      where: { id: { in: testLoads.map(l => l.id) } },
    });
    await prisma.venture.delete({ where: { id: testVentureId } });
  });

  describe('parseCursorParams()', () => {
    it('should parse cursor and limit from query', () => {
      const query = { cursor: '123', limit: '50' };
      const result = parseCursorParams(query);
      expect(result.cursor).toBe(123);
      expect(result.limit).toBe(50);
    });

    it('should use default limit if not provided', () => {
      const query = { cursor: '123' };
      const result = parseCursorParams(query, { defaultLimit: 25 });
      expect(result.cursor).toBe(123);
      expect(result.limit).toBe(25);
    });

    it('should respect maxLimit', () => {
      const query = { limit: '500' };
      const result = parseCursorParams(query, { maxLimit: 200, defaultLimit: 50 });
      expect(result.limit).toBe(200);
    });

    it('should handle undefined cursor', () => {
      const query = { limit: '50' };
      const result = parseCursorParams(query);
      expect(result.cursor).toBeUndefined();
      expect(result.limit).toBe(50);
    });
  });

  describe('createCursorResponse()', () => {
    it('should return hasMore=true when items exceed limit', () => {
      const items = Array.from({ length: 11 }, (_, i) => ({ id: i + 1 }));
      const limit = 10;
      const result = createCursorResponse(items, limit);

      expect(result.items.length).toBe(10);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe(10);
    });

    it('should return hasMore=false when items equal limit', () => {
      const items = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));
      const limit = 10;
      const result = createCursorResponse(items, limit);

      expect(result.items.length).toBe(10);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('should return hasMore=false when items less than limit', () => {
      const items = Array.from({ length: 5 }, (_, i) => ({ id: i + 1 }));
      const limit = 10;
      const result = createCursorResponse(items, limit);

      expect(result.items.length).toBe(5);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('should set nextCursor to last item id when hasMore', () => {
      const items = Array.from({ length: 11 }, (_, i) => ({ id: i + 1 }));
      const limit = 10;
      const result = createCursorResponse(items, limit);

      expect(result.nextCursor).toBe(10); // Last item in returned array
    });
  });

  describe('Cursor Pagination - Database Integration', () => {
    it('should paginate loads using cursor', async () => {
      const limit = 10;
      
      // First page
      const firstPage = await prisma.load.findMany({
        where: { ventureId: testVentureId, isTest: true },
        take: limit + 1,
        orderBy: { id: 'asc' },
      });

      const firstResult = createCursorResponse(firstPage, limit);
      expect(firstResult.items.length).toBe(10);
      expect(firstResult.hasMore).toBe(true);
      expect(firstResult.nextCursor).toBeDefined();

      // Second page using cursor
      if (firstResult.nextCursor) {
        const secondPage = await prisma.load.findMany({
          where: { ventureId: testVentureId, isTest: true },
          take: limit + 1,
          cursor: { id: firstResult.nextCursor },
          skip: 1,
          orderBy: { id: 'asc' },
        });

        const secondResult = createCursorResponse(secondPage, limit);
        expect(secondResult.items.length).toBeGreaterThan(0);
        expect(secondResult.items[0].id).toBeGreaterThan(firstResult.nextCursor);
      }
    });

    it('should handle empty result set', async () => {
      const emptyResult = await prisma.load.findMany({
        where: { ventureId: testVentureId, reference: 'NONEXISTENT', isTest: true },
        take: 10 + 1,
        orderBy: { id: 'asc' },
      });

      const result = createCursorResponse(emptyResult, 10);
      expect(result.items.length).toBe(0);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });
  });
});


