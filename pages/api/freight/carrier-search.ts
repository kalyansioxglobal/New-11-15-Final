import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/lib/auth";
import { searchCarriersForLoad, CarrierSearchInput } from "@/lib/freight/carrierSearch";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await getSessionUser(req, res);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { 
    originCity,
    originState,
    originZip, 
    destinationCity,
    destinationState,
    destinationZip, 
    equipmentType, 
    pickupDate, 
    weight, 
    ventureId 
  } = req.body;

  if (!originZip && !originCity) {
    return res.status(400).json({ error: "Origin city or ZIP code is required" });
  }
  
  if (!destinationZip && !destinationCity) {
    return res.status(400).json({ error: "Destination city or ZIP code is required" });
  }

  try {
    const input: CarrierSearchInput = {
      originCity: originCity || null,
      originState: originState || null,
      originZip: originZip ? String(originZip) : null,
      destinationCity: destinationCity || null,
      destinationState: destinationState || null,
      destinationZip: destinationZip ? String(destinationZip) : null,
      equipmentType: equipmentType || null,
      pickupDate: pickupDate ? new Date(pickupDate) : new Date(),
      weight: weight ? Number(weight) : null,
      ventureId: ventureId ? Number(ventureId) : undefined,
    };

    const result = await searchCarriersForLoad(input);

    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Carrier search error:", error);
    return res.status(500).json({ error: "Failed to search carriers" });
  }
}
