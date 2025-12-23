import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/apiAuth";
import { logger } from "@/lib/logger";
import { generateRequestId } from "@/lib/requestId";
import { aiConfig } from "@/lib/config/ai";
import { AiDisabledError } from "@/lib/ai/aiClient";
import {
  generateFreightCeoEodDraft,
  type FreightCeoEodDraftType,
  type FreightCeoEodMetrics,
  type FreightCeoEodIntelligence,
} from "@/lib/ai/freightCeoEodAssistant";

function isAllowedRole(role: string): boolean {
  return ["CEO", "ADMIN", "COO", "VENTURE_HEAD"].includes(role);
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

  const { draftType, metrics, intelligence, templateId, toneId } = req.body || {};

  const allowedDraftTypes: FreightCeoEodDraftType[] = [
    "daily_summary",
    "csr_performance",
    "freight_intelligence",
    "risk_overview",
  ];

  if (!allowedDraftTypes.includes(draftType)) {
    return res.status(400).json({ error: "Invalid draftType" });
  }

  if (!metrics || typeof metrics !== "object" || !metrics.windowLabel) {
    return res.status(400).json({ error: "metrics.windowLabel is required" });
  }

  if (templateId && typeof templateId !== "string") {
    return res.status(400).json({ error: "INVALID_TEMPLATE" });
  }

  if (toneId && typeof toneId !== "string") {
    return res.status(400).json({ error: "INVALID_TONE" });
  }


  logger.info("api_request", {
    endpoint: "/api/ai/freight-eod-draft",
    userId: user.id,
    userRole: user.role,
    outcome: "start",
    requestId,
  });

  try {
    const draft = await generateFreightCeoEodDraft({
      draftType,
      metrics: metrics as FreightCeoEodMetrics,
      intelligence: (intelligence || undefined) as FreightCeoEodIntelligence | undefined,
      templateId: templateId || undefined,
      toneId: toneId || undefined,
      userId: user.id,
      requestId,
    });

    logger.info("api_request", {
      endpoint: "/api/ai/freight-eod-draft",
      userId: user.id,
      userRole: user.role,
      outcome: "success",
      requestId,
    });

    return res.json({ draft });
  } catch (err: any) {
    if (err instanceof AiDisabledError) {
      return res.status(503).json({ error: "AI_ASSISTANT_DISABLED" });
    }

    logger.error("api_request", {
      endpoint: "/api/ai/freight-eod-draft",
      userId: user.id,
      userRole: user.role,
      outcome: "error",
      requestId,
    });
    console.error("/api/ai/freight-eod-draft error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
