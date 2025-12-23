import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";
import { can } from "@/lib/permissions";
import { computeMarginFields } from "@/lib/freight/margins";
import { logLoadEvent } from "@/lib/freight/events";
import { normalizeLoadCustomerAndLocation } from "@/lib/logistics/customerLocation";
import { awardPointsForEvent } from "@/lib/gamification/awardPoints";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const { id, ...patch } = req.body;
    const loadId = Number(id);
    if (!loadId || isNaN(loadId)) {
      return res.status(400).json({ error: "Invalid load id" });
    }

    const existing = await prisma.load.findUnique({ where: { id: loadId } });

    const { logAuditEvent } = await import("@/lib/audit");
    if (!existing) {
      return res.status(404).json({ error: "Load not found" });
    }

    if (!can(user, "edit", "TASK", { ventureId: existing.ventureId })) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    const billAmount = patch.billAmount ?? existing.billAmount;
    const costAmount = patch.costAmount ?? existing.costAmount;
    const { margin, marginPercent } = computeMarginFields({ billAmount, costAmount });

    const data: Record<string, unknown> = {};

    if (patch.shipperId !== undefined || patch.customerId !== undefined) {
      const normalized = await normalizeLoadCustomerAndLocation({
        customerId: patch.customerId ?? existing.customerId ?? null,
        shipperId: patch.shipperId ?? existing.shipperId ?? null,
        ventureId: existing.ventureId!,
      });
      data.customerId = normalized.customerId;
      data.shipperId = normalized.shipperId;
    }

    if (patch.reference !== undefined) data.reference = patch.reference;
    if (patch.shipperName !== undefined) data.shipperName = patch.shipperName;
    if (patch.customerName !== undefined) data.customerName = patch.customerName;
    if (patch.carrierId !== undefined) data.carrierId = patch.carrierId;
    if (patch.pickupCity !== undefined) data.pickupCity = patch.pickupCity;
    if (patch.pickupState !== undefined) data.pickupState = patch.pickupState;
    if (patch.pickupZip !== undefined) data.pickupZip = patch.pickupZip;
    if (patch.pickupDate !== undefined) data.pickupDate = patch.pickupDate ? new Date(patch.pickupDate) : null;
    if (patch.dropCity !== undefined) data.dropCity = patch.dropCity;
    if (patch.dropState !== undefined) data.dropState = patch.dropState;
    if (patch.dropZip !== undefined) data.dropZip = patch.dropZip;
    if (patch.dropDate !== undefined) data.dropDate = patch.dropDate ? new Date(patch.dropDate) : null;
    if (patch.equipmentType !== undefined) data.equipmentType = patch.equipmentType;
    if (patch.weightLbs !== undefined) data.weightLbs = patch.weightLbs ? parseInt(patch.weightLbs, 10) : null;
    if (patch.rate !== undefined) data.rate = patch.rate;
    if (patch.notes !== undefined) data.notes = patch.notes;
    if (patch.loadStatus !== undefined) data.loadStatus = patch.loadStatus;
    if (patch.arInvoiceDate !== undefined) data.arInvoiceDate = patch.arInvoiceDate ? new Date(patch.arInvoiceDate) : null;
    if (patch.apInvoiceDate !== undefined) data.apInvoiceDate = patch.apInvoiceDate ? new Date(patch.apInvoiceDate) : null;
    if (patch.billingDate !== undefined) data.billingDate = patch.billingDate ? new Date(patch.billingDate) : null;

    if (patch.billAmount !== undefined || patch.costAmount !== undefined) {
      data.billAmount = billAmount;
      data.costAmount = costAmount;
      data.marginAmount = margin;
      data.marginPercentage = marginPercent * 100;
    }

    const updated = await prisma.load.update({
      where: { id: loadId },
      data,
      include: {
        venture: { select: { id: true, name: true } },
        office: { select: { id: true, name: true } },
        shipper: { select: { id: true, name: true } },
        carrier: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
      },
    });

    await logLoadEvent({
      loadId,
      userId: user.id,
      eventType: "STATUS_CHANGED",
      message: `Load updated by ${user.name || user.email}`,
    });
    logAuditEvent(req, user, {
      domain: "freight",
      action: "LOAD_UPDATE",
      entityType: "load",
      entityId: loadId,
      metadata: {
        ventureId: existing.ventureId,
        changedFields: Object.keys(data),
      },
    });

    // Award gamification points when load status changes to DELIVERED
    if (patch.loadStatus === 'DELIVERED' && existing.loadStatus !== 'DELIVERED' && existing.ventureId) {
      awardPointsForEvent(user.id, existing.ventureId, 'LOAD_COMPLETED', {
        officeId: existing.officeId,
        metadata: { loadId },
        idempotencyKey: `load-delivered-${loadId}`,
      }).catch(async (err) => {
        const { logger } = await import("@/lib/logger");
        logger.error('gamification_load_delivered_award_failed', {
          userId: user.id,
          loadId,
          ventureId: existing.ventureId,
          error: err?.message || String(err),
        });
      });
    }

    return res.status(200).json({ load: updated });
  } catch (err: any) {
    console.error("Error updating load:", err);
    return res.status(err.statusCode ?? 500).json({ error: err.message ?? "Internal Server Error" });
  }
}
