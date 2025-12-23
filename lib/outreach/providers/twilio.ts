import twilio from "twilio";
import { withRetry } from "@/lib/resilience/withRetry";
import { getCircuitBreaker } from "@/lib/resilience/circuitBreaker";

export interface SendSmsRecipient {
  phone: string;
}

export interface SendSmsBatchParams {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  body: string;
  recipients: SendSmsRecipient[];
}

export interface SendSmsResult {
  phone: string;
  success: boolean;
  messageSid?: string;
  error?: string;
}

/**
 * Send SMS batch via Twilio with retry logic and circuit breaker protection
 */
export async function sendSmsBatch(
  params: SendSmsBatchParams
): Promise<SendSmsResult[]> {
  const { accountSid, authToken, fromNumber, body, recipients } = params;

  if (!recipients.length) {
    return [];
  }

  const client = twilio(accountSid, authToken);
  const circuitBreaker = getCircuitBreaker('twilio', {
    failureThreshold: 5,
    resetTimeout: 60000, // 1 minute
  });

  const results: SendSmsResult[] = [];

  for (const recipient of recipients) {
    try {
      const message = await circuitBreaker.execute(async () => {
        return await withRetry(
          async () => {
            return await client.messages.create({
              body,
              from: fromNumber,
              to: recipient.phone,
            });
          },
          {
            maxRetries: 3,
            initialDelay: 1000,
            maxDelay: 10000,
            retryableErrors: (err: any) => {
              // Retry on network errors, 5xx errors, and rate limits
              if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
                return true;
              }
              // Twilio error codes: 20003 (Unreachable destination), 20429 (Too Many Requests)
              if (err.code === 20003 || err.code === 20429) {
                return true;
              }
              if (err.status >= 500 || err.status === 429) {
                return true;
              }
              if (err.message?.includes('rate limit') || err.message?.includes('Rate limit')) {
                return true;
              }
              return false;
            },
          }
        );
      });

      results.push({
        phone: recipient.phone,
        success: true,
        messageSid: message.sid,
      });
    } catch (error: any) {
      const errorMessage = error?.message || "Unknown error";
      
      // Log circuit breaker state if open
      if (circuitBreaker.getState() === 'OPEN') {
        console.error(`[twilio] Circuit breaker OPEN, SMS not sent:`, {
          phone: recipient.phone,
          circuitState: circuitBreaker.getState(),
        });
      }

      results.push({
        phone: recipient.phone,
        success: false,
        error: errorMessage,
      });
    }
  }

  return results;
}
