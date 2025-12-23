/**
 * Simple In-Memory Cache
 * 
 * Lightweight caching utility for response caching.
 * Can be extended to Redis for distributed caching.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);

    // Clear interval on process exit to prevent memory leaks
    if (typeof process !== 'undefined') {
      process.on('exit', () => {
        this.destroy();
      });
    }
  }

  /**
   * Destroy the cache and clear the cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set value in cache with TTL (time to live in seconds)
   */
  set<T>(key: string, value: T, ttlSeconds: number): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Delete value from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

// Singleton instance
const cache = new SimpleCache();

/**
 * Get cached value or compute and cache it
 * 
 * @param key - Cache key
 * @param ttlSeconds - Time to live in seconds
 * @param fn - Function to compute value if not cached
 * @returns Cached or computed value
 */
export async function getCached<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  const value = await fn();
  cache.set(key, value, ttlSeconds);
  return value;
}

/**
 * Invalidate cache entry
 */
export function invalidateCache(key: string): void {
  cache.delete(key);
}

/**
 * Invalidate cache entries matching a pattern (simple prefix match)
 */
export function invalidateCachePattern(prefix: string): void {
  // Simple implementation: iterate and delete matching keys
  // For production, consider using Redis with pattern matching
  const keysToDelete: string[] = [];
  for (const key of cache['cache'].keys()) {
    if (key.startsWith(prefix)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => cache.delete(key));
}

/**
 * Clear all cache
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number } {
  return {
    size: cache.size(),
  };
}

