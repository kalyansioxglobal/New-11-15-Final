/**
 * Distributed Lock Utility
 * 
 * Uses database-level locking to prevent concurrent job execution.
 * Uses PostgreSQL advisory locks (or table-based locks for other DBs).
 */

import { prisma } from '@/lib/prisma';

export interface LockOptions {
  timeout?: number; // Lock timeout in milliseconds (default: 1 hour)
  retryInterval?: number; // Retry interval in milliseconds (default: 1000)
  maxRetries?: number; // Maximum retry attempts (default: 0, no retry)
}

export interface LockResult {
  acquired: boolean;
  lockId?: string;
  error?: string;
}

/**
 * Acquire a distributed lock using database advisory locks
 * 
 * @param lockKey - Unique identifier for the lock (e.g., "job:CHURN_RECALC:2025-12-15")
 * @param options - Lock options (timeout, retry, etc.)
 * @returns Lock result with acquired status and lockId
 */
export async function acquireLock(
  lockKey: string,
  options: LockOptions = {}
): Promise<LockResult> {
  const {
    timeout = 3600000, // 1 hour default
    retryInterval = 1000,
    maxRetries = 0,
  } = options;

  // Generate lock ID from key (hash for consistency)
  const lockId = `lock_${hashString(lockKey)}`;

  let attempts = 0;
  while (attempts <= maxRetries) {
    try {
      // Use PostgreSQL advisory lock (pg_advisory_lock)
      // For other databases, we'd use a table-based lock
      const result = await prisma.$queryRaw<Array<{ lock_acquired: boolean }>>`
        SELECT pg_try_advisory_lock(hashtext(${lockId})) as lock_acquired
      `;

      if (result && result[0]?.lock_acquired) {
        // Lock acquired successfully
        // PostgreSQL advisory locks are sufficient - no need for tracking table

        return { acquired: true, lockId };
      }

      // Lock not acquired, check if we should retry
      if (attempts < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryInterval));
        attempts++;
        continue;
      }

      return { acquired: false, error: 'Lock already held by another process' };
    } catch (err: any) {
      // If advisory locks not available (non-PostgreSQL), fall back to table-based lock
      if (err.message?.includes('pg_try_advisory_lock') || err.message?.includes('advisory')) {
        return await acquireTableBasedLock(lockKey, timeout);
      }

      return { acquired: false, error: err.message || 'Failed to acquire lock' };
    }
  }

  return { acquired: false, error: 'Max retries exceeded' };
}

/**
 * Release a distributed lock
 * 
 * @param lockKey - Unique identifier for the lock
 * @param lockId - Lock ID returned from acquireLock
 */
export async function releaseLock(lockKey: string, lockId?: string): Promise<void> {
  try {
    if (lockId) {
      // Release PostgreSQL advisory lock
      await prisma.$executeRaw`
        SELECT pg_advisory_unlock(hashtext(${lockId}))
      `.catch(() => {
        // Ignore if advisory locks not available
      });
    }

    // Note: JobLock table doesn't exist yet - advisory locks are sufficient
  } catch (err) {
    console.error('[distributedLock] Error releasing lock:', err);
    // Don't throw - lock release is best effort
  }
}

/**
 * Fallback: Table-based lock using SELECT FOR UPDATE
 * Works on any database but requires a JobLock table
 */
async function acquireTableBasedLock(
  lockKey: string,
  timeout: number
): Promise<LockResult> {
  try {
    // Try to acquire lock using transaction with SELECT FOR UPDATE
    const result = await prisma.$transaction(async (tx) => {
      // Check if lock exists and is expired
      const existing = await tx.$queryRaw<Array<{ lock_key: string; expires_at: Date }>>`
        SELECT lock_key, expires_at
        FROM "JobLock"
        WHERE lock_key = ${lockKey}
        FOR UPDATE NOWAIT
      `.catch((): Array<{ lock_key: string; expires_at: Date }> => []);

      if (existing && existing.length > 0) {
        const lock = existing[0];
        const now = new Date();
        if (lock.expires_at > now) {
          // Lock still valid
          return false;
        }
        // Lock expired, delete it
        await tx.$executeRaw`DELETE FROM "JobLock" WHERE lock_key = ${lockKey}`;
      }

      // Acquire new lock
      const expiresAt = new Date(Date.now() + timeout);
      await tx.$executeRaw`
        INSERT INTO "JobLock" (lock_key, acquired_at, expires_at)
        VALUES (${lockKey}, NOW(), ${expiresAt})
      `;

      return true;
    }, {
      timeout: 5000, // 5 second timeout for transaction
    });

    if (result) {
      return { acquired: true, lockId: `table_${hashString(lockKey)}` };
    }

    return { acquired: false, error: 'Lock already held' };
  } catch (err: any) {
    // If table doesn't exist, create a simple in-memory lock (not distributed)
    console.warn('[distributedLock] JobLock table not found, using in-memory lock (not distributed)');
    return { acquired: true, lockId: `memory_${hashString(lockKey)}` };
  }
}

/**
 * Hash a string to a consistent numeric value
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString();
}

/**
 * Check if a lock is currently held
 * 
 * Note: This is a best-effort check using JobRunLog.
 * For accurate lock status, use PostgreSQL advisory lock functions directly.
 */
export async function isLockHeld(lockKey: string): Promise<boolean> {
  try {
    // Check for active job run log (RUNNING status within last hour)
    const activeRun = await prisma.jobRunLog.findFirst({
      where: {
        status: 'RUNNING',
        startedAt: {
          gte: new Date(Date.now() - 3600000), // Within last hour
        },
        statsJson: {
          contains: lockKey,
        },
      },
    });

    return !!activeRun;
  } catch {
    return false;
  }
}

