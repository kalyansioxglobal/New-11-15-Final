import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/apiAuth";
import { logger } from "@/lib/logger";
import { generateRequestId } from "@/lib/requestId";
import { aiConfig } from "@/lib/config/ai";
import { AiDisabledError } from "@/lib/ai/aiClient";
import {
  generateHotelOutreachDraft,
  type HotelOutreachDraftType,
} from "@/lib/ai/hotelOutreachAssistant";
import { canViewPortfolioResource } from "@/lib/permissions";

function isAllowedRole(user: { role: string }): boolean {
  // Mirror hotel portfolio-style leadership roles and a dedicated RM/Hotel lead concept
  if (canViewPortfolioResource(user as any, "HOTEL_PORTFOLIO_VIEW")) return true;
  return ["HOTEL_LEAD", "RMN_MANAGER"].includes(user.role as string);
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

  if (!isAllowedRole(user)) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }

  const { draftType, propertyName, platform, issueContext, notes, templateId, toneId } =
    req.body || {};

  const allowedDraftTypes: HotelOutreachDraftType[] = [
    "ota_parity_issue",
    "rate_update_followup",
    "performance_outreach",
    "thank_you",
    "escalation",
  ];

  if (!allowedDraftTypes.includes(draftType)) {
    return res.status(400).json({ error: "Invalid draftType" });
  }

  if (!propertyName || typeof propertyName !== "string") {
    return res.status(400).json({ error: "propertyName is required" });

  if (templateId && typeof templateId !== "string") {
    return res.status(400).json({ error: "INVALID_TEMPLATE" });
  }

  if (toneId && typeof toneId !== "string") {
    return res.status(400).json({ error: "INVALID_TONE" });
  }

  }

  logger.info("api_request", {
    endpoint: "/api/ai/hotel-outreach-draft",
    userId: user.id,
    userRole: user.role,
    outcome: "start",
    requestId,
  });

  try {
    const draft = await generateHotelOutreachDraft({
      draftType,
      propertyName,
      platform: platform || undefined,
      issueContext: issueContext || undefined,
      notes: notes || undefined,
      templateId: templateId || undefined,
      toneId: toneId || undefined,
      userId: user.id,
      requestId,
    });

    logger.info("api_request", {
      endpoint: "/api/ai/hotel-outreach-draft",
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
      endpoint: "/api/ai/hotel-outreach-draft",
      userId: user.id,
      userRole: user.role,
      outcome: "error",
      requestId,
    });
    console.error("/api/ai/hotel-outreach-draft error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
