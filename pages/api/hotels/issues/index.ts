import type { NextApiRequest, NextApiResponse } from "next";
import { requireHotelAccess } from "@/lib/hotelAuth";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const context = await requireHotelAccess(req, res);
  if (!context) return;

  try {
    switch (req.method) {
      case "GET":
        return listIssues(req, res);
      case "POST":
        return createIssue(req, res, context.dbUser.id);
      default:
        res.setHeader("Allow", ["GET", "POST"]);
        return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (err: any) {
    console.error("Hotel issues API error", err);
    return res.status(500).json({ error: "Internal server error", detail: err.message || String(err) });
  }
}

async function listIssues(req: NextApiRequest, res: NextApiResponse) {
  const { status, propertyId, type, includeTest, page = "1", pageSize = "50" } = req.query;
  const includeTestData = includeTest === "true";

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const take = Math.min(200, Math.max(1, parseInt(String(pageSize), 10) || 50));
  const skip = (pageNum - 1) * take;

  const where: any = {
    property: {
      ...(includeTestData ? {} : { isTest: false }),
    },
  };

  if (status && typeof status === "string") {
    where.status = status;
  }
  if (type && typeof type === "string") {
    where.type = type;
  }
  if (propertyId && !Array.isArray(propertyId)) {
    const pid = Number(propertyId);
    if (!Number.isFinite(pid) || pid <= 0) {
      return res.status(400).json({ error: "Invalid propertyId" });
    }
    where.propertyId = pid;
  }

  const [issues, total] = await Promise.all([
    prisma.hotelDispute.findMany({
      where,
      include: {
        property: true,
        owner: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.hotelDispute.count({ where }),
  ]);

  return res.status(200).json({
    issues,
    pagination: {
      page: pageNum,
      pageSize: take,
      total,
      totalPages: Math.ceil(total / take),
    },
  });
}

async function createIssue(req: NextApiRequest, res: NextApiResponse, userId: number) {
  const { propertyId, type, channel, guestName, stayFrom, stayTo, disputedAmount, reason } = req.body;

  if (!propertyId || !type) {
    return res.status(400).json({ error: "propertyId and type are required" });
  }

  const issue = await prisma.hotelDispute.create({
    data: {
      propertyId: Number(propertyId),
      type: type as any,
      channel: channel || "DIRECT",
      guestName: guestName || null,
      stayFrom: stayFrom ? new Date(stayFrom) : null,
      stayTo: stayTo ? new Date(stayTo) : null,
      disputedAmount: disputedAmount ? Number(disputedAmount) : 0,
      reason: reason || null,
      status: "OPEN",
      ownerId: userId,
    },
    include: {
      property: true,
      owner: true,
    },
  });

  return res.status(201).json(issue);
}
