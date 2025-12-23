import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await getSessionUser(req, res);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { zip, type } = req.query;
  const zipCode = String(zip || "").trim();
  
  if (zipCode.length < 3) {
    return res.status(200).json({ location: null });
  }

  try {
    const isOrigin = type === "origin";
    
    const load = await prisma.load.findFirst({
      where: isOrigin
        ? { pickupZip: { startsWith: zipCode }, pickupCity: { not: null }, pickupState: { not: null } }
        : { dropZip: { startsWith: zipCode }, dropCity: { not: null }, dropState: { not: null } },
      select: {
        pickupCity: true,
        pickupState: true,
        pickupZip: true,
        dropCity: true,
        dropState: true,
        dropZip: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!load) {
      return res.status(200).json({ location: null });
    }

    const city = isOrigin ? load.pickupCity : load.dropCity;
    const state = isOrigin ? load.pickupState : load.dropState;
    const foundZip = isOrigin ? load.pickupZip : load.dropZip;

    return res.status(200).json({
      location: {
        city,
        state,
        zip: foundZip,
      },
    });
  } catch (error: any) {
    console.error("ZIP lookup error:", error);
    return res.status(500).json({ error: "Failed to lookup ZIP" });
  }
}
