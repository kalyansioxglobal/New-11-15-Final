import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { createApiHandler } from "@/lib/api/handler";
import { safeValidate } from "@/lib/api/validation";

const QuerySchema = z.object({
  q: z.string().optional().default(""),
  type: z.enum(["origin", "destination"]).optional().default("destination"),
});

export default createApiHandler(
  {
    GET: async (req: NextApiRequest, res: NextApiResponse) => {
      const validation = safeValidate(QuerySchema, req.query);
      if (!validation.success) {
        return res.status(400).json({ error: (validation as { success: false; error: string }).error });
      }
      
      const { q, type } = validation.data;
      const query = q.trim().toLowerCase();

      if (query.length < 2) {
        return res.status(200).json({ suggestions: [] });
      }

      try {
        const isOrigin = type === "origin";

        const cityField = isOrigin ? "pickupCity" : "dropCity";
        const stateField = isOrigin ? "pickupState" : "dropState";
        const zipField = isOrigin ? "pickupZip" : "dropZip";

        const loads = await prisma.load.findMany({
          where: {
            OR: [
              { [cityField]: { contains: query, mode: "insensitive" } },
              { [stateField]: { contains: query, mode: "insensitive" } },
              { [zipField]: { startsWith: query } },
            ],
            [cityField]: { not: null },
            [stateField]: { not: null },
            [zipField]: { not: null },
          },
          select: {
            pickupCity: true,
            pickupState: true,
            pickupZip: true,
            dropCity: true,
            dropState: true,
            dropZip: true,
          },
          take: 200,
        });

        const uniqueLocations = new Map<
          string,
          { city: string; state: string; zip: string; count: number }
        >();

        for (const load of loads) {
          const city = isOrigin ? load.pickupCity : load.dropCity;
          const state = isOrigin ? load.pickupState : load.dropState;
          const zip = isOrigin ? load.pickupZip : load.dropZip;

          if (city && state && zip) {
            const key = `${city.toLowerCase()}-${state.toLowerCase()}`;
            const existing = uniqueLocations.get(key);
            if (existing) {
              existing.count++;
            } else {
              uniqueLocations.set(key, { city, state, zip, count: 1 });
            }
          }
        }

        const suggestions = Array.from(uniqueLocations.values())
          .filter(
            (loc) =>
              loc.city.toLowerCase().includes(query) ||
              loc.state.toLowerCase().includes(query) ||
              loc.zip.startsWith(query)
          )
          .sort((a, b) => b.count - a.count)
          .slice(0, 15)
          .map((loc) => ({
            label: `${loc.city}, ${loc.state}`,
            city: loc.city,
            state: loc.state,
            zip: loc.zip,
            loadCount: loc.count,
          }));

        return res.status(200).json({ suggestions });
      } catch (error) {
        console.error("City suggestions error:", error);
        return res.status(500).json({ error: "Failed to get suggestions" });
      }
    },
  },
  { requireAuth: true }
);
