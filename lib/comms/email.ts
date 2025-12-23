import sgMail from "@sendgrid/mail";
import { prisma } from "@/lib/prisma";

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY is not set");
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  venture?: string;
  relatedLoadId?: number;
  sentByUserId?: number;
  sentByAgent?: boolean;
};

export async function sendAndLogEmail(params: SendEmailParams) {
  const {
    to,
    subject,
    html,
    text,
    from = "noreply@sioxglobal.com",
    venture,
    relatedLoadId,
    sentByUserId,
    sentByAgent = false,
  } = params;

  let status = "SENT";
  let errorMessage: string | undefined;

  try {
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error("Missing SENDGRID_API_KEY");
    }

    const { withRetry } = await import('@/lib/resilience/withRetry');
    const { getCircuitBreaker } = await import('@/lib/resilience/circuitBreaker');
    
    const circuitBreaker = getCircuitBreaker('sendgrid', {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
    });

    await circuitBreaker.execute(async () => {
      return await withRetry(
        async () => {
          await sgMail.send({
            to,
            from,
            subject,
            html,
            text: text ?? html.replace(/<[^>]+>/g, "").slice(0, 2000),
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
  } catch (err: any) {
    console.error("Error sending email:", err);
    status = "FAILED";
    errorMessage = err?.message ?? "Unknown error";
  }

  const preview = html.replace(/<[^>]+>/g, "").slice(0, 200);

  await prisma.emailLog.create({
    data: {
      venture,
      fromAddress: from,
      toAddress: to,
      subject,
      bodyPreview: preview,
      relatedLoadId: relatedLoadId ?? null,
      sentByUserId: sentByUserId ?? null,
      sentByAgent,
      status,
      errorMessage,
    },
  });

  return { status, errorMessage };
}
