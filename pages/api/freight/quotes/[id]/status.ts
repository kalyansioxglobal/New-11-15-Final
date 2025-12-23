import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";
import { can } from "@/lib/permissions";
import { FreightQuoteStatus } from "@prisma/client";

const VALID_TRANSITIONS: Record<FreightQuoteStatus, FreightQuoteStatus[]> = {
  DRAFT: ["SENT"],
  SENT: ["ACCEPTED", "REJECTED", "COUNTERED", "NO_RESPONSE", "EXPIRED"],
  NO_RESPONSE: ["SENT", "EXPIRED"],
  REJECTED: [],
  COUNTERED: ["SENT", "ACCEPTED", "REJECTED"],
  ACCEPTED: ["BOOKED"],
  BOOKED: [],
  EXPIRED: [],
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", ["PATCH"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const quoteId = Number(req.query.id);
    if (!quoteId || isNaN(quoteId)) {
      return res.status(400).json({ error: "Invalid quote id" });
    }

    const { status, counterOfferRate, rejectionReasonCode, rejectionReasonText, notes } = req.body;

    if (!status) {
      return res.status(400).json({ error: "status is required" });
    }

    const quote = await prisma.freightQuote.findUnique({
      where: { id: quoteId },
    });

    if (!quote) {
      return res.status(404).json({ error: "Quote not found" });
    }

    if (!can(user, "edit", "TASK", { ventureId: quote.ventureId })) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    const validNextStates = VALID_TRANSITIONS[quote.status];
    if (!validNextStates.includes(status)) {
      return res.status(400).json({
        error: `Invalid status transition from ${quote.status} to ${status}`,
        validTransitions: validNextStates,
      });
    }

    const updateData: Record<string, unknown> = { status };

    if (status === "SENT" && !quote.sentAt) {
      updateData.sentAt = new Date();
      if (!quote.expiresAt) {
        updateData.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      }
    }

    if (["ACCEPTED", "REJECTED", "COUNTERED", "NO_RESPONSE"].includes(status)) {
      updateData.respondedAt = new Date();
    }

    if (status === "BOOKED") {
      updateData.bookedAt = new Date();
    }

    if (status === "COUNTERED" && counterOfferRate !== undefined) {
      updateData.counterOfferRate = counterOfferRate;
    }

    if (status === "REJECTED") {
      if (rejectionReasonCode !== undefined) updateData.rejectionReasonCode = rejectionReasonCode;
      if (rejectionReasonText !== undefined) updateData.rejectionReasonText = rejectionReasonText;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const updated = await prisma.freightQuote.update({
      where: { id: quoteId },
      data: updateData,
      include: {
        customer: { select: { id: true, name: true } },
        shipper: { select: { id: true, name: true } },
        salesperson: { select: { id: true, fullName: true } },
      },
    });

    return res.status(200).json({ quote: updated });
  } catch (err: any) {
    console.error("Error updating quote status:", err);
    return res.status(err.statusCode ?? 500).json({ error: err.message ?? "Internal Server Error" });
  }
}
