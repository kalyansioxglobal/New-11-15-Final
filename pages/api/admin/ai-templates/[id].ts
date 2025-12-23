import type { NextApiRequest, NextApiResponse } from "next";
import { Prisma } from "@prisma/client";
import prisma from "../../../../lib/prisma";
import { logAuditEvent } from '@/lib/audit';
import { requireAdminUser } from '@/lib/apiAuth';
import { logger } from '@/lib/logger';
import { generateRequestId } from '@/lib/requestId';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireAdminUser(req, res);
  if (!user) return;

  const requestId = (req.headers && (req.headers["x-request-id"] as string)) || generateRequestId();

  logger.info("api_request", {
    endpoint: "/api/admin/ai-templates/[id]",
    userId: user.id,
    userRole: user.role,
    outcome: "start",
    requestId,
  });

  const { id } = req.query;
  const numericId = Number(id);
  if (!numericId || Number.isNaN(numericId)) {
    logger.warn("api_request", { endpoint: "/api/admin/ai-templates/[id]", requestId, outcome: "bad_request", reason: "invalid_id" });
    return res.status(400).json({ error: "Valid id param required" });
  }

  try {
    if (req.method === "GET") {
      const tpl = await prisma.aiDraftTemplate.findUnique({
        where: { id: numericId },
        include: { venture: true, creator: true },
      });
      if (!tpl) {
        logger.info("api_request", { endpoint: "/api/admin/ai-templates/[id]", outcome: "not_found", requestId });
        return res.status(404).json({ error: "Not found" });
      }
      logger.info("api_request", { endpoint: "/api/admin/ai-templates/[id]", outcome: "success", requestId });
      return res.status(200).json({ template: tpl });
    }

    if (req.method === "PUT") {
      const { name, description, body, isActive, domain, ventureId } = req.body;

      const data: any = {};
      if (name !== undefined) data.name = name;
      if (description !== undefined) data.description = description;
      if (body !== undefined) data.body = body;
      if (isActive !== undefined) data.isActive = Boolean(isActive);
      if (domain !== undefined) data.domain = String(domain);
      if (ventureId !== undefined) data.venture = { connect: { id: Number(ventureId) } };

      const updated = await prisma.aiDraftTemplate.update({ where: { id: numericId }, data });
      try {
        await logAuditEvent(req, user, {
          domain: 'admin',
          action: 'AI_TEMPLATE_UPDATE',
          entityType: 'aiDraftTemplate',
          entityId: updated.id,
          metadata: { ventureId: ventureId ?? (updated as any).ventureId ?? null },
        });
      } catch (e) {
        // best-effort only
      }

      logger.info("api_request", { endpoint: "/api/admin/ai-templates/[id]", outcome: "updated", requestId });
      return res.status(200).json({ template: updated });
    }

    if (req.method === "DELETE") {
      await prisma.aiDraftTemplate.delete({ where: { id: numericId } });
      try {
        await logAuditEvent(req, user, {
          domain: 'admin',
          action: 'AI_TEMPLATE_DELETE',
          entityType: 'aiDraftTemplate',
          entityId: numericId,
          metadata: {},
        });
      } catch (e) {
        // best-effort
      }

      logger.info("api_request", { endpoint: "/api/admin/ai-templates/[id]", outcome: "deleted", requestId });
      return res.status(200).json({ success: true });
    }

    res.setHeader("Allow", "GET,PUT,DELETE");
    return res.status(405).end("Method Not Allowed");
  } catch (error: any) {
    logger.error("api_request", { endpoint: "/api/admin/ai-templates/[id]", outcome: "error", requestId, error: error?.message });
    if ((error as any)?.code) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}
