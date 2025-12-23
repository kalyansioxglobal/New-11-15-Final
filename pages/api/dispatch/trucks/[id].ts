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

  const { id } = req.query;
  const truckId = Number(id);

  if (!Number.isFinite(truckId) || truckId <= 0) {
    return res.status(400).json({ error: "Invalid truck ID" });
  }

  try {
    switch (req.method) {
      case "GET":
        return getTruck(req, res, truckId);
      case "PATCH":
        return updateTruck(req, res, truckId);
      case "DELETE":
        return deleteTruck(req, res, truckId);
      default:
        res.setHeader("Allow", ["GET", "PATCH", "DELETE"]);
        return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error: any) {
    console.error("Dispatch truck API error:", error);
    return res.status(500).json({ error: "Internal server error", detail: error.message || String(error) });
  }
});

async function getTruck(req: NextApiRequest, res: NextApiResponse, truckId: number) {
  const truck = await prisma.dispatchTruck.findUnique({
    where: { id: truckId },
    include: {
      driver: true,
      venture: true,
      dispatchLoads: {
        take: 10,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!truck) {
    return res.status(404).json({ error: "Truck not found" });
  }

  return res.status(200).json(truck);
}

async function updateTruck(req: NextApiRequest, res: NextApiResponse, truckId: number) {
  const { unitNumber, type, make, model, year, vin, plateNumber, status, driverId, notes } = req.body;

  const truck = await prisma.dispatchTruck.update({
    where: { id: truckId },
    data: {
      ...(unitNumber && { unitNumber }),
      ...(type && { type }),
      ...(make !== undefined && { make: make || null }),
      ...(model !== undefined && { model: model || null }),
      ...(year !== undefined && { year: year ? Number(year) : null }),
      ...(vin !== undefined && { vin: vin || null }),
      ...(plateNumber !== undefined && { plateNumber: plateNumber || null }),
      ...(status && { status }),
      ...(driverId !== undefined && { driverId: driverId ? Number(driverId) : null }),
      ...(notes !== undefined && { notes: notes || null }),
    },
    include: {
      driver: true,
      venture: true,
    },
  });

  return res.status(200).json(truck);
}

async function deleteTruck(req: NextApiRequest, res: NextApiResponse, truckId: number) {
  const loadsCount = await prisma.dispatchLoad.count({
    where: { truckId },
  });

  if (loadsCount > 0) {
    return res.status(400).json({
      error: `Cannot delete truck: ${loadsCount} load(s) are associated with this truck`,
    });
  }

  await prisma.dispatchTruck.delete({
    where: { id: truckId },
  });

  return res.status(200).json({ success: true });
}
