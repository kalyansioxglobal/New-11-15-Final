import type { NextApiRequest } from "next";
import { logger } from "@/lib/logger";
import type { SessionUser } from "@/lib/scope";
import prisma from "@/lib/prisma";

export type AuditDomain = "freight" | "hotels" | "bpo" | "saas" | "admin";

export interface AuditEvent {
  domain: AuditDomain;
  action: string;
  entityType: string;
  entityId?: string | number | null;
  metadata?: Record<string, unknown>;
}

function getRequestId(req: NextApiRequest): string | undefined {
  const headerId = req.headers["x-request-id"];
  if (typeof headerId === "string" && headerId.trim()) return headerId;
  if (Array.isArray(headerId) && headerId[0]) return headerId[0];
  return undefined;
}

export async function logAuditEvent(
  req: NextApiRequest,
  user: SessionUser | null | undefined,
  event: AuditEvent
): Promise<void> {
  try {
    const requestId = getRequestId(req);

    logger.info("audit_event", {
      requestId,
      endpoint: req.url?.split("?")[0] ?? "unknown",
      userId: user?.id ?? null,
      userRole: user?.role ?? null,
      ventureIds: user?.ventureIds ?? [],
      officeIds: user?.officeIds ?? [],
      audit: event,
    });

    // Best-effort DB persistence; do not block the main request on failure.
    await prisma.auditLog.create({
      data: {
        requestId: requestId ?? null,
        userId: user?.id ?? null,
        userRole: user?.role ?? null,
        ventureId: user?.ventureIds?.length === 1 ? user.ventureIds[0] : null,
        officeId: user?.officeIds?.[0] ?? null,
        domain: event.domain,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId != null ? String(event.entityId) : null,
        metadata: (event.metadata ?? {}) as object,
      },
    });
  } catch (err) {
    logger.error("audit_event_failed", { error: (err as Error).message });
  }
}
