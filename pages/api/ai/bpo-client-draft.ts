import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/apiAuth";
import { logger } from "@/lib/logger";
import { generateRequestId } from "@/lib/requestId";
import { aiConfig } from "@/lib/config/ai";
import { AiDisabledError } from "@/lib/ai/aiClient";
import {
  generateBpoClientOutreachDraft,
  type BpoClientOutreachDraftType,
} from "@/lib/ai/bpoClientOutreachAssistant";

function isAllowedRole(role: string): boolean {
  return ["CEO", "ADMIN", "COO", "BPO_MANAGER", "ACCOUNT_MANAGER"].includes(role);
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

  const { draftType, clientName, contextNotes, templateId, toneId } = req.body || {};

  const allowedDraftTypes: BpoClientOutreachDraftType[] = [
    "cold_outreach",
    "warm_followup",
    "monthly_kpi",
    "sla_review",
    "appreciation",
  ];

  if (!allowedDraftTypes.includes(draftType)) {
    return res.status(400).json({ error: "Invalid draftType" });
  }

  if (!clientName || typeof clientName !== "string") {
    return res.status(400).json({ error: "clientName is required" });
  }

  if (templateId && typeof templateId !== "string") {
    return res.status(400).json({ error: "INVALID_TEMPLATE" });
  }

  if (toneId && typeof toneId !== "string") {
    return res.status(400).json({ error: "INVALID_TONE" });
  }


  logger.info("api_request", {
    endpoint: "/api/ai/bpo-client-draft",
    userId: user.id,
    userRole: user.role,
    outcome: "start",
    requestId,
  });

  try {
    const draft = await generateBpoClientOutreachDraft({
      draftType,
      clientName,
      contextNotes: contextNotes || undefined,
      templateId: templateId || undefined,
      toneId: toneId || undefined,
      userId: user.id,
      requestId,
    });

    logger.info("api_request", {
      endpoint: "/api/ai/bpo-client-draft",
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
      endpoint: "/api/ai/bpo-client-draft",
      userId: user.id,
      userRole: user.role,
      outcome: "error",
      requestId,
    });
    console.error("/api/ai/bpo-client-draft error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
