import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { requireUser } from "@/lib/apiAuth";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const user = await requireUser(req, res);
  if (!user) return;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const allUserIds = await prisma.user.findMany({
      select: { id: true },
    });
    const mappedUserIds = await prisma.userMapping.findMany({
      select: { userId: true },
    });
    const mappedIdSet = new Set(mappedUserIds.map((m) => m.userId));
    const unmappedUserIds = allUserIds
      .filter((u) => !mappedIdSet.has(u.id))
      .map((u) => u.id)
      .slice(0, 100);

    const usersWithoutMapping = await prisma.user.findMany({
      where: {
        id: { in: unmappedUserIds },
      },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
      },
      take: 100,
    });

    const incompleteUserMappings = await prisma.userMapping.findMany({
      where: {
        OR: [{ rcExtension: null }, { rcEmail: null }, { tmsEmployeeCode: null }],
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
          },
        },
      },
      take: 200,
    });

    const shippersWithoutInternal = await prisma.logisticsShipper.findMany({
      where: {
        tmsShipperCode: { not: null },
        internalCode: null,
      },
      select: {
        id: true,
        name: true,
        tmsShipperCode: true,
        internalCode: true,
      },
      take: 200,
    });

    const customersWithoutInternal = await prisma.customer.findMany({
      where: {
        tmsCustomerCode: { not: null },
        internalCode: null,
      },
      select: {
        id: true,
        name: true,
        tmsCustomerCode: true,
        internalCode: true,
      },
      take: 200,
    });

    const customersNameOnly = await prisma.customer.findMany({
      where: {
        tmsCustomerCode: null,
        internalCode: null,
      },
      select: {
        id: true,
        name: true,
      },
      take: 200,
    });

    const carriersWithoutTmsCode = await prisma.carrier.findMany({
      where: {
        OR: [{ tmsCarrierCode: null }, { tmsCarrierCode: "" }],
      },
      select: {
        id: true,
        name: true,
        tmsCarrierCode: true,
        mcNumber: true,
        dotNumber: true,
        phone: true,
      },
      take: 200,
    });

    const orphanLoads = await prisma.load.findMany({
      where: {
        OR: [
          { customerId: null },
          { carrierId: null },
          { shipperId: null },
          { createdById: null },
        ],
      },
      select: {
        id: true,
        tmsLoadId: true,
        status: true,
        billAmount: true,
        marginAmount: true,
        customerId: true,
        carrierId: true,
        shipperId: true,
        createdById: true,
        createdByTmsName: true,
      },
      take: 200,
    });

    return res.status(200).json({
      usersWithoutMapping,
      incompleteUserMappings,
      shippersWithoutInternal,
      customersWithoutInternal,
      customersNameOnly,
      carriersWithoutTmsCode,
      orphanLoads,
    });
  } catch (err: any) {
    console.error("Missing mappings fetch error:", err);
    return res.status(500).json({
      error: "Failed to fetch missing mappings",
      detail: err?.message ?? "Unknown error",
    });
  }
}
