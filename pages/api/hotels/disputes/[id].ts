import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../lib/prisma";
import { requireHotelAccess } from "../../../../lib/hotelAuth";
import { logger } from "@/lib/logger";
// Note: HotelDisputeStatus enum exists in the Prisma schema but is not exported from @prisma/client types in this version.
// We accept 'status' as a raw string value from the client.

import { validateIdOr400, validateTextField } from "@/lib/validation";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const context = await requireHotelAccess(req, res);
  if (!context) return;
  const { hotelPerm } = context;

  const disputeId = validateIdOr400(req.query.id, "id", res);
  if (disputeId === null) return;

  if (req.method === "GET") {
    const dispute = await prisma.hotelDispute.findUnique({
      where: { id: disputeId },
      include: {
        property: true,
        owner: true,
        createdBy: true,
        notes: {
          include: { author: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!dispute) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.json({ dispute });
    return;
  }

  if (req.method === "PUT") {
    if (hotelPerm === "view") {
      res.status(403).json({ error: "View-only access" });
      return;
    }

    const {
      status,
      ownerId,
      internalNotes,
      reason,
      evidenceDueDate,
      submittedDate,
      decisionDate,
      outcomeNotes,
    } = req.body;

    const safeInternalNotes = validateTextField(internalNotes, "internalNotes", 4000, res);
    if (internalNotes && safeInternalNotes === null) return;

    const safeOutcomeNotes = validateTextField(outcomeNotes, "outcomeNotes", 4000, res);
    if (outcomeNotes && safeOutcomeNotes === null) return;

    try {
      const existing = await prisma.hotelDispute.findUnique({
        where: { id: disputeId },
        select: { status: true, ownerId: true },
      });

      const dispute = await prisma.hotelDispute.update({
        where: { id: disputeId },
        data: {
          status,
          ownerId,
          internalNotes: safeInternalNotes ?? undefined,
          reason,
          evidenceDueDate: evidenceDueDate ? new Date(evidenceDueDate) : undefined,
          submittedDate: submittedDate ? new Date(submittedDate) : undefined,
          decisionDate: decisionDate ? new Date(decisionDate) : undefined,
          outcomeNotes: safeOutcomeNotes ?? undefined,
        },
        include: {
          property: { select: { ventureId: true } },
        },
      });

      const { logAuditEvent } = await import("@/lib/audit");
      logAuditEvent(req, context.dbUser as any, {
        domain: "hotels",
        action: "DISPUTE_UPDATE",
        entityType: "hotelDispute",
        entityId: disputeId,
        metadata: {
          before: existing,
          after: { status: dispute.status, ownerId: dispute.ownerId },
        },
      });

      // Award gamification points for hotel dispute resolution
      // Only award if status changed to a resolved state (WON, LOST, or CLOSED_NO_ACTION)
      const resolvedStatuses = ['WON', 'LOST', 'CLOSED_NO_ACTION'];
      if (existing?.status !== status && resolvedStatuses.includes(status) && dispute.ownerId) {
        const { awardPointsForEvent } = await import('@/lib/gamification/awardPoints');
        await awardPointsForEvent(
          dispute.ownerId,
          dispute.property.ventureId,
          'HOTEL_DISPUTE_RESOLVED',
          {
            metadata: { disputeId: disputeId, status: status, previousStatus: existing?.status },
            idempotencyKey: `hotel_dispute_${disputeId}_resolved_${status}`,
          }
        ).catch(err => {
          logger.error('gamification_hotel_dispute_award_failed', {
            event: 'HOTEL_DISPUTE_RESOLVED',
            userId: dispute.ownerId,
            ventureId: dispute.property.ventureId,
            key: `hotel_dispute_${disputeId}_resolved_${status}`,
            err: err instanceof Error ? err.message : String(err),
          });
        });
      }

      res.json({ dispute });
    } catch (err: any) {
      logger.error('hotel_dispute_update_failed', {
        userId: context.dbUser.id,
        disputeId: disputeId,
        error: err?.message || String(err),
        stack: process.env.NODE_ENV !== 'production' ? err?.stack : undefined,
      });
      res.status(500).json({ error: "Failed to update dispute", detail: err.message });
    }

    return;
  }

  res.setHeader("Allow", "GET, PUT");
  res.status(405).end();
}
