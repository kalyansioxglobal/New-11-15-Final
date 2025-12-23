import sgMail from "@sendgrid/mail";
import { withRetry } from "@/lib/resilience/withRetry";
import { getCircuitBreaker } from "@/lib/resilience/circuitBreaker";

export interface SendGridRecipient {
  email: string;
  name?: string;
}

export interface SendEmailBatchParams {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  subject: string;
  html: string;
  recipients: SendGridRecipient[];
}

export interface SendEmailResult {
  email: string;
  success: boolean;
  error?: string;
}

/**
 * Send email batch via SendGrid with retry logic and circuit breaker protection
 */
export async function sendEmailBatch(
  params: SendEmailBatchParams
): Promise<SendEmailResult[]> {
  const { apiKey, fromEmail, fromName, subject, html, recipients } = params;

  if (!recipients.length) {
    return [];
  }

  sgMail.setApiKey(apiKey);

  const circuitBreaker = getCircuitBreaker('sendgrid', {
    failureThreshold: 5,
    resetTimeout: 60000, // 1 minute
  });

  const results: SendEmailResult[] = [];

  for (const recipient of recipients) {
    try {
      await circuitBreaker.execute(async () => {
        return await withRetry(
          async () => {
            await sgMail.send({
              to: recipient.email,
              from: { email: fromEmail, name: fromName },
              subject,
              html,
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
              if (err.code || err.response) {
                const status = err.code || err.response?.statusCode || err.response?.status;
                if (status >= 500 || status === 429) {
                  return true;
                }
              }
              if (err.message?.includes('rate limit') || err.message?.includes('Rate limit')) {
                return true;
              }
              return false;
            },
          }
        );
      });

      results.push({ email: recipient.email, success: true });
    } catch (error: any) {
      const errorMessage = error?.message || "Unknown error";
      
      // Log circuit breaker state if open
      if (circuitBreaker.getState() === 'OPEN') {
        console.error(`[sendgrid] Circuit breaker OPEN, email not sent:`, {
          email: recipient.email,
          circuitState: circuitBreaker.getState(),
        });
      }

      results.push({
        email: recipient.email,
        success: false,
        error: errorMessage,
      });
    }
  }

  return results;
}
