import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";

function canEditCosts(user: any) {
  if (!user) return false;
  const role = user.role;
  return role === "CEO" || role === "ADMIN";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions as any) as { user?: any } | null;

  if (!session?.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = session.user;

  try {
    if (req.method === "GET") {
      const { userId } = req.query;
      if (!userId || typeof userId !== "string") {
        return res.status(400).json({ error: "userId is required" });
      }
      const parsedUserId = parseInt(userId, 10);
      if (isNaN(parsedUserId) || parsedUserId <= 0) {
        return res
          .status(400)
          .json({ error: "userId must be a valid positive integer" });
      }

      const latest = await prisma.salesPersonCost.findFirst({
        where: { userId: parsedUserId },
        orderBy: { effectiveFrom: "desc" },
      });

      return res.status(200).json({ cost: latest });
    }

    if (req.method === "POST") {
      if (!canEditCosts(user)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { userId, monthlyCost, effectiveFrom } = req.body;

      if (!userId || !monthlyCost) {
        return res
          .status(400)
          .json({ error: "userId and monthlyCost are required" });
      }

      const parsedUserId = Number(userId);
      const parsedCost = Number(monthlyCost);
      if (!parsedUserId || parsedUserId <= 0 || parsedCost < 0) {
        return res.status(400).json({ error: "Invalid values" });
      }

      const effective = effectiveFrom ? new Date(effectiveFrom) : new Date();

      const record = await prisma.salesPersonCost.create({
        data: {
          userId: parsedUserId,
          monthlyCost: parsedCost,
          effectiveFrom: effective,
        },
      });

      return res.status(201).json({ cost: record });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("sales-cost error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
