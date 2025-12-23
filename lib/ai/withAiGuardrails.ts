import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/apiAuth";
import { generateRequestId } from "@/lib/requestId";
import { logger } from "@/lib/logger";
import {
  runAllGuardrails,
  logAiUsage,
  filterOutput,
  validateAiEnabled,
  validateAiFeatureEnabled,
} from "./guardrails";

type AiFeature = "freightAssistant";

type AllowedRole = "CEO" | "ADMIN" | "COO" | "DISPATCHER" | "CSR" | "VENTURE_HEAD" | "MANAGER";

const DEFAULT_ALLOWED_ROLES: AllowedRole[] = [
  "CEO",
  "ADMIN",
  "COO",
  "DISPATCHER",
  "CSR",
  "VENTURE_HEAD",
  "MANAGER",
];

export type AiHandlerContext = {
  user: {
    id: number;
    role: string;
    email: string;
    fullName?: string | null;
  };
  requestId: string;
  sanitizedBody: Record<string, unknown>;
};

export type AiHandlerResult = {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  tokensEstimated?: number;
  inputLength?: number;
  outputLength?: number;
};

type AiHandler = (
  req: NextApiRequest,
  res: NextApiResponse,
  context: AiHandlerContext
) => Promise<AiHandlerResult>;

type WithAiGuardrailsOptions = {
  feature?: AiFeature;
  allowedRoles?: AllowedRole[];
  extractInputForValidation?: (body: Record<string, unknown>) => string;
};

function isAllowedRole(role: string, allowedRoles: AllowedRole[]): boolean {
  return allowedRoles.includes(role as AllowedRole);
}

export function withAiGuardrails(
  handler: AiHandler,
  options: WithAiGuardrailsOptions = {}
) {
  const {
    feature = "freightAssistant",
    allowedRoles = DEFAULT_ALLOWED_ROLES,
    extractInputForValidation,
  } = options;

  return async function guardedHandler(
    req: NextApiRequest,
    res: NextApiResponse
  ) {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const user = await requireUser(req, res);
    if (!user) return;

    const requestId =
      (req.headers["x-request-id"] as string) || generateRequestId();

    const enabledCheck = validateAiEnabled();
    if (!enabledCheck.allowed) {
      return res.status(503).json({ error: "AI_DISABLED", message: enabledCheck.reason });
    }

    const featureCheck = validateAiFeatureEnabled(feature);
    if (!featureCheck.allowed) {
      return res.status(503).json({ error: "AI_FEATURE_DISABLED", message: featureCheck.reason });
    }

    if (!isAllowedRole(user.role, allowedRoles)) {
      logger.warn("ai_unauthorized_access", {
        userId: user.id,
        userRole: user.role,
        endpoint: req.url,
        requestId,
      });
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    const body = req.body || {};
    const inputForValidation = extractInputForValidation
      ? extractInputForValidation(body)
      : JSON.stringify(body);

    const endpointPath = (req.url || "/api/ai/unknown").split("?")[0];

    const guardrailResult = await runAllGuardrails({
      userId: user.id,
      endpoint: endpointPath,
      input: inputForValidation,
      body,
    });

    if (!guardrailResult.allowed) {
      logger.warn("ai_guardrail_blocked_request", {
        userId: user.id,
        endpoint: req.url,
        reason: guardrailResult.reason,
        requestId,
      });

      await logAiUsage({
        userId: user.id,
        endpoint: endpointPath,
        tokensEstimated: 0,
        inputLength: inputForValidation.length,
        outputLength: 0,
        success: false,
        errorType: "GUARDRAIL_BLOCKED",
        requestId,
      });

      return res.status(429).json({
        error: "AI_GUARDRAIL_BLOCKED",
        message: guardrailResult.reason,
      });
    }

    logger.info("ai_request_start", {
      userId: user.id,
      userRole: user.role,
      endpoint: req.url,
      requestId,
    });

    try {
      const sanitizedBody = guardrailResult.sanitizedBody || body;
      
      const context: AiHandlerContext = {
        user: {
          id: user.id,
          role: user.role,
          email: user.email,
          fullName: user.fullName,
        },
        requestId,
        sanitizedBody,
      };

      const result = await handler(req, res, context);

      if (result.data && typeof result.data.draft === "string") {
        result.data.draft = filterOutput(result.data.draft);
      }
      if (result.data && typeof result.data.content === "string") {
        result.data.content = filterOutput(result.data.content);
      }
      if (result.data && typeof result.data.summary === "string") {
        result.data.summary = filterOutput(result.data.summary);
      }

      await logAiUsage({
        userId: user.id,
        endpoint: endpointPath,
        tokensEstimated: result.tokensEstimated || 0,
        inputLength: result.inputLength || inputForValidation.length,
        outputLength: result.outputLength || 0,
        success: result.success,
        errorType: result.success ? undefined : result.error,
        requestId,
      });

      logger.info("ai_request_complete", {
        userId: user.id,
        endpoint: endpointPath,
        success: result.success,
        requestId,
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error || "AI_ERROR" });
      }

      return res.json(result.data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      const errorType = err instanceof Error ? err.name : "UnknownError";
      
      logger.error("ai_request_error", {
        userId: user.id,
        endpoint: endpointPath,
        error: errorMessage,
        requestId,
      });

      await logAiUsage({
        userId: user.id,
        endpoint: endpointPath,
        tokensEstimated: 0,
        inputLength: inputForValidation.length,
        outputLength: 0,
        success: false,
        errorType: errorType,
        requestId,
      });

      return res.status(500).json({ error: "Internal server error" });
    }
  };
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
