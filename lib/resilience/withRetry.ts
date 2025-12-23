/**
 * Retry Utility
 * 
 * Provides exponential backoff retry logic for external API calls.
 */

export interface RetryOptions {
  maxRetries?: number; // Maximum number of retries (default: 3)
  initialDelay?: number; // Initial delay in milliseconds (default: 1000)
  maxDelay?: number; // Maximum delay in milliseconds (default: 30000)
  backoffMultiplier?: number; // Backoff multiplier (default: 2)
  retryableErrors?: (error: any) => boolean; // Function to determine if error is retryable
}

/**
 * Retry a function with exponential backoff
 * 
 * @param fn - Function to retry
 * @param options - Retry options
 * @returns Result of the function
 * @throws Last error if all retries fail
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    retryableErrors = (err: any) => {
      // Default: retry on network errors, 5xx errors, rate limits
      if (!err) return false;
      
      // Network errors
      if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
        return true;
      }
      
      // HTTP status codes
      if (err.status || err.response?.status) {
        const status = err.status || err.response.status;
        // Retry on 5xx errors and 429 (rate limit)
        if (status >= 500 || status === 429) {
          return true;
        }
      }
      
      // Twilio/SendGrid specific errors
      if (err.message?.includes('rate limit') || err.message?.includes('Rate limit')) {
        return true;
      }
      
      return false;
    },
  } = options;

  let lastError: any;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry if this is the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Don't retry if error is not retryable
      if (!retryableErrors(error)) {
        throw error;
      }

      // Log retry attempt
      console.warn(`[withRetry] Attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${delay}ms:`, {
        error: error.message || String(error),
        stack: error.stack,
      });

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));

      // Calculate next delay with exponential backoff
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  // All retries exhausted
  console.error(`[withRetry] All ${maxRetries + 1} attempts failed:`, {
    error: lastError?.message || String(lastError),
    stack: lastError?.stack,
  });

  throw lastError;
}

/**
 * Retry with custom error handling
 */
export async function withRetryAndLog<T>(
  fn: () => Promise<T>,
  context: { operation: string; [key: string]: any },
  options: RetryOptions = {}
): Promise<T> {
  const { operation, ...metadata } = context;

  try {
    return await withRetry(fn, options);
  } catch (error: any) {
    console.error(`[withRetry] Operation failed after retries:`, {
      operation,
      ...metadata,
      error: error.message || String(error),
      attempts: (options.maxRetries || 3) + 1,
    });
    throw error;
  }
}


