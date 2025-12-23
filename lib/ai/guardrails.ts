import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { aiConfig } from "@/lib/config/ai";

export type GuardrailResult = {
  allowed: boolean;
  reason?: string;
  sanitizedInput?: string;
  sanitizedBody?: Record<string, unknown>;
};

export type AiUsageRecord = {
  userId: number;
  endpoint: string;
  tokensEstimated: number;
  timestamp: Date;
};

const BLOCKED_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?)/i,
  /disregard\s+(all\s+)?(previous|prior|above)/i,
  /forget\s+(everything|all|your)\s+(you|instructions?|rules?)/i,
  /you\s+are\s+now\s+(a|an|the)/i,
  /pretend\s+(to\s+be|you\s+are)/i,
  /act\s+as\s+(if|though)\s+you/i,
  /bypass\s+(your|the|all)\s+(rules?|restrictions?|safety)/i,
  /override\s+(your|the|all)\s+(programming|instructions?)/i,
  /jailbreak/i,
  /DAN\s*mode/i,
  /developer\s*mode/i,
  /<\/?script\s*>/i,
  /javascript:/i,
  /data:text\/html/i,
  /on\w+\s*=/i,
  /break\s+character/i,
  /system\s+override/i,
  /new\s+instructions?/i,
  /roleplay\s+as/i,
  /speak\s+as\s+(if|though)/i,
  /\[\[system\]\]/i,
  /\[\[user\]\]/i,
  /\[\[assistant\]\]/i,
  /base64[:\s]/i,
  /eval\s*\(/i,
  /exec\s*\(/i,
  /\$\{.*\}/,
  /`[^`]*`/,
];

const SENSITIVE_OUTPUT_PATTERNS = [
  /api[_\-\s]?key/i,
  /secret[_\-\s]?key/i,
  /password/i,
  /bearer\s+[a-zA-Z0-9\-_.]+/i,
  /sk-[a-zA-Z0-9]{20,}/,
  /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/i,
  /process\.env\./i,
  /DATABASE_URL/i,
];

const AI_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const AI_RATE_LIMIT_MAX_REQUESTS = 10;

export async function checkRateLimit(userId: number, endpoint: string): Promise<GuardrailResult> {
  const windowStart = new Date(Date.now() - AI_RATE_LIMIT_WINDOW_MS);
  
  try {
    const recentCalls = await prisma.aiUsageLog.count({
      where: {
        userId,
        endpoint,
        createdAt: { gte: windowStart },
      },
    });

    if (recentCalls >= AI_RATE_LIMIT_MAX_REQUESTS) {
      return {
        allowed: false,
        reason: `AI rate limit exceeded. Please wait before trying again (max ${AI_RATE_LIMIT_MAX_REQUESTS} requests per minute).`,
      };
    }

    return { allowed: true };
  } catch (err) {
    logger.error("ai_rate_limit_check_failed", { userId, endpoint, error: String(err) });
    return { allowed: true };
  }
}

export function sanitizeInput(input: string): GuardrailResult {
  if (!input || typeof input !== "string") {
    return { allowed: true, sanitizedInput: "" };
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(input)) {
      logger.warn("ai_guardrail_blocked", {
        reason: "prompt_injection_detected",
        pattern: pattern.source,
      });
      return {
        allowed: false,
        reason: "Your request contains patterns that are not allowed. Please rephrase your request.",
      };
    }
  }

  let sanitized = input
    .replace(/<[^>]*>/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();

  if (sanitized.length > 10000) {
    sanitized = sanitized.slice(0, 10000);
  }

  return { allowed: true, sanitizedInput: sanitized };
}

export function filterOutput(output: string): string {
  if (!output || typeof output !== "string") {
    return output;
  }

  let filtered = output;

  for (const pattern of SENSITIVE_OUTPUT_PATTERNS) {
    filtered = filtered.replace(pattern, "[REDACTED]");
  }

  filtered = filtered.replace(/sk-[a-zA-Z0-9]{20,}/g, "[REDACTED_API_KEY]");
  filtered = filtered.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, (match) => {
    if (match.includes("siox") || match.includes("example.com")) {
      return match;
    }
    const [local, domain] = match.split("@");
    return `${local[0]}***@${domain}`;
  });

  return filtered;
}

export async function checkDailyUsageLimit(userId: number): Promise<GuardrailResult> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const usageCount = await prisma.aiUsageLog.count({
      where: {
        userId,
        createdAt: {
          gte: today,
        },
      },
    });

    if (usageCount >= aiConfig.maxDailyCalls) {
      return {
        allowed: false,
        reason: `Daily AI usage limit (${aiConfig.maxDailyCalls} calls) exceeded. Please try again tomorrow.`,
      };
    }

    return { allowed: true };
  } catch (err) {
    logger.error("ai_daily_limit_check_failed", { userId, error: String(err) });
    return { allowed: true };
  }
}

export async function logAiUsage(params: {
  userId: number;
  endpoint: string;
  tokensEstimated: number;
  inputLength: number;
  outputLength: number;
  success: boolean;
  errorType?: string;
  requestId?: string;
}): Promise<void> {
  try {
    await prisma.aiUsageLog.create({
      data: {
        userId: params.userId,
        endpoint: params.endpoint,
        tokensEstimated: params.tokensEstimated,
        inputLength: params.inputLength,
        outputLength: params.outputLength,
        success: params.success,
        errorType: params.errorType || null,
        requestId: params.requestId || null,
      },
    });
  } catch (err) {
    logger.error("ai_usage_log_failed", { ...params, error: String(err) });
  }
}

export function sanitizeBodyField(value: unknown): unknown {
  if (typeof value === "string") {
    const result = sanitizeInput(value);
    if (!result.allowed) {
      return "";
    }
    return result.sanitizedInput || value;
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeBodyField);
  }
  if (value && typeof value === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      sanitized[k] = sanitizeBodyField(v);
    }
    return sanitized;
  }
  return value;
}

export function sanitizeBody(body: Record<string, unknown>): { allowed: boolean; sanitizedBody: Record<string, unknown>; blockedField?: string } {
  const allInputText = JSON.stringify(body);
  
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(allInputText)) {
      logger.warn("ai_body_blocked", { pattern: pattern.source });
      return { allowed: false, sanitizedBody: {}, blockedField: pattern.source };
    }
  }
  
  const sanitizedBody = sanitizeBodyField(body) as Record<string, unknown>;
  return { allowed: true, sanitizedBody };
}

export async function runAllGuardrails(params: {
  userId: number;
  endpoint: string;
  input: string;
  body?: Record<string, unknown>;
}): Promise<GuardrailResult & { sanitizedInput?: string; sanitizedBody?: Record<string, unknown> }> {
  const { userId, endpoint, input, body } = params;

  const rateLimitResult = await checkRateLimit(userId, endpoint);
  if (!rateLimitResult.allowed) {
    logger.warn("ai_rate_limit_hit", { userId, endpoint });
    return rateLimitResult;
  }

  const dailyLimitResult = await checkDailyUsageLimit(userId);
  if (!dailyLimitResult.allowed) {
    logger.warn("ai_daily_limit_hit", { userId, endpoint });
    return dailyLimitResult;
  }

  const sanitizeResult = sanitizeInput(input);
  if (!sanitizeResult.allowed) {
    logger.warn("ai_input_blocked", { userId, endpoint });
    return sanitizeResult;
  }

  let sanitizedBody: Record<string, unknown> | undefined;
  if (body) {
    const bodyResult = sanitizeBody(body);
    if (!bodyResult.allowed) {
      logger.warn("ai_body_blocked", { userId, endpoint, field: bodyResult.blockedField });
      return { allowed: false, reason: "Your request contains patterns that are not allowed. Please rephrase your request." };
    }
    sanitizedBody = bodyResult.sanitizedBody;
  }

  return {
    allowed: true,
    sanitizedInput: sanitizeResult.sanitizedInput,
    sanitizedBody,
  };
}

export function validateAiEnabled(): GuardrailResult {
  if (!aiConfig.enabled) {
    return {
      allowed: false,
      reason: "AI features are currently disabled.",
    };
  }
  return { allowed: true };
}

export function validateAiFeatureEnabled(feature: "freightAssistant"): GuardrailResult {
  if (feature === "freightAssistant" && !aiConfig.freightAssistantEnabled) {
    return {
      allowed: false,
      reason: "This AI feature is currently disabled.",
    };
  }
  return { allowed: true };
}
