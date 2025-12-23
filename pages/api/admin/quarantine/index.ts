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

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { channel, status, limit = "50", offset = "0" } = req.query;

  const where: Record<string, unknown> = {};
  if (channel && typeof channel === "string") {
    where.channel = channel;
  }
  if (status && typeof status === "string") {
    where.status = status;
  }

  const [items, total] = await Promise.all([
    prisma.webhookQuarantine.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Math.min(parseInt(limit as string, 10), 100),
      skip: parseInt(offset as string, 10),
      include: {
        resolvedBy: { select: { id: true, fullName: true, email: true } },
        attachedLoad: { select: { id: true, reference: true } },
        attachedCarrier: { select: { id: true, name: true, mcNumber: true } },
      },
    }),
    prisma.webhookQuarantine.count({ where }),
  ]);

  return res.status(200).json({ items, total });
}
