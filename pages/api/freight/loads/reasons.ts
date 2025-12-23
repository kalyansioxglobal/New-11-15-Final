import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  try {
    if (req.method === "GET") {
      const reasons = await prisma.lostLoadReason.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
        },
      });
      return res.status(200).json({ reasons });
    }

    if (req.method === "POST") {
      const { name, description, category } = req.body;

      if (!name || typeof name !== "string") {
        return res.status(400).json({ error: "Name is required" });
      }

      const reason = await prisma.lostLoadReason.create({
        data: {
          name: name.trim(),
          description: description || null,
          category: category || null,
        },
      });
      return res.status(201).json({ reason });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("Error with lost reasons:", err);
    return res.status(err.statusCode ?? 500).json({ error: err.message ?? "Internal Server Error" });
  }
}
