import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from '@/lib/apiAuth';
import { can } from "@/lib/permissions";
import { validateLoadStatusTransition } from "@/lib/freight/loadStatus";
import { logAuditEvent } from "@/lib/audit";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await requireUser(req, res);
  if (!user) {
    return res.status(401).json({ error: "UNAUTHENTICATED" });
  }

  const id = parseInt(req.query.id as string, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid ID" });
  }

  const load = await prisma.load.findUnique({
    where: { id },
    include: {
      venture: { select: { id: true, name: true } },
      office: { select: { id: true, name: true } },
      carrier: { select: { id: true, name: true, mcNumber: true, email: true, phone: true } },
      createdBy: { select: { id: true, fullName: true } },
      contacts: {
        include: {
          carrier: { select: { id: true, name: true } },
          madeBy: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!load) {
    return res.status(404).json({ error: "Load not found" });
  }

  if (!can(user, "view", "VENTURE", { ventureId: load.ventureId })) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }

  if (req.method === "GET") {
    return res.json({ load });
  }

  if (req.method === "PATCH") {
    const {
      status,
      lostReason,
      lostReasonCategory,
      dormantReason,
      carrierId,
      rate,
      buyRate,
      sellRate,
      notes,
      reference,
      shipperName,
      customerName,
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
    } = req.body;

    if (!can(user, "edit", "TASK", { ventureId: load.ventureId })) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    const data: any = {};

    if (status !== undefined) {
      // Validate status transition
      if (!validateLoadStatusTransition(load.status, status)) {
        return res.status(400).json({
          error: 'Invalid status transition',
          detail: `Cannot transition from ${load.status} to ${status}`,
          currentStatus: load.status,
          requestedStatus: status,
        });
      }
      data.status = status;
    }
    if (status === "LOST") {
      if (lostReason !== undefined) data.lostReason = lostReason;
      if (lostReasonCategory !== undefined) data.lostReasonCategory = lostReasonCategory;
    } else if (status !== undefined) {
      data.lostReason = null;
      data.lostReasonCategory = null;
    }
    if (dormantReason !== undefined) data.dormantReason = dormantReason;
    // Validate carrier exists and belongs to venture if carrierId is provided
    if (carrierId !== undefined) {
      const parsedCarrierId = carrierId ? parseInt(carrierId, 10) : null;
      if (parsedCarrierId) {
        const carrier = await prisma.carrier.findFirst({
          where: {
            id: parsedCarrierId,
          },
        });
        if (!carrier) {
          return res.status(400).json({
            error: 'Invalid carrier',
            detail: `Carrier ${parsedCarrierId} not found`,
          });
        }
      }
      data.carrierId = parsedCarrierId;
    }

    // Validate numeric fields are >= 0
    if (rate !== undefined) {
      const parsedRate = rate ? parseFloat(rate) : null;
      if (parsedRate !== null && (isNaN(parsedRate) || parsedRate < 0)) {
        return res.status(400).json({
          error: 'Invalid rate',
          detail: 'Rate must be a number >= 0',
        });
      }
      data.rate = parsedRate;
    }
    if (buyRate !== undefined) {
      const parsedBuyRate = buyRate ? parseFloat(buyRate) : null;
      if (parsedBuyRate !== null && (isNaN(parsedBuyRate) || parsedBuyRate < 0)) {
        return res.status(400).json({
          error: 'Invalid buy rate',
          detail: 'Buy rate must be a number >= 0',
        });
      }
      data.buyRate = parsedBuyRate;
    }
    if (sellRate !== undefined) {
      const parsedSellRate = sellRate ? parseFloat(sellRate) : null;
      if (parsedSellRate !== null && (isNaN(parsedSellRate) || parsedSellRate < 0)) {
        return res.status(400).json({
          error: 'Invalid sell rate',
          detail: 'Sell rate must be a number >= 0',
        });
      }
      data.sellRate = parsedSellRate;
    }
    if (notes !== undefined) data.notes = notes;
    if (reference !== undefined) data.reference = reference;
    if (shipperName !== undefined) data.shipperName = shipperName;
    if (customerName !== undefined) data.customerName = customerName;
    if (pickupCity !== undefined) data.pickupCity = pickupCity;
    if (pickupState !== undefined) data.pickupState = pickupState;
    if (pickupZip !== undefined) data.pickupZip = pickupZip;
    // Validate dates
    if (pickupDate !== undefined) {
      const parsedPickupDate = new Date(pickupDate);
      if (isNaN(parsedPickupDate.getTime())) {
        return res.status(400).json({
          error: 'Invalid pickup date',
          detail: 'Pickup date must be a valid date',
        });
      }
      data.pickupDate = parsedPickupDate;
    }
    if (dropDate !== undefined) {
      if (dropDate) {
        const parsedDropDate = new Date(dropDate);
        if (isNaN(parsedDropDate.getTime())) {
          return res.status(400).json({
            error: 'Invalid drop date',
            detail: 'Drop date must be a valid date',
          });
        }
        // Validate drop date is after pickup date
        const pickupDateToCheck = data.pickupDate || load.pickupDate;
        if (pickupDateToCheck && parsedDropDate < pickupDateToCheck) {
          return res.status(400).json({
            error: 'Invalid date range',
            detail: 'Drop date must be after pickup date',
          });
        }
        data.dropDate = parsedDropDate;
      } else {
        data.dropDate = null;
      }
    }
    if (dropCity !== undefined) data.dropCity = dropCity;
    if (dropState !== undefined) data.dropState = dropState;
    if (dropZip !== undefined) data.dropZip = dropZip;
    if (equipmentType !== undefined) data.equipmentType = equipmentType;
    // Validate weight
    if (weightLbs !== undefined) {
      const parsedWeight = weightLbs ? parseInt(weightLbs, 10) : null;
      if (parsedWeight !== null && (isNaN(parsedWeight) || parsedWeight < 0)) {
        return res.status(400).json({
          error: 'Invalid weight',
          detail: 'Weight must be a positive integer',
        });
      }
      data.weightLbs = parsedWeight;
    }

    const updated = await prisma.load.update({
      where: { id },
      data,
      include: {
        venture: { select: { id: true, name: true } },
        office: { select: { id: true, name: true } },
        carrier: { select: { id: true, name: true, mcNumber: true } },
      },
    });

    // Log audit event for load update
    await logAuditEvent(req, user, {
      domain: 'freight',
      action: 'LOAD_UPDATED',
      entityType: 'load',
      entityId: String(id),
      metadata: {
        ventureId: load.ventureId,
        updatedFields: Object.keys(data),
        statusChanged: data.status !== undefined ? { from: load.status, to: data.status } : undefined,
        carrierChanged: data.carrierId !== undefined ? { from: load.carrierId, to: data.carrierId } : undefined,
      },
    });

    return res.json({ load: updated });
  }

  if (req.method === "DELETE") {
    if (!can(user, "delete", "TASK", { ventureId: load.ventureId })) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    await prisma.load.delete({ where: { id } });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
