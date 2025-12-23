import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";
import { getUserScope } from "@/lib/scope";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  const scope = getUserScope(user);
  const { id } = req.query;
  const settlementId = parseInt(id as string);

  if (isNaN(settlementId)) {
    return res.status(400).json({ error: "Invalid settlement ID" });
  }

  const settlement = await prisma.settlement.findUnique({
    where: { id: settlementId },
    select: { id: true, ventureId: true },
  });

  if (!settlement) {
    return res.status(404).json({ error: "Settlement not found" });
  }

  if (!scope.allVentures && !scope.ventureIds.includes(settlement.ventureId)) {
    return res.status(403).json({ error: "Forbidden: no access to this settlement" });
  }

  if (req.method === "GET") {
    return getSettlement(settlementId, res);
  } else if (req.method === "PATCH") {
    return updateSettlement(settlementId, req, res);
  } else if (req.method === "DELETE") {
    return deleteSettlement(settlementId, res);
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}

async function getSettlement(id: number, res: NextApiResponse) {
  try {
    const settlement = await prisma.settlement.findUnique({
      where: { id },
      include: {
        dispatchLoad: {
          select: {
            id: true,
            referenceNumber: true,
            pickupCity: true,
            pickupState: true,
            deliveryCity: true,
            deliveryState: true,
            rate: true,
            driverPay: true,
          },
        },
      },
    });

    if (!settlement) {
      return res.status(404).json({ error: "Settlement not found" });
    }

    let driver = null;
    if (settlement.driverId) {
      driver = await prisma.dispatchDriver.findUnique({
        where: { id: settlement.driverId },
        select: { id: true, firstName: true, lastName: true, phone: true },
      });
    }

    return res.status(200).json({
      settlement: {
        ...settlement,
        amount: settlement.amount.toString(),
        dispatchLoad: settlement.dispatchLoad
          ? {
              ...settlement.dispatchLoad,
              rate: settlement.dispatchLoad.rate.toString(),
              driverPay: settlement.dispatchLoad.driverPay?.toString() || null,
            }
          : null,
        driver,
      },
    });
  } catch (error) {
    console.error("Error fetching settlement:", error);
    return res.status(500).json({ error: "Failed to fetch settlement" });
  }
}

async function updateSettlement(id: number, req: NextApiRequest, res: NextApiResponse) {
  try {
    const { status, amount, type, description, paidAt } = req.body;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (type) updateData.type = type;
    if (description !== undefined) updateData.description = description;
    if (paidAt) updateData.paidAt = new Date(paidAt);

    if (status === "PAID" && !paidAt) {
      updateData.paidAt = new Date();
    }

    const settlement = await prisma.settlement.update({
      where: { id },
      data: updateData,
    });

    return res.status(200).json({
      settlement: {
        ...settlement,
        amount: settlement.amount.toString(),
      },
    });
  } catch (error) {
    console.error("Error updating settlement:", error);
    return res.status(500).json({ error: "Failed to update settlement" });
  }
}

async function deleteSettlement(id: number, res: NextApiResponse) {
  try {
    await prisma.settlement.delete({
      where: { id },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting settlement:", error);
    return res.status(500).json({ error: "Failed to delete settlement" });
  }
}
