import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const loads = await prisma.load.findMany({
      where: {
        loadStatus: "OPEN",
        isTest: false,
      },
      orderBy: [
        { pickupDate: "asc" },
        { createdAt: "desc" },
      ],
      take: 50,
      select: {
        id: true,
        pickupCity: true,
        pickupState: true,
        dropCity: true,
        dropState: true,
        equipmentType: true,
        weightLbs: true,
        pickupDate: true,
        dropDate: true,
      },
    });

    const formattedLoads = loads.map((load) => ({
      id: load.id,
      originCity: load.pickupCity || "TBD",
      originState: load.pickupState || "",
      destCity: load.dropCity || "TBD",
      destState: load.dropState || "",
      equipmentType: load.equipmentType || "Van",
      weight: load.weightLbs ? Number(load.weightLbs) : null,
      pickupDate: load.pickupDate?.toISOString() || null,
      dropDate: load.dropDate?.toISOString() || null,
    }));

    return res.status(200).json({ loads: formattedLoads });
  } catch (error: unknown) {
    console.error("Carrier portal loads error:", error);
    return res.status(500).json({ error: "Failed to fetch loads" });
  }
}
