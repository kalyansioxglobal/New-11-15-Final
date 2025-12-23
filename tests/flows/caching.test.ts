/**
 * Caching Tests
 * 
 * These tests verify in-memory cache functionality.
 */

import { getCached, invalidateCache, clearCache, getCacheStats } from '../../lib/cache/simple';

describe('Caching', () => {
  beforeEach(() => {
    clearCache();
  });

  describe('getCached()', () => {
    it('should cache and return value', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        return { data: 'test', count: callCount };
      };

      const result1 = await getCached('test-key', 60, fn);
      const result2 = await getCached('test-key', 60, fn);

      expect(result1.data).toBe('test');
      expect(result2.data).toBe('test');
      expect(callCount).toBe(1); // Function should only be called once
      expect(result1.count).toBe(1);
      expect(result2.count).toBe(1); // Cached value, same count
    });

    it('should expire cache after TTL', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        return { data: 'test', count: callCount };
      };

      // First call
      const result1 = await getCached('test-key-ttl', 1, fn); // 1 second TTL
      expect(callCount).toBe(1);

      // Second call immediately (should be cached)
      const result2 = await getCached('test-key-ttl', 1, fn);
      expect(callCount).toBe(1);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Third call after expiration (should call function again)
      const result3 = await getCached('test-key-ttl', 1, fn);
      expect(callCount).toBe(2);
      expect(result3.count).toBe(2);
    });

    it('should handle different keys independently', async () => {
      let callCountA = 0;
      let callCountB = 0;

      const fnA = async () => {
        callCountA++;
        return { key: 'A', count: callCountA };
      };

      const fnB = async () => {
        callCountB++;
        return { key: 'B', count: callCountB };
      };

      const resultA1 = await getCached('key-a', 60, fnA);
      const resultB1 = await getCached('key-b', 60, fnB);
      const resultA2 = await getCached('key-a', 60, fnA);
      const resultB2 = await getCached('key-b', 60, fnB);

      expect(callCountA).toBe(1);
      expect(callCountB).toBe(1);
      expect(resultA1.key).toBe('A');
      expect(resultB1.key).toBe('B');
      expect(resultA2.count).toBe(1);
      expect(resultB2.count).toBe(1);
    });

    it('should handle errors in function', async () => {
      const fn = async () => {
        throw new Error('Test error');
      };

      await expect(getCached('error-key', 60, fn)).rejects.toThrow('Test error');
    });
  });

  describe('invalidateCache()', () => {
    it('should invalidate specific cache key', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        return { data: 'test', count: callCount };
      };

      // Cache value
      await getCached('invalidate-key', 60, fn);
      expect(callCount).toBe(1);

      // Get cached value
      await getCached('invalidate-key', 60, fn);
      expect(callCount).toBe(1);

      // Invalidate
      invalidateCache('invalidate-key');

      // Get again (should call function)
      await getCached('invalidate-key', 60, fn);
      expect(callCount).toBe(2);
    });

    it('should not affect other cache keys', async () => {
      let callCountA = 0;
      let callCountB = 0;

      const fnA = async () => {
        callCountA++;
        return { key: 'A', count: callCountA };
      };

      const fnB = async () => {
        callCountB++;
        return { key: 'B', count: callCountB };
      };

      // Cache both
      await getCached('key-a', 60, fnA);
      await getCached('key-b', 60, fnB);

      // Invalidate only key-a
      invalidateCache('key-a');

      // Get both again
      await getCached('key-a', 60, fnA);
      await getCached('key-b', 60, fnB);

      expect(callCountA).toBe(2); // Called again
      expect(callCountB).toBe(1); // Still cached
    });
  });

  describe('getCacheStats()', () => {
    it('should return cache size', async () => {
      const fn = async () => ({ data: 'test' });

      expect(getCacheStats().size).toBe(0);

      await getCached('key-1', 60, fn);
      await getCached('key-2', 60, fn);
      await getCached('key-3', 60, fn);

      expect(getCacheStats().size).toBe(3);
    });
  });
});


