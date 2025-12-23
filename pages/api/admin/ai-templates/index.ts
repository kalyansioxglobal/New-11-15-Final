import type { NextApiRequest, NextApiResponse } from "next";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAdminUser } from '@/lib/apiAuth';
import { logger } from '@/lib/logger';
import { generateRequestId } from '@/lib/requestId';
import { z } from 'zod';
import { logAuditEvent } from '@/lib/audit';

const CreateTemplateSchema = z.object({
  name: z.string().min(2),
  domain: z.enum(["freight", "hotel", "bpo", "ops"]),
  body: z.string().min(1),
  description: z.string().optional(),
  ventureId: z.number(),
  isActive: z.boolean().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireAdminUser(req, res);
  if (!user) return;

  const requestId = (req.headers && (req.headers["x-request-id"] as string)) || generateRequestId();

  logger.info("api_request", {
    endpoint: "/api/admin/ai-templates",
    userId: user.id,
    userRole: user.role,
    outcome: "start",
    requestId,
  });

  try {
    if (req.method === "GET") {
      const { domain, page = "1", pageSize = "50" } = req.query;

      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const take = Math.min(200, Math.max(1, parseInt(String(pageSize), 10) || 50));
      const skip = (pageNum - 1) * take;

      const where: any = {};
      // enforce venture scoping: only return templates in user's venture(s) unless admin has global scope
      if (domain) where.domain = String(domain);
      if (!user.ventureIds || user.ventureIds.length === 0) {
        // return empty set if user has no ventures
        return res.status(200).json({ templates: [], page: pageNum, pageSize: take, total: 0, totalPages: 0 });
      }
      if (!(user as any).allVentures) {
        where.ventureId = { in: user.ventureIds };
      }

      const [templates, total] = await Promise.all([
        prisma.aiDraftTemplate.findMany({
          where,
          include: { venture: true, creator: true },
          orderBy: { createdAt: "desc" },
          skip,
          take,
        }),
        prisma.aiDraftTemplate.count({ where }),
      ]);

      logger.info("api_request", { endpoint: "/api/admin/ai-templates", outcome: "success", requestId });
      return res.status(200).json({ templates, page: pageNum, pageSize: take, total, totalPages: Math.ceil(total / take) });
    }

    if (req.method === "POST") {
      const parseResult = CreateTemplateSchema.safeParse(req.body);
      if (!parseResult.success) {
        logger.warn("api_request", { endpoint: "/api/admin/ai-templates", requestId, outcome: "bad_request", error: parseResult.error.errors });
        return res.status(400).json({ error: "Validation failed", details: parseResult.error.errors });
      }

      const { name, domain, body, description, ventureId, isActive = true } = parseResult.data;

      // enforce venture scoping: prevent creating outside user's ventures
      if (!(user as any).allVentures && !user.ventureIds.includes(ventureId)) {
        return res.status(403).json({ error: "FORBIDDEN_VENTURE" });
      }

      const data: any = {
        domain: String(domain) as any,
        name: String(name),
        description: description || null,
        body: String(body),
        isActive: Boolean(isActive),
        venture: { connect: { id: Number(ventureId) } },
        creator: { connect: { id: user.id } },
      } as any;

      const tpl = await prisma.aiDraftTemplate.create({ data });
      try {
        await logAuditEvent(req, user, {
          domain: 'admin',
          action: 'AI_TEMPLATE_CREATE',
          entityType: 'aiDraftTemplate',
          entityId: tpl.id,
          metadata: { ventureId },
        });
      } catch (e) {
        // best-effort only
      }

      logger.info("api_request", { endpoint: "/api/admin/ai-templates", outcome: "created", requestId });
      return res.status(201).json({ template: tpl });
    }

    res.setHeader("Allow", "GET,POST");
    return res.status(405).end("Method Not Allowed");
  } catch (error: any) {
    logger.error("api_request", { endpoint: "/api/admin/ai-templates", outcome: "error", requestId, error: error?.message });
    if ((error as any)?.code) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}
