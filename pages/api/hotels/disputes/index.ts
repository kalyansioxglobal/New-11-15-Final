import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../lib/prisma";
import { requireHotelAccess } from "../../../../lib/hotelAuth";
// Note: HotelDispute enums exist in the Prisma schema but are not exported from @prisma/client types in this version.
// We accept raw string enum values from the client for status/type/channel.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const context = await requireHotelAccess(req, res);
  if (!context) return;
  const { hotelPerm, dbUser } = context;

  try {
    switch (req.method) {
      case "GET":
        return listDisputes(req, res);
      case "POST":
        return createDispute(req, res, hotelPerm, dbUser.id);
      default: {
        res.setHeader("Allow", ["GET", "POST"]);
        return res.status(405).json({ error: "Method not allowed" });
      }
    }
  } catch (err: any) {
    console.error("Hotel disputes API error", err);
    return res
      .status(500)
      .json({ error: "Internal server error", detail: err.message || String(err) });
  }
}

async function listDisputes(req: NextApiRequest, res: NextApiResponse) {
  const { status, propertyId, includeTest, page = "1", pageSize = "50" } = req.query;
  const includeTestData = includeTest === "true";

  const pageNumRaw = parseInt(String(page), 10);
  const pageSizeParsed = parseInt(String(pageSize), 10);

  const pageNum = Number.isFinite(pageNumRaw) && pageNumRaw > 0 ? pageNumRaw : 1;
  const take =
    Number.isFinite(pageSizeParsed) && pageSizeParsed > 0 && pageSizeParsed <= 200
      ? pageSizeParsed
      : 50;
  const skip = (pageNum - 1) * take;

  const where: any = {
    property: {
      ...(includeTestData ? {} : { isTest: false }),
    },
  };

  if (status && typeof status === "string") {
    where.status = status;
  }
  if (propertyId && !Array.isArray(propertyId)) {
    const pid = Number(propertyId);
    if (!Number.isFinite(pid) || pid <= 0) {
      return res.status(400).json({ error: "Invalid propertyId" });
    }
    where.propertyId = pid;
  }

  const [disputes, total] = await Promise.all([
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
    disputes,
    page: pageNum,
    pageSize: take,
    total,
    totalPages: Math.ceil(total / take) || 1,
  });
}

async function createDispute(
  req: NextApiRequest,
  res: NextApiResponse,
  hotelPerm: string,
  createdById: number,
) {
  if (hotelPerm === "view") {
    return res.status(403).json({
      error: "Cannot create disputes with view-only access",
      detail: "Upgrade permissions to create disputes",
    });
  }

  const {
    propertyId,
    type,
    channel,
    reservationId,
    folioNumber,
    guestName,
    guestEmail,
    guestPhone,
    postedDate,
    stayFrom,
    stayTo,
    currency,
    disputedAmount,
    originalAmount,
    reason,
    internalNotes,
    evidenceDueDate,
    ownerId,
    sourceRef,
  } = req.body;

  try {
    const dispute = await prisma.hotelDispute.create({
      data: {
        propertyId,
        type,
        channel,
        reservationId,
        folioNumber,
        guestName,
        guestEmail,
        guestPhone,
        postedDate: postedDate ? new Date(postedDate) : null,
        stayFrom: stayFrom ? new Date(stayFrom) : null,
        stayTo: stayTo ? new Date(stayTo) : null,
        currency: currency || "USD",
        disputedAmount,
        originalAmount,
        reason,
        internalNotes,
        evidenceDueDate: evidenceDueDate ? new Date(evidenceDueDate) : null,
        ownerId: ownerId || null,
        createdById,
        sourceRef,
      },
    });

    return res.status(201).json({ dispute });
  } catch (err: any) {
    console.error("Create dispute error", err);
    return res
      .status(500)
      .json({ error: "Failed to create dispute", detail: err.message || String(err) });
  }
}
