/**
 * Resilience Tests
 * 
 * These tests verify retry logic and circuit breaker functionality.
 */

import { withRetry } from '../../lib/resilience/withRetry';
import { getCircuitBreaker, CircuitBreaker } from '../../lib/resilience/circuitBreaker';

describe('Resilience - Retry Logic', () => {
  describe('withRetry()', () => {
    it('should succeed on first attempt', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        return { success: true, attempts: callCount };
      };

      const result = await withRetry(fn, { maxRetries: 3 });
      expect(result.success).toBe(true);
      expect(callCount).toBe(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Temporary failure');
        }
        return { success: true, attempts: callCount };
      };

      const result = await withRetry(fn, {
        maxRetries: 3,
        initialDelay: 10, // Short delay for tests
      });

      expect(result.success).toBe(true);
      expect(callCount).toBe(3);
    });

    it('should fail after max retries', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        throw new Error('Permanent failure');
      };

      await expect(
        withRetry(fn, {
          maxRetries: 3,
          initialDelay: 10,
        })
      ).rejects.toThrow('Permanent failure');

      expect(callCount).toBe(4); // Initial + 3 retries
    });

    it('should not retry non-retryable errors', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        const error: any = new Error('Not retryable');
        error.status = 400; // 4xx errors are not retryable by default
        throw error;
      };

      await expect(
        withRetry(fn, {
          maxRetries: 3,
          initialDelay: 10,
        })
      ).rejects.toThrow('Not retryable');

      expect(callCount).toBe(1); // Should not retry
    });

    it('should retry on retryable errors', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        if (callCount < 2) {
          const error: any = new Error('Server error');
          error.status = 500; // 5xx errors are retryable
          throw error;
        }
        return { success: true };
      };

      const result = await withRetry(fn, {
        maxRetries: 3,
        initialDelay: 10,
      });

      expect(result.success).toBe(true);
      expect(callCount).toBe(2);
    });
  });
});

describe('Resilience - Circuit Breaker', () => {
  beforeEach(() => {
    // Reset circuit breaker
    const breaker = getCircuitBreaker('test-circuit');
    breaker.reset();
  });

  describe('CircuitBreaker - Success Path', () => {
    it('should execute function when circuit is CLOSED', async () => {
      const breaker = getCircuitBreaker('test-success');
      let callCount = 0;

      const fn = async () => {
        callCount++;
        return { success: true };
      };

      const result = await breaker.execute(fn);
      expect(result.success).toBe(true);
      expect(callCount).toBe(1);
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should remain CLOSED after successful calls', async () => {
      const breaker = getCircuitBreaker('test-stable');
      const fn = async () => ({ success: true });

      for (let i = 0; i < 10; i++) {
        await breaker.execute(fn);
      }

      expect(breaker.getState()).toBe('CLOSED');
      expect(breaker.getFailureCount()).toBe(0);
    });
  });

  describe('CircuitBreaker - Failure Path', () => {
    it('should open circuit after threshold failures', async () => {
      const breaker = getCircuitBreaker('test-failure', {
        failureThreshold: 3,
        resetTimeout: 1000,
      });

      const fn = async () => {
        throw new Error('Service down');
      };

      // First 3 failures should execute
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(fn)).rejects.toThrow('Service down');
      }

      // Circuit should now be OPEN
      expect(breaker.getState()).toBe('OPEN');

      // Next call should fail immediately without executing
      await expect(breaker.execute(fn)).rejects.toThrow('Circuit breaker');
    });

    it('should transition to HALF_OPEN after reset timeout', async () => {
      const breaker = getCircuitBreaker('test-half-open', {
        failureThreshold: 2,
        resetTimeout: 100, // Short timeout for tests
      });

      const fn = async () => {
        throw new Error('Service down');
      };

      // Cause circuit to open
      for (let i = 0; i < 2; i++) {
        await expect(breaker.execute(fn)).rejects.toThrow();
      }
      expect(breaker.getState()).toBe('OPEN');

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Next call should transition to HALF_OPEN
      await expect(breaker.execute(fn)).rejects.toThrow();
      expect(breaker.getState()).toBe('HALF_OPEN');
    });

    it('should close circuit after successful call in HALF_OPEN', async () => {
      const breaker = getCircuitBreaker('test-recovery', {
        failureThreshold: 2,
        resetTimeout: 100,
        halfOpenMaxCalls: 1,
      });

      const failFn = async () => {
        throw new Error('Service down');
      };

      const successFn = async () => {
        return { success: true };
      };

      // Cause circuit to open
      for (let i = 0; i < 2; i++) {
        await expect(breaker.execute(failFn)).rejects.toThrow();
      }
      expect(breaker.getState()).toBe('OPEN');

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Successful call in HALF_OPEN should close circuit
      const result = await breaker.execute(successFn);
      expect(result.success).toBe(true);
      expect(breaker.getState()).toBe('CLOSED');
    });
  });

  describe('CircuitBreaker - Singleton Pattern', () => {
    it('should return same instance for same name', () => {
      const breaker1 = getCircuitBreaker('singleton-test');
      const breaker2 = getCircuitBreaker('singleton-test');

      expect(breaker1).toBe(breaker2);
    });

    it('should return different instances for different names', () => {
      const breaker1 = getCircuitBreaker('test-1');
      const breaker2 = getCircuitBreaker('test-2');

      expect(breaker1).not.toBe(breaker2);
    });
  });
});


