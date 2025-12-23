import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../../lib/prisma";
import { requireHotelAccess } from "../../../../../lib/hotelAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const context = await requireHotelAccess(req, res);
  if (!context) return;
  const { dbUser, hotelPerm } = context;

  const id = Number(req.query.id);
  if (!id) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).end();
    return;
  }

  if (hotelPerm === "view") {
    res.status(403).json({ error: "View-only access" });
    return;
  }

  const { body } = req.body as { body: string };

  if (!body) {
    res.status(400).json({ error: "body is required" });
    return;
  }

  try {
    const note = await prisma.hotelDisputeNote.create({
      data: {
        disputeId: id,
        body,
        authorId: dbUser.id,
      },
    });

    res.status(201).json({ note });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to add note", detail: err.message });
  }
}
