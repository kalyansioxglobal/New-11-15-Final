import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";
import { can } from "@/lib/permissions";
import { computeMarginFields } from "@/lib/freight/margins";
import { logLoadEvent } from "@/lib/freight/events";
import { updateShipperLastLoadDate } from "@/lib/shipperChurn";
import { normalizeLoadCustomerAndLocation } from "@/lib/logistics/customerLocation";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const {
      shipperId,
      carrierId,
      ventureId,
      officeId,
      reference,
      shipperName,
      customerName,
      customerId,
      pickupCity,
      pickupState,
      pickupZip,
      pickupDate,
      dropCity,
      dropState,
      dropZip,
      dropDate,
      equipmentType,
      weightLbs,
      billAmount,
      costAmount,
      rate,
      notes,
      salesAgentAliasId,
      csrAliasId,
      dispatcherAliasId,
    } = req.body;

    const targetVentureId = ventureId ?? user.ventureIds?.[0] ?? null;

    if (!can(user, "create", "TASK", { ventureId: targetVentureId })) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    const { margin, marginPercent } = computeMarginFields({ billAmount, costAmount });

    const normalized = await normalizeLoadCustomerAndLocation({
      customerId: customerId ?? null,
      shipperId: shipperId ?? null,
      ventureId: targetVentureId,
    });

    const load = await prisma.load.create({
      data: {
        ventureId: targetVentureId,
        officeId: officeId ?? null,
        reference: reference ?? null,
        shipperId: normalized.shipperId,
        shipperName: shipperName ?? null,
        customerId: normalized.customerId,
        customerName: customerName ?? null,
        carrierId: carrierId ?? null,
        pickupCity: pickupCity ?? null,
        pickupState: pickupState ?? null,
        pickupZip: pickupZip ?? null,
        pickupDate: pickupDate ? new Date(pickupDate) : null,
        dropCity: dropCity ?? null,
        dropState: dropState ?? null,
        dropZip: dropZip ?? null,
        dropDate: dropDate ? new Date(dropDate) : null,
        equipmentType: equipmentType ?? null,
        weightLbs: weightLbs ? parseInt(weightLbs, 10) : null,
        billAmount: billAmount ?? null,
        costAmount: costAmount ?? null,
        marginAmount: margin,
        marginPercentage: marginPercent * 100,
        rate: rate ?? null,
        notes: notes ?? null,
        loadStatus: "OPEN",
        createdById: user.id,
        salesAgentAliasId: salesAgentAliasId ?? null,
        csrAliasId: csrAliasId ?? null,
        dispatcherAliasId: dispatcherAliasId ?? null,
      },
      include: {
        venture: { select: { id: true, name: true } },
        office: { select: { id: true, name: true } },
        shipper: { select: { id: true, name: true } },
        carrier: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
        salesAgentAlias: { select: { id: true, name: true } },
        csrAlias: { select: { id: true, name: true } },
        dispatcherAlias: { select: { id: true, name: true } },
      },
    });

    await logLoadEvent({
      loadId: load.id,
      userId: user.id,
      eventType: "STATUS_CHANGED",
      message: `Load created by ${user.fullName || user.email}`,
    });

    if (load.shipperId) {
      await updateShipperLastLoadDate(load.shipperId);
    }

    return res.status(201).json({ load });
  } catch (err: any) {
    console.error("Error creating load:", err);
    return res.status(err.statusCode ?? 500).json({ error: err.message ?? "Internal Server Error" });
  }
}
