import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/apiAuth";
import { logger } from "@/lib/logger";
import { generateRequestId } from "@/lib/requestId";
import { aiConfig } from "@/lib/config/ai";
import { AiDisabledError } from "@/lib/ai/aiClient";
import {
  generateFreightOpsDiagnosticsDraft,
  type FreightOpsDiagnosticsDraftType,
  type FreightOpsDiagnosticsLogEntry,
} from "@/lib/ai/freightOpsDiagnosticsAssistant";

function isAllowedRole(role: string): boolean {
  return ["CEO", "ADMIN", "COO", "EMPLOYEE", "TEST_USER"].includes(role);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  const requestId =
    (req.headers && (req.headers["x-request-id"] as string)) ||
    generateRequestId();

  if (!aiConfig.enabled || !aiConfig.freightAssistantEnabled) {
    return res.status(503).json({ error: "AI_ASSISTANT_DISABLED" });
  }

  if (!isAllowedRole(user.role)) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }

  const { draftType, recentLogSample } = req.body || {};

  const allowedDraftTypes: FreightOpsDiagnosticsDraftType[] = [
    "sre_summary",
    "error_clusters",
    "slow_endpoints",
  ];

  if (!allowedDraftTypes.includes(draftType)) {
    return res.status(400).json({ error: "Invalid draftType" });
  }

  if (!Array.isArray(recentLogSample) || recentLogSample.length === 0) {
    return res.status(400).json({ error: "recentLogSample must be a non-empty array" });
  }

  logger.info("api_request", {
    endpoint: "/api/ai/freight-ops-diagnostics",
    userId: user.id,
    userRole: user.role,
    outcome: "start",
    requestId,
  });

  try {
    const draft = await generateFreightOpsDiagnosticsDraft({
      draftType,
      recentLogSample: recentLogSample as FreightOpsDiagnosticsLogEntry[],
      userId: user.id,
      requestId,
    });

    logger.info("api_request", {
      endpoint: "/api/ai/freight-ops-diagnostics",
      userId: user.id,
      userRole: user.role,
      outcome: "success",
      requestId,
    });

    return res.json({ diagnosticsDraft: draft });
  } catch (err: any) {
    if (err instanceof AiDisabledError) {
      return res.status(503).json({ error: "AI_ASSISTANT_DISABLED" });
    }

    logger.error("api_request", {
      endpoint: "/api/ai/freight-ops-diagnostics",
      userId: user.id,
      userRole: user.role,
      outcome: "error",
      requestId,
    });
    // Error already logged via logger.error above
    return res.status(500).json({ error: "Internal server error" });
  }
}
