import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";
import { getUserScope } from "@/lib/scope";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) {
    return res.status(401).json({ error: "UNAUTHENTICATED" });
  }

  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const scope = getUserScope(user);

    // Build where clause with user scope
    const where: any = {
      isTest: user.isTestUser,
      OR: [
        { customerId: null },
        { shipperId: null },
        { carrierId: null },
        { tmsLoadId: null },
        { tmsLoadId: "" },
      ],
    };

    // Apply venture scope if user doesn't have access to all ventures
    if (!scope.allVentures && scope.ventureIds.length > 0) {
      where.ventureId = { in: scope.ventureIds };
    }

    const orphanLoadsRaw = await prisma.load.findMany({
      where,
      select: {
        id: true,
        tmsLoadId: true,
        reference: true,
        status: true,
        billAmount: true,
        costAmount: true,
        marginAmount: true,
        marginPercentage: true,
        pickupDate: true,
        pickupCity: true,
        pickupState: true,
        dropCity: true,
        dropState: true,
        customerId: true,
        shipperId: true,
        carrierId: true,
        ventureId: true,
        customer: { select: { id: true, name: true } },
        shipper: { select: { id: true, name: true } },
        carrier: { select: { id: true, name: true, mcNumber: true } },
        venture: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    const orphanLoads = orphanLoadsRaw.map((l) => ({
      id: l.id,
      tmsLoadId: l.tmsLoadId,
      reference: l.reference,
      status: l.status ?? "UNKNOWN",
      billAmount: l.billAmount,
      costAmount: l.costAmount,
      marginAmount: l.marginAmount,
      marginPercentage: l.marginPercentage,
      pickupDate: l.pickupDate?.toISOString() ?? null,
      pickupCity: l.pickupCity,
      pickupState: l.pickupState,
      dropCity: l.dropCity,
      dropState: l.dropState,
      customerId: l.customerId,
      shipperId: l.shipperId,
      carrierId: l.carrierId,
      ventureId: l.ventureId,
      customer: l.customer,
      shipper: l.shipper,
      carrier: l.carrier,
      venture: l.venture,
      missingMappings: {
        customer: !l.customerId,
        shipper: !l.shipperId,
        carrier: !l.carrierId,
        tmsLoadId: !l.tmsLoadId || l.tmsLoadId === "",
      },
    }));

    return res.status(200).json({
      loads: orphanLoads,
      total: orphanLoads.length,
    });
  } catch (err) {
    console.error("freight missing-mappings error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

