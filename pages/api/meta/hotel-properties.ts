import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { requireHotelAccess } from "../../../lib/hotelAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const context = await requireHotelAccess(req, res);
  if (!context) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { page = "1", pageSize = "50" } = req.query;
  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const take = Math.min(200, Math.max(1, parseInt(String(pageSize), 10) || 50));
  const skip = (pageNum - 1) * take;

  const [properties, total] = await Promise.all([
    prisma.hotelProperty.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
        city: true,
        state: true,
      },
      skip,
      take,
    }),
    prisma.hotelProperty.count(),
  ]);

  res.json({
    properties,
    page: pageNum,
    pageSize: take,
    total,
    totalPages: Math.ceil(total / take),
  });
}
