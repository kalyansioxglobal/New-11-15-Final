import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import {
  searchCarriersForLoad,
  CarrierSearchInput,
} from "@/lib/freight/carrierSearch";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") return res.status(405).end();

  const user = await getSessionUser(req, res);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const loadId = Number(req.query.id);
  if (!loadId || Number.isNaN(loadId)) {
    return res.status(400).json({ error: "Invalid load id" });
  }

  const load = await prisma.load.findUnique({
    where: { id: loadId },
    include: {
      shipper: true,
      venture: true,
    },
  });

  if (!load) {
    return res.status(404).json({ error: "Load not found" });
  }

  const input: CarrierSearchInput = {
    originZip: load.pickupZip ?? "",
    destinationZip: load.dropZip ?? "",
    equipmentType: load.equipmentType ?? null,
    pickupDate: load.pickupDate ?? new Date(),
    weight: load.weightLbs ?? null,
    ventureId: load.ventureId ?? undefined,
  };

  const searchResult = await searchCarriersForLoad(input);
  const allCarriers = [...searchResult.recommendedCarriers, ...searchResult.newCarriers];

  const limit = Number(req.query.limit ?? 20);
  res.json({
    loadId,
    load: {
      reference: load.tmsLoadId || load.reference,
      origin: `${load.pickupCity || ""}, ${load.pickupState || ""} ${load.pickupZip || ""}`.trim(),
      destination: `${load.dropCity || ""}, ${load.dropState || ""} ${load.dropZip || ""}`.trim(),
      equipmentType: load.equipmentType,
      pickupDate: load.pickupDate,
    },
    count: allCarriers.length,
    recommendedCarriers: searchResult.recommendedCarriers.slice(0, limit),
    newCarriers: searchResult.newCarriers.slice(0, limit),
    carriers: allCarriers.slice(0, limit),
  });
}
