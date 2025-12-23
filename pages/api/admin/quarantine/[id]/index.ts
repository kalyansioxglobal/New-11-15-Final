import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userRole = (session.user as { role?: string }).role;
  if (!["CEO", "ADMIN", "SUPER_ADMIN"].includes(userRole || "")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { id } = req.query;
  const quarantineId = parseInt(id as string, 10);

  if (isNaN(quarantineId)) {
    return res.status(400).json({ error: "Invalid ID" });
  }

  if (req.method === "GET") {
    const item = await prisma.webhookQuarantine.findUnique({
      where: { id: quarantineId },
      include: {
        resolvedBy: { select: { id: true, fullName: true, email: true } },
        attachedLoad: { select: { id: true, reference: true, pickupCity: true, dropCity: true } },
        attachedCarrier: { select: { id: true, name: true, mcNumber: true, email: true, phone: true } },
      },
    });

    if (!item) {
      return res.status(404).json({ error: "Not found" });
    }

    return res.status(200).json(item);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
