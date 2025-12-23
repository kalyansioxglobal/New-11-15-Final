import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";
import { getUserScope } from "@/lib/scope";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await requireUser(req, res);
  if (!user) return;

  const scope = getUserScope(user);

  if (req.method === "GET") {
    try {
      const { status, search } = req.query;

      const where: any = { isTest: user.isTestUser };

      if (!scope.allVentures && scope.ventureIds.length > 0) {
        where.ventureId = { in: scope.ventureIds };
      }

      if (status && status !== "all") {
        where.status = status as string;
      }

      if (search) {
        where.OR = [
          { referenceNumber: { contains: search as string, mode: "insensitive" } },
          { pickupCity: { contains: search as string, mode: "insensitive" } },
          { deliveryCity: { contains: search as string, mode: "insensitive" } },
        ];
      }

      const loads = await prisma.dispatchLoad.findMany({
        where,
        include: {
          driver: { select: { id: true, firstName: true, lastName: true, phone: true } },
          truck: { select: { id: true, unitNumber: true, type: true } },
        },
        orderBy: { pickupDate: "asc" },
        take: 100,
      });

      return res.status(200).json({
        loads: loads.map((l) => ({
          ...l,
          rate: l.rate.toString(),
          driverPay: l.driverPay?.toString() || null,
        })),
      });
    } catch (error) {
      console.error("[LOADS API] Error:", error);
      return res.status(500).json({ error: "Failed to fetch loads" });
    }
  }

  if (req.method === "POST") {
    try {
      const {
        referenceNumber,
        pickupCity,
        pickupState,
        pickupAddress,
        pickupDate,
        deliveryCity,
        deliveryState,
        deliveryAddress,
        deliveryDate,
        rate,
        driverPay,
        driverId,
        truckId,
        notes,
        ventureId,
      } = req.body;

      if (!referenceNumber || !pickupCity || !pickupState || !deliveryCity || !deliveryState || !rate) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      let resolvedVentureId = ventureId;
      if (!resolvedVentureId) {
        if (!scope.allVentures && scope.ventureIds.length > 0) {
          resolvedVentureId = scope.ventureIds[0];
        } else {
          const defaultVenture = await prisma.venture.findFirst({
            where: { type: "LOGISTICS", isActive: true, isTest: user.isTestUser },
          });
          resolvedVentureId = defaultVenture?.id;
        }
      }

      if (!resolvedVentureId) {
        return res.status(400).json({ error: "No venture available" });
      }

      if (!scope.allVentures && !scope.ventureIds.includes(resolvedVentureId)) {
        return res.status(403).json({ error: "Forbidden: no access to this venture" });
      }

      const load = await prisma.dispatchLoad.create({
        data: {
          ventureId: resolvedVentureId,
          referenceNumber,
          pickupCity,
          pickupState,
          pickupAddress: pickupAddress || "",
          pickupDate: new Date(pickupDate),
          deliveryCity,
          deliveryState,
          deliveryAddress: deliveryAddress || "",
          deliveryDate: new Date(deliveryDate),
          rate: parseFloat(rate),
          driverPay: driverPay ? parseFloat(driverPay) : null,
          driverId: driverId ? parseInt(driverId) : null,
          truckId: truckId ? parseInt(truckId) : null,
          notes,
          isTest: user.isTestUser,
        },
      });

      return res.status(201).json({
        load: {
          ...load,
          rate: load.rate.toString(),
          driverPay: load.driverPay?.toString() || null,
        },
      });
    } catch (error) {
      console.error("[LOADS API] Create error:", error);
      return res.status(500).json({ error: "Failed to create load" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
