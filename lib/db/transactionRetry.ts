/**
 * Database Transaction Retry Utility
 * 
 * Wraps Prisma transactions with retry logic for transient failures
 * (deadlocks, connection timeouts, etc.)
 */

import { prisma } from '@/lib/prisma';
import { withRetry } from '@/lib/resilience/withRetry';

/**
 * Execute a Prisma transaction with retry logic
 * 
 * @param transactionFn - Transaction function to execute
 * @param options - Retry options
 * @returns Transaction result
 */
export async function transactionWithRetry<T>(
  transactionFn: (tx: typeof prisma) => Promise<T>,
  options?: {
    maxRetries?: number;
    delay?: number;
    backoff?: number;
  }
): Promise<T> {
  return withRetry(
    () => prisma.$transaction(transactionFn, {
      timeout: 30000, // 30 second timeout
    }),
    {
      maxRetries: options?.maxRetries ?? 3,
      initialDelay: options?.delay ?? 1000,
      backoffMultiplier: options?.backoff ?? 2,
      retryableErrors: (err: any) => {
        // Retry on deadlocks (PostgreSQL error code 40P01)
        if (err?.code === '40P01' || err?.code === 'P2034') {
          return true;
        }
        // Retry on connection errors
        if (err?.message?.includes('connection') || err?.message?.includes('timeout')) {
          return true;
        }
        // Don't retry on validation errors or other non-transient errors
        return false;
      },
    }
  );
}


