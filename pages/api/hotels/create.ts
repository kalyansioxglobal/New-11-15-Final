import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireLeadership } from "@/lib/apiAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireLeadership(req, res);
  if (!user) return;

  if (req.method !== "POST") return res.status(405).end();

  const { ventureId, name, code, rooms, city, state } = req.body;

  if (!ventureId || !name) {
    return res.status(400).json({ error: "ventureId and name are required" });
  }

  try {
    const hotel = await prisma.hotelProperty.create({
      data: {
        ventureId: Number(ventureId),
        name,
        code: code || null,
        rooms: rooms ? Number(rooms) : null,
        city: city || null,
        state: state || null,
        status: "ACTIVE",
      },
    });

    return res.status(200).json({ hotel });
  } catch (err: any) {
    console.error("Create hotel error", err);
    return res.status(500).json({ error: "Failed to create hotel" });
  }
}
