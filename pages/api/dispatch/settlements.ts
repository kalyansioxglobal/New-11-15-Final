import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";
import { getUserScope } from "@/lib/scope";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  const scope = getUserScope(user);

  if (req.method === "GET") {
    return getSettlements(req, res, user, scope);
  } else if (req.method === "POST") {
    return createSettlement(req, res, user, scope);
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}

async function getSettlements(
  req: NextApiRequest,
  res: NextApiResponse,
  user: any,
  scope: any
) {
  try {
    const { status, type, driverId, page = "1", limit = "50" } = req.query;

    const where: any = {
      isTest: user.isTestUser,
    };

    if (!scope.allVentures && scope.ventureIds.length > 0) {
      where.ventureId = { in: scope.ventureIds };
    }

    if (status && status !== "all") {
      where.status = status;
    }
    if (type && type !== "all") {
      where.type = type;
    }
    if (driverId) {
      where.driverId = parseInt(driverId as string);
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [settlements, total] = await Promise.all([
      prisma.settlement.findMany({
        where,
        include: {
          dispatchLoad: {
            select: {
              id: true,
              referenceNumber: true,
              pickupCity: true,
              pickupState: true,
              deliveryCity: true,
              deliveryState: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.settlement.count({ where }),
    ]);

    const driverIds = settlements.map((s) => s.driverId).filter((id): id is number => id !== null);
    const drivers = driverIds.length > 0
      ? await prisma.dispatchDriver.findMany({
          where: { id: { in: driverIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];

    const driverMap = new Map(drivers.map((d) => [d.id, d]));

    const enrichedSettlements = settlements.map((s) => ({
      ...s,
      amount: s.amount.toString(),
      driver: s.driverId ? driverMap.get(s.driverId) || null : null,
    }));

    return res.status(200).json({
      settlements: enrichedSettlements,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching settlements:", error);
    return res.status(500).json({ error: "Failed to fetch settlements" });
  }
}

async function createSettlement(
  req: NextApiRequest,
  res: NextApiResponse,
  user: any,
  scope: any
) {
  try {
    const { dispatchLoadId, driverId, carrierId, amount, type, description, ventureId } = req.body;

    if (!amount || !type) {
      return res.status(400).json({ error: "Amount and type are required" });
    }

    const validTypes = ["LOAD_PAY", "BONUS", "DEDUCTION", "ADVANCE", "FUEL"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Invalid type. Must be one of: ${validTypes.join(", ")}` });
    }

    let vId = ventureId;
    if (!vId && dispatchLoadId) {
      const load = await prisma.dispatchLoad.findUnique({
        where: { id: parseInt(dispatchLoadId) },
        select: { ventureId: true },
      });
      if (load) vId = load.ventureId;
    }

    if (!vId) {
      if (!scope.allVentures && scope.ventureIds.length > 0) {
        vId = scope.ventureIds[0];
      } else {
        const defaultVenture = await prisma.venture.findFirst({
          where: { isTest: user.isTestUser, isActive: true },
        });
        vId = defaultVenture?.id || 1;
      }
    }

    if (!scope.allVentures && !scope.ventureIds.includes(vId)) {
      return res.status(403).json({ error: "Forbidden: no access to this venture" });
    }

    const settlement = await prisma.settlement.create({
      data: {
        ventureId: vId,
        dispatchLoadId: dispatchLoadId ? parseInt(dispatchLoadId) : null,
        driverId: driverId ? parseInt(driverId) : null,
        carrierId: carrierId ? parseInt(carrierId) : null,
        amount: parseFloat(amount),
        type,
        description: description || null,
        status: "PENDING",
        isTest: user.isTestUser,
      },
      include: {
        dispatchLoad: {
          select: {
            id: true,
            referenceNumber: true,
          },
        },
      },
    });

    return res.status(201).json({
      settlement: {
        ...settlement,
        amount: settlement.amount.toString(),
      },
    });
  } catch (error) {
    console.error("Error creating settlement:", error);
    return res.status(500).json({ error: "Failed to create settlement" });
  }
}
