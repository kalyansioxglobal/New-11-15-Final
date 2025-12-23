import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma";
import { requireAdminPanelUser } from '@/lib/apiAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireAdminPanelUser(req, res);
  if (!user) return;

  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const usersWithoutMapping = await prisma.user.findMany({
      where: {
        mappings: null,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
      },
    });

    const shippersMissingCodes = await prisma.logisticsShipper.findMany({
      where: {
        OR: [
          { tmsShipperCode: null },
          { tmsShipperCode: "" },
          { internalCode: null },
          { internalCode: "" },
          { customerId: null },
        ],
      },
      select: {
        id: true,
        name: true,
        tmsShipperCode: true,
        internalCode: true,
        customerId: true,
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const carriersMissingCodes = await prisma.carrier.findMany({
      where: {
        OR: [
          { tmsCarrierCode: null },
          { tmsCarrierCode: "" },
        ],
      },
      select: {
        id: true,
        name: true,
        tmsCarrierCode: true,
        mcNumber: true,
        dotNumber: true,
      },
    });

    const orphanLoadsRaw = await prisma.load.findMany({
      where: {
        OR: [
          { customerId: null },
          { shipperId: null },
          { carrierId: null },
          { tmsLoadId: null },
          { tmsLoadId: "" },
        ],
      },
      select: {
        id: true,
        tmsLoadId: true,
        status: true,
        billAmount: true,
        costAmount: true,
        marginAmount: true,
        pickupDate: true,
        customerId: true,
        shipperId: true,
        carrierId: true,
        customer: { select: { name: true } },
        shipper: { select: { name: true } },
        carrier: { select: { name: true } },
      },
      take: 200,
    });

    const orphanLoads = orphanLoadsRaw.map((l) => ({
      id: String(l.id),
      tmsLoadId: l.tmsLoadId,
      billingDate: l.pickupDate?.toISOString() ?? null,
      status: l.status ?? "UNKNOWN",
      totalRevenue: l.billAmount?.toFixed(2) ?? null,
      totalCost: l.costAmount?.toFixed(2) ?? null,
      marginAmount: l.marginAmount?.toFixed(2) ?? null,
      customerId: l.customerId ? String(l.customerId) : null,
      shipperId: l.shipperId ? String(l.shipperId) : null,
      carrierId: l.carrierId ? String(l.carrierId) : null,
      customer: l.customer,
      shipper: l.shipper,
      carrier: l.carrier,
    }));

    return res.status(200).json({
      usersWithoutMapping,
      shippersMissingCodes,
      carriersMissingCodes,
      orphanLoads,
    });
  } catch (err) {
    console.error("missing-mappings error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
