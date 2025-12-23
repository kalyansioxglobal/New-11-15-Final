import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/apiAuth";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { generateRequestId } from "@/lib/requestId";
import { getUserScope } from "@/lib/scope";
import type { SessionUser } from "@/lib/scope";
import { isLeadership } from "@/lib/permissions";

const MANAGE_ROLES_LEADERSHIP = ["CEO", "ADMIN", "COO", "VENTURE_HEAD"] as const;

function canManageTemplatesForDomain(user: SessionUser, domain: string): boolean {
  if (MANAGE_ROLES_LEADERSHIP.includes(user.role as any)) return true;

  if (domain === "freight") {
    return user.role === "CSR" || user.role === "DISPATCHER";
  }

  if (domain === "hotel") {
    return user.role === "FINANCE";
  }

  if (domain === "bpo") {
    return user.role === "FINANCE";
  }

  if (domain === "ops") {
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

  const { id } = req.body || {};

  if (!id || (typeof id !== "number" && typeof id !== "string")) {
    return res.status(400).json({ error: "MISSING_ID" });
  }

  logger.info("api_request", {
    endpoint: "/api/ai/templates/delete",
    userId: user.id,
    userRole: user.role,
    outcome: "start",
    requestId,
  });

  try {
    const existing = await prisma.aiDraftTemplate.findUnique({ where: { id: Number(id) } });

    if (!existing) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    if (!canManageTemplatesForDomain(user, existing.domain)) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    const scope = getUserScope(user);
    if (
      !scope.allVentures &&
      (existing.ventureId == null || !scope.ventureIds.includes(existing.ventureId))
    ) {
      return res.status(403).json({ error: "FORBIDDEN_VENTURE" });
    }

    await prisma.aiDraftTemplate.update({
      where: { id: existing.id },
      data: { isActive: false },
    });

    logger.info("api_request", {
      endpoint: "/api/ai/templates/delete",
      userId: user.id,
      userRole: user.role,
      outcome: "success",
      requestId,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    logger.error("api_request_error", {
      endpoint: "/api/ai/templates/delete",
      userId: user.id,
      userRole: user.role,
      outcome: "error",
      requestId,
    });
    console.error("/api/ai/templates/delete error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
