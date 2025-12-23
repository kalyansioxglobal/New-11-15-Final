import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const user = await requireUser(req, res);
  if (!user) {
    return res.status(401).json({ error: "UNAUTHENTICATED" });
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { carrierId: carrierIdParam } = req.query;
  const carrierId = Number(carrierIdParam);

  if (!carrierIdParam || Number.isNaN(carrierId)) {
    return res.status(400).json({ error: "INVALID_CARRIER_ID" });
  }

  try {
    const dispatchers = await prisma.carrierDispatcher.findMany({
      where: { carrierId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isPrimary: true,
      },
    });

    return res.status(200).json({ dispatchers });
  } catch (error) {
    // Keep error handling minimal to avoid changing global behavior patterns
    // for freight APIs in this wave.
    console.error("/api/freight/carriers/dispatchers error", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
