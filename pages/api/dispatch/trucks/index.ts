import type { NextApiRequest, NextApiResponse } from "next";
import { withUser } from "@/lib/api";
import prisma from "@/lib/prisma";

export default withUser(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  user
) {
  const allowedRoles = ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "TEAM_LEAD", "DISPATCHER"];
  if (!allowedRoles.includes(user.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    switch (req.method) {
      case "GET":
        return getTrucks(req, res);
      case "POST":
        return createTruck(req, res);
      default:
        res.setHeader("Allow", ["GET", "POST"]);
        return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error: any) {
    console.error("Dispatch trucks API error:", error);
    return res.status(500).json({ error: "Internal server error", detail: error.message || String(error) });
  }
});

async function getTrucks(req: NextApiRequest, res: NextApiResponse) {
  const { status, search, ventureId, page = "1", limit = "50" } = req.query;

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const take = Math.min(200, Math.max(1, parseInt(String(limit), 10) || 50));
  const skip = (pageNum - 1) * take;

  const where: any = {
    isTest: false,
  };

  if (ventureId) {
    where.ventureId = Number(ventureId);
  }
  if (status && typeof status === "string" && status !== "all") {
    where.status = status;
  }
  if (search && typeof search === "string") {
    where.OR = [
      { unitNumber: { contains: search, mode: "insensitive" } },
      { make: { contains: search, mode: "insensitive" } },
      { model: { contains: search, mode: "insensitive" } },
      { plateNumber: { contains: search, mode: "insensitive" } },
      { vin: { contains: search, mode: "insensitive" } },
    ];
  }

  const [trucks, total] = await Promise.all([
    prisma.dispatchTruck.findMany({
      where,
      include: {
        driver: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
        venture: {
          select: { id: true, name: true },
        },
        _count: {
          select: { dispatchLoads: true },
        },
      },
      orderBy: { unitNumber: "asc" },
      skip,
      take,
    }),
    prisma.dispatchTruck.count({ where }),
  ]);

  return res.status(200).json({
    trucks,
    pagination: {
      page: pageNum,
      limit: take,
      total,
      totalPages: Math.ceil(total / take),
    },
  });
}

async function createTruck(req: NextApiRequest, res: NextApiResponse) {
  const { ventureId, unitNumber, type, make, model, year, vin, plateNumber, notes } = req.body;

  if (!ventureId || !unitNumber || !type) {
    return res.status(400).json({ error: "ventureId, unitNumber, and type are required" });
  }

  const truck = await prisma.dispatchTruck.create({
    data: {
      ventureId: Number(ventureId),
      unitNumber,
      type,
      make: make || null,
      model: model || null,
      year: year ? Number(year) : null,
      vin: vin || null,
      plateNumber: plateNumber || null,
      notes: notes || null,
      status: "AVAILABLE",
    },
    include: {
      driver: true,
      venture: true,
    },
  });

  return res.status(201).json(truck);
}
