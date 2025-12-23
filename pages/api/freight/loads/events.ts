import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";
import { can } from "@/lib/permissions";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const { loadId, id } = req.query;
    const parsedId = Number(loadId ?? id);

    if (!parsedId || isNaN(parsedId)) {
      return res.status(400).json({ error: "Invalid load id" });
    }

    const load = await prisma.load.findUnique({
      where: { id: parsedId },
      select: { id: true, ventureId: true },
    });

    if (!load) {
      return res.status(404).json({ error: "Load not found" });
    }

    if (!can(user, "view", "TASK", { ventureId: load.ventureId })) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    const events = await prisma.logisticsLoadEvent.findMany({
      where: { loadId: parsedId },
      orderBy: { createdAt: "asc" },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    return res.status(200).json({ events });
  } catch (err: any) {
    console.error("Error fetching load events:", err);
    return res.status(err.statusCode ?? 500).json({ error: err.message ?? "Internal Server Error" });
  }
}
