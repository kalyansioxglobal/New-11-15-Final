import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/apiAuth";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  const carrierId = parseInt(req.query.carrierId as string, 10);
  if (isNaN(carrierId)) {
    return res.status(400).json({ error: "Invalid carrier ID" });
  }

  const carrier = await prisma.carrier.findUnique({
    where: { id: carrierId },
    select: { id: true },
  });

  if (!carrier) {
    return res.status(404).json({ error: "Carrier not found" });
  }

  if (req.method === "GET") {
    const lanes = await prisma.carrierPreferredLane.findMany({
      where: { carrierId },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ lanes });
  }

  if (req.method === "POST") {
    const { origin, destination, radius } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({ error: "Origin and destination are required" });
    }

    const normalizedOrigin = origin.trim().toUpperCase();
    const normalizedDestination = destination.trim().toUpperCase();

    try {
      const lane = await prisma.carrierPreferredLane.upsert({
        where: {
          carrierId_origin_destination: {
            carrierId,
            origin: normalizedOrigin,
            destination: normalizedDestination,
          },
        },
        update: {
          radius: radius ?? 200,
        },
        create: {
          carrierId,
          origin: normalizedOrigin,
          destination: normalizedDestination,
          radius: radius ?? 200,
        },
      });

      return res.status(200).json({ ok: true, lane });
    } catch (err: any) {
      console.error("Error adding carrier lane:", err);
      return res.status(500).json({ error: "Failed to add lane" });
    }
  }

  if (req.method === "DELETE") {
    const { origin, destination } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({ error: "Origin and destination are required" });
    }

    try {
      await prisma.carrierPreferredLane.deleteMany({
        where: {
          carrierId,
          origin: origin.trim().toUpperCase(),
          destination: destination.trim().toUpperCase(),
        },
      });

      return res.status(200).json({ ok: true });
    } catch (err: any) {
      console.error("Error deleting carrier lane:", err);
      return res.status(500).json({ error: "Failed to delete lane" });
    }
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
