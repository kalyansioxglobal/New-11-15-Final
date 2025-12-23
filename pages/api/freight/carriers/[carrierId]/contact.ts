import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from '@/lib/apiAuth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await requireUser(req, res);
  if (!user) {
    return res.status(401).json({ error: "UNAUTHENTICATED" });
  }

  const carrierId = parseInt(req.query.carrierId as string, 10);
  if (isNaN(carrierId)) {
    return res.status(400).json({ error: "Invalid carrier ID" });
  }

  if (req.method === "POST") {
    const { loadId, channel, subject, body, outcome, notes } = req.body;

    if (!channel) {
      return res.status(400).json({ error: "Channel is required" });
    }

    const contact = await prisma.carrierContact.create({
      data: {
        carrierId,
        loadId: loadId ? parseInt(loadId, 10) : null,
        madeById: user.id,
        channel,
        subject: subject || null,
        body: body || null,
        outcome: outcome || null,
        notes: notes || null,
      },
      include: {
        carrier: { select: { id: true, name: true } },
        madeBy: { select: { id: true, fullName: true } },
      },
    });

    return res.status(201).json({ contact });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
