/**
 * Job Runner Utilities
 * 
 * Provides concurrency control, logging, and alerting for background jobs.
 */

import { prisma } from '@/lib/prisma';
import { JobName } from '@prisma/client';
import { acquireLock, releaseLock, type LockResult } from './distributedLock';
import { alertJobFailure } from './jobAlerts';

export interface JobRunOptions {
  jobName: JobName;
  jobKey: string; // Unique key for this job run (e.g., "CHURN_RECALC:2025-12-15")
  timeout?: number; // Job timeout in milliseconds (default: 1 hour)
  skipLock?: boolean; // Skip lock acquisition (for testing)
}

export interface JobRunResult<T = any> {
  success: boolean;
  result?: T;
  error?: string;
  jobRunLogId?: number;
  duration?: number;
}

/**
 * Run a job with concurrency control, logging, and alerting
 * 
 * @param options - Job run options
 * @param jobFn - Job function to execute
 * @returns Job run result
 */
export async function runJobWithControl<T = any>(
  options: JobRunOptions,
  jobFn: () => Promise<T>
): Promise<JobRunResult<T>> {
  const {
    jobName,
    jobKey,
    timeout = 3600000, // 1 hour default
    skipLock = false,
  } = options;

  const startedAt = new Date();
  let lockResult: LockResult | null = null;
  let jobRunLogId: number | undefined;

  try {
    // Acquire distributed lock
    if (!skipLock) {
      lockResult = await acquireLock(`job:${jobKey}`, {
        timeout,
        maxRetries: 0, // Don't retry - if lock held, skip this run
      });

      if (!lockResult.acquired) {
        console.log(`[jobRunner] Job ${jobName} (${jobKey}) already running, skipping`);
        return {
          success: false,
          error: 'Job already running (lock held)',
        };
      }
    }

    // Create job run log entry (RUNNING status)
    const jobRunLog = await prisma.jobRunLog.create({
      data: {
        jobName,
        status: 'RUNNING',
        startedAt,
        statsJson: JSON.stringify({ jobKey }),
      },
    });
    jobRunLogId = jobRunLog.id;

    console.log(`[jobRunner] Job ${jobName} (${jobKey}) started, logId: ${jobRunLogId}`);

    // Run job with timeout
    const jobPromise = jobFn();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Job ${jobName} timed out after ${timeout}ms`));
      }, timeout);
    });

    const result = await Promise.race([jobPromise, timeoutPromise]);
    const endedAt = new Date();
    const duration = endedAt.getTime() - startedAt.getTime();

    // Update job run log (SUCCESS)
    await prisma.jobRunLog.update({
      where: { id: jobRunLogId },
      data: {
        status: 'SUCCESS',
        endedAt,
        statsJson: JSON.stringify({
          jobKey,
          duration,
          result: typeof result === 'object' ? JSON.stringify(result) : String(result),
        }),
      },
    });

    console.log(`[jobRunner] Job ${jobName} (${jobKey}) completed successfully in ${duration}ms`);

    return {
      success: true,
      result,
      jobRunLogId,
      duration,
    };
  } catch (err: any) {
    const endedAt = new Date();
    const duration = endedAt.getTime() - startedAt.getTime();
    const errorMessage = err.message || 'Unknown error';

    console.error(`[jobRunner] Job ${jobName} (${jobKey}) failed:`, errorMessage);

    // Update job run log (ERROR)
    if (jobRunLogId) {
      await prisma.jobRunLog.update({
        where: { id: jobRunLogId },
        data: {
          status: 'ERROR',
          endedAt,
          error: errorMessage,
          statsJson: JSON.stringify({
            jobKey,
            duration,
            error: errorMessage,
          }),
        },
      });
    } else {
      // Create log entry if it wasn't created before
      await prisma.jobRunLog.create({
        data: {
          jobName,
          status: 'ERROR',
          startedAt,
          endedAt,
          error: errorMessage,
          statsJson: JSON.stringify({
            jobKey,
            duration,
            error: errorMessage,
          }),
        },
      });
    }

    // Alert on failure
    await alertJobFailure({
      jobName,
      jobKey,
      error: errorMessage,
      duration,
    }).catch(alertErr => {
      console.error('[jobRunner] Failed to send alert:', alertErr);
    });

    return {
      success: false,
      error: errorMessage,
      jobRunLogId,
      duration,
    };
  } finally {
    // Release lock
    if (lockResult?.acquired && lockResult.lockId) {
      await releaseLock(`job:${jobKey}`, lockResult.lockId);
    }
  }
}

/**
 * Check if a job is currently running
 */
export async function isJobRunning(jobKey: string): Promise<boolean> {
  const lockKey = `job:${jobKey}`;
  
  // Check for active job run log
  const activeRun = await prisma.jobRunLog.findFirst({
    where: {
      status: 'RUNNING',
      startedAt: {
        gte: new Date(Date.now() - 3600000), // Within last hour
      },
    },
    orderBy: { startedAt: 'desc' },
  });

  if (activeRun) {
    // Check if lock is held
    const { isLockHeld } = await import('./distributedLock');
    return await isLockHeld(lockKey);
  }

  return false;
}


