import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/apiAuth";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { generateRequestId } from "@/lib/requestId";
import { getUserScope } from "@/lib/scope";
import type { SessionUser } from "@/lib/scope";
import { isLeadership } from "@/lib/permissions";

const ALLOWED_DOMAINS = ["freight", "hotel", "bpo", "ops"] as const;
type Domain = (typeof ALLOWED_DOMAINS)[number];

const FORBIDDEN_PHRASES = [
  "auto-send",
  "autosend",
  "auto send",
  "auto-dispatch",
  "autodispatch",
  "auto dispatch",
  "schedule send",
  "scheduled send",
];

function isUnsafeBody(body: string): boolean {
  const lower = body.toLowerCase();
  if (lower.includes("<script")) return true;
  return FORBIDDEN_PHRASES.some((p) => lower.includes(p));
}

function canManageTemplatesForDomain(user: SessionUser, domain: Domain): boolean {
  if (
    user.role === "CEO" ||
    user.role === "ADMIN" ||
    user.role === "COO" ||
    user.role === "VENTURE_HEAD"
  ) {
    return true;
  }

  if (domain === "freight") {
    return user.role === "CSR" || user.role === "DISPATCHER";
  }

  if (domain === "hotel") {
    // For now, treat FINANCE as the hotel leadership proxy; Wave spec mentions RMN_MANAGER / HOTEL_LEAD
    return user.role === "FINANCE";
  }

  if (domain === "bpo") {
    // BPO_MANAGER / ACCOUNT_MANAGER roles are planned; use FINANCE as a placeholder if roles are not present
    return user.role === "FINANCE";
  }

  if (domain === "ops") {
    // Ops templates are restricted to SRE/Engineering/CEO/Admin; we map this to leadership for now
    return isLeadership(user);
  }

  return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  const requestId =
    (req.headers && (req.headers["x-request-id"] as string)) || generateRequestId();

  const { domain, name, description, body } = req.body || {};

  if (!ALLOWED_DOMAINS.includes(domain)) {
    return res.status(400).json({ error: "INVALID_DOMAIN" });
  }

  if (!canManageTemplatesForDomain(user, domain as Domain)) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }

  if (!name || typeof name !== "string" || name.length > 60) {
    return res.status(400).json({ error: "INVALID_NAME" });
  }

  if (!body || typeof body !== "string" || body.length > 1000) {
    return res.status(400).json({ error: "INVALID_BODY" });
  }

  if (isUnsafeBody(body)) {
    return res.status(400).json({ error: "UNSAFE_TEMPLATE_BODY" });
  }

  const scope = getUserScope(user);
  if (!scope.allVentures && scope.ventureIds.length === 0) {
    return res.status(403).json({ error: "FORBIDDEN_VENTURE" });
  }

  const ventureId = scope.allVentures ? req.body.ventureId ?? null : scope.ventureIds[0];
  if (!ventureId) {
    return res.status(400).json({ error: "MISSING_VENTURE" });
  }

  logger.info("api_request", {
    endpoint: "/api/ai/templates/create",
    userId: user.id,
    userRole: user.role,
    outcome: "start",
    requestId,
  });

  try {
    const template = await prisma.aiDraftTemplate.create({
      data: {
        domain,
        ventureId,
        name,
        prompt: body,
        isActive: true,
        createdBy: user.id,
      },
    });

    logger.info("api_request", {
      endpoint: "/api/ai/templates/create",
      userId: user.id,
      userRole: user.role,
      outcome: "success",
      requestId,
    });

    return res.status(200).json({ template });
  } catch (err) {
    logger.error("api_request_error", {
      endpoint: "/api/ai/templates/create",
      userId: user.id,
      userRole: user.role,
      outcome: "error",
      requestId,
    });
    console.error("/api/ai/templates/create error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
