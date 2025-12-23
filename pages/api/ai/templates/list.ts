import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/apiAuth";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { generateRequestId } from "@/lib/requestId";
import { getUserScope } from "@/lib/scope";
import type { SessionUser } from "@/lib/scope";
import {
  freightTemplates,
} from "@/lib/ai/templates/freightTemplates";
import { hotelTemplates } from "@/lib/ai/templates/hotelTemplates";
import { bpoTemplates } from "@/lib/ai/templates/bpoTemplates";
import { opsDiagnosticsTemplates } from "@/lib/ai/templates/opsDiagnosticsTemplates";

const ALLOWED_DOMAINS = ["freight", "hotel", "bpo", "ops"] as const;
type Domain = (typeof ALLOWED_DOMAINS)[number];

function getBuiltinTemplates(domain: Domain) {
  switch (domain) {
    case "freight":
      return freightTemplates;
    case "hotel":
      return hotelTemplates;
    case "bpo":
      return bpoTemplates;
    case "ops":
      return opsDiagnosticsTemplates;
    default:
      return [];
  }
}

function canViewTemplatesForDomain(user: SessionUser, domain: Domain): boolean {
  // Mirror drafting RBAC for each domain; conservative view rights
  if (domain === "freight") {
    return ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "CSR", "DISPATCHER"].includes(
      user.role,
    );
  }

  if (domain === "hotel") {
    // Reuse hotel outreach RBAC: portfolio viewers + HOTEL_LEAD/RMN_MANAGER equivalents
    return ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "FINANCE"].includes(user.role);
  }

  if (domain === "bpo") {
    return ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "FINANCE"].includes(user.role);
  }

  if (domain === "ops") {
    // Ops diagnostics currently allowed for CEO/ADMIN/COO/EMPLOYEE/TEST_USER; templates view is safe for same set
    return ["CEO", "ADMIN", "COO", "EMPLOYEE", "TEST_USER"].includes(user.role);
  }

  return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  const requestId =
    (req.headers && (req.headers["x-request-id"] as string)) || generateRequestId();

  const domainParam = (req.query.domain as string | undefined) || "";
  const domain = domainParam.toLowerCase() as Domain;

  if (!ALLOWED_DOMAINS.includes(domain)) {
    return res.status(400).json({ error: "INVALID_DOMAIN" });
  }

  if (!canViewTemplatesForDomain(user, domain)) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }

  const scope = getUserScope(user);
  // Venture scoping: require at least one venture in scope
  if (!scope.allVentures && scope.ventureIds.length === 0) {
    return res.status(200).json({ builtin: getBuiltinTemplates(domain), custom: [] });
  }

  const ventureId = scope.allVentures ? null : scope.ventureIds[0];

  logger.info("api_request", {
    endpoint: "/api/ai/templates/list",
    userId: user.id,
    userRole: user.role,
    outcome: "start",
    requestId,
  });

  try {
    const where: any = {
      domain,
      isActive: true,
    };

    if (ventureId != null) {
      where.ventureId = ventureId;
    }

    const customTemplates = await prisma.aiDraftTemplate.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        prompt: true,
        isActive: true,
      },
    });

    logger.info("api_request", {
      endpoint: "/api/ai/templates/list",
      userId: user.id,
      userRole: user.role,
      outcome: "success",
      requestId,
    });

    return res.status(200).json({
      builtin: getBuiltinTemplates(domain).map((t) => ({
        id: t.id,
        name: t.label,
        description: t.description,
        body: t.hint,
        isActive: true,
      })),
      custom: customTemplates.map((t) => ({
        id: t.id,
        name: t.name,
        body: t.prompt,
        isActive: t.isActive,
      })),
    });
  } catch (err) {
    logger.error("api_request_error", {
      endpoint: "/api/ai/templates/list",
      userId: user.id,
      userRole: user.role,
      outcome: "error",
      requestId,
    });
    console.error("/api/ai/templates/list error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
