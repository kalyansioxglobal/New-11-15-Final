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
      const { status, search, page = "1", limit = "50" } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      const where: any = { isTest: user.isTestUser };

      if (!scope.allVentures && scope.ventureIds.length > 0) {
        where.ventureId = { in: scope.ventureIds };
      }

      if (status && status !== "all") {
        where.status = status as string;
      }

      if (search) {
        where.OR = [
          { firstName: { contains: search as string, mode: "insensitive" } },
          { lastName: { contains: search as string, mode: "insensitive" } },
          { phone: { contains: search as string } },
          { email: { contains: search as string, mode: "insensitive" } },
        ];
      }

      const [drivers, total] = await Promise.all([
        prisma.dispatchDriver.findMany({
          where,
          include: {
            carrier: { select: { id: true, name: true } },
            truck: { select: { id: true, unitNumber: true, type: true } },
            _count: { select: { dispatchLoads: true, conversations: true } },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limitNum,
        }),
        prisma.dispatchDriver.count({ where }),
      ]);

      return res.status(200).json({
        drivers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error("[DRIVERS API] Error:", error);
      return res.status(500).json({ error: "Failed to fetch drivers" });
    }
  }

  if (req.method === "POST") {
    try {
      const { firstName, lastName, phone, email, licenseNumber, licenseExpiry, carrierId, notes, ventureId } = req.body;

      if (!firstName || !lastName || !phone) {
        return res.status(400).json({ error: "First name, last name, and phone are required" });
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

      const driver = await prisma.dispatchDriver.create({
        data: {
          ventureId: resolvedVentureId,
          firstName,
          lastName,
          phone,
          email,
          licenseNumber,
          licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : undefined,
          carrierId,
          notes,
          isTest: user.isTestUser,
        },
      });

      return res.status(201).json({ driver });
    } catch (error) {
      console.error("[DRIVERS API] Create error:", error);
      return res.status(500).json({ error: "Failed to create driver" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

