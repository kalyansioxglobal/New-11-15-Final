import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";

async function getCurrentUserId(req: NextApiRequest, res: NextApiResponse): Promise<number | null> {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return null;
  return Number(session.user.id);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const userId = await getCurrentUserId(req, res);
  if (!userId) return res.status(401).json({ error: "Unauthenticated" });

  try {
    const {
      ventureId,
      officeId,
      taskId,
      policyId,
      loadId,
      shipperId,
      carrierId,
      hotelId,
      tag,
      page = "1",
      pageSize = "50",
    } = req.query;

    const pageNumRaw = parseInt(String(page), 10);
    const pageSizeParsed = parseInt(String(pageSize), 10);

    const pageNum = Number.isFinite(pageNumRaw) && pageNumRaw > 0 ? pageNumRaw : 1;
    const take =
      Number.isFinite(pageSizeParsed) && pageSizeParsed > 0 && pageSizeParsed <= 200
        ? pageSizeParsed
        : 50;
    const skip = (pageNum - 1) * take;

    const where: Record<string, unknown> = {
      deletedAt: null,
      userId,
    };

    if (ventureId) where.ventureId = Number(ventureId);
    if (officeId) where.officeId = Number(officeId);
    if (taskId) where.taskId = Number(taskId);
    if (policyId) where.policyId = Number(policyId);
    if (loadId) where.loadId = Number(loadId);
    if (shipperId) where.shipperId = Number(shipperId);
    if (carrierId) where.carrierId = Number(carrierId);
    if (hotelId) where.hotelId = Number(hotelId);
    if (tag) where.tag = String(tag);

    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          uploadedBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
        skip,
        take,
      }),
      prisma.file.count({ where }),
    ]);

    return res.status(200).json({
      files,
      page: pageNum,
      pageSize: take,
      total,
      totalPages: Math.ceil(total / take) || 1,
    });
  } catch (err: any) {
    console.error("Files list error", err);
    return res.status(500).json({ error: "Failed to list files", detail: err.message || String(err) });
  }
}
