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
  const { id } = req.query;
  const driverId = parseInt(id as string, 10);

  if (isNaN(driverId)) {
    return res.status(400).json({ error: "Invalid driver ID" });
  }

  const driver = await prisma.dispatchDriver.findUnique({
    where: { id: driverId },
    select: { id: true, ventureId: true },
  });

  if (!driver) {
    return res.status(404).json({ error: "Driver not found" });
  }

  if (!scope.allVentures && !scope.ventureIds.includes(driver.ventureId)) {
    return res.status(403).json({ error: "Forbidden: no access to this driver" });
  }

  if (req.method === "GET") {
    try {
      const fullDriver = await prisma.dispatchDriver.findUnique({
        where: { id: driverId },
        include: {
          carrier: { select: { id: true, name: true } },
          truck: { select: { id: true, unitNumber: true, type: true } },
          _count: { select: { dispatchLoads: true, conversations: true } },
        },
      });

      return res.status(200).json({ driver: fullDriver });
    } catch (error) {
      console.error("[DRIVER API] Get error:", error);
      return res.status(500).json({ error: "Failed to fetch driver" });
    }
  }

  if (req.method === "PATCH") {
    try {
      const { firstName, lastName, phone, email, licenseNumber, licenseExpiry, status, notes } = req.body;

      const updateData: any = {};
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (phone) updateData.phone = phone;
      if (email !== undefined) updateData.email = email;
      if (licenseNumber !== undefined) updateData.licenseNumber = licenseNumber;
      if (licenseExpiry !== undefined) {
        updateData.licenseExpiry = licenseExpiry ? new Date(licenseExpiry) : null;
      }
      if (status) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;

      const updatedDriver = await prisma.dispatchDriver.update({
        where: { id: driverId },
        data: updateData,
      });

      return res.status(200).json({ driver: updatedDriver });
    } catch (error) {
      console.error("[DRIVER API] Update error:", error);
      return res.status(500).json({ error: "Failed to update driver" });
    }
  }

  if (req.method === "DELETE") {
    try {
      await prisma.dispatchDriver.delete({
        where: { id: driverId },
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("[DRIVER API] Delete error:", error);
      return res.status(500).json({ error: "Failed to delete driver" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
