/**
 * Circuit Breaker
 * 
 * Prevents cascading failures by opening the circuit after repeated failures.
 * Lightweight in-memory implementation (can be extended to Redis for distributed systems).
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Number of failures before opening (default: 5)
  resetTimeout?: number; // Time in ms before attempting to close (default: 60000)
  halfOpenMaxCalls?: number; // Max calls in HALF_OPEN state (default: 1)
}

export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: CircuitState = 'CLOSED';
  private halfOpenCalls = 0;
  private successCount = 0;

  constructor(
    private name: string,
    private options: CircuitBreakerOptions = {}
  ) {
    const {
      failureThreshold = 5,
      resetTimeout = 60000, // 1 minute
      halfOpenMaxCalls = 1,
    } = options;

    this.options = {
      failureThreshold,
      resetTimeout,
      halfOpenMaxCalls,
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure > this.options.resetTimeout!) {
        this.state = 'HALF_OPEN';
        this.halfOpenCalls = 0;
        this.successCount = 0;
        console.log(`[circuitBreaker] ${this.name}: OPEN → HALF_OPEN`);
      } else {
        const remainingTime = Math.ceil((this.options.resetTimeout! - timeSinceLastFailure) / 1000);
        throw new Error(`Circuit breaker ${this.name} is OPEN (retry in ${remainingTime}s)`);
      }
    }

    // Check if HALF_OPEN state has exceeded max calls
    if (this.state === 'HALF_OPEN') {
      if (this.halfOpenCalls >= this.options.halfOpenMaxCalls!) {
        throw new Error(`Circuit breaker ${this.name} is HALF_OPEN (max calls reached)`);
      }
      this.halfOpenCalls++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.failures = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      // If we get a success in HALF_OPEN, close the circuit
      if (this.successCount >= this.options.halfOpenMaxCalls!) {
        this.state = 'CLOSED';
        this.halfOpenCalls = 0;
        this.successCount = 0;
        console.log(`[circuitBreaker] ${this.name}: HALF_OPEN → CLOSED (recovered)`);
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      // Any failure in HALF_OPEN immediately opens the circuit
      this.state = 'OPEN';
      this.halfOpenCalls = 0;
      this.successCount = 0;
      console.warn(`[circuitBreaker] ${this.name}: HALF_OPEN → OPEN (failure in half-open)`);
    } else if (this.state === 'CLOSED' && this.failures >= this.options.failureThreshold!) {
      // Too many failures, open the circuit
      this.state = 'OPEN';
      console.error(`[circuitBreaker] ${this.name}: CLOSED → OPEN (${this.failures} failures)`);
    }
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get failure count
   */
  getFailureCount(): number {
    return this.failures;
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.halfOpenCalls = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    console.log(`[circuitBreaker] ${this.name}: Manually reset to CLOSED`);
  }
}

/**
 * Circuit breaker instances (singleton per service)
 */
const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Get or create a circuit breaker instance
 */
export function getCircuitBreaker(
  name: string,
  options?: CircuitBreakerOptions
): CircuitBreaker {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, new CircuitBreaker(name, options));
  }
  return circuitBreakers.get(name)!;
}


