import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";
import { applyLoadScope } from "@/lib/scopeLoads";
import { parseCursorParams, createCursorResponse } from "@/lib/pagination/cursor";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const {
      status,
      atRisk,
      lost,
      shipperId,
      repId,
      ventureId,
      officeId,
      customerId,
    } = req.query;

    // Parse cursor pagination params (supports both cursor and legacy page/limit)
    const { cursor, limit } = parseCursorParams(req.query, { maxLimit: 200, defaultLimit: 50 });

    const baseWhere: Record<string, unknown> = {};

    if (ventureId) baseWhere.ventureId = Number(ventureId);
    if (officeId) baseWhere.officeId = Number(officeId);
    if (status) baseWhere.loadStatus = status;
    if (atRisk === "true") {
      baseWhere.atRiskFlag = true;
      baseWhere.loadStatus = "AT_RISK";
    }
    if (lost === "true") baseWhere.loadStatus = "LOST";
    if (shipperId) baseWhere.shipperId = Number(shipperId);
    if (customerId) baseWhere.customerId = Number(customerId);
    if (repId) baseWhere.createdById = Number(repId);

    const where = applyLoadScope(user, baseWhere);

    // Fetch limit + 1 to detect if more items exist
    const items = await prisma.load.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
      include: {
        venture: { select: { id: true, name: true } },
        office: { select: { id: true, name: true } },
        shipper: { select: { id: true, name: true, tmsShipperCode: true } },
        carrier: { select: { id: true, name: true, mcNumber: true } },
        customer: { select: { id: true, name: true } },
        createdBy: { select: { id: true, fullName: true } },
        lostReasonRef: { select: { id: true, name: true, category: true } },
      },
    });

    const result = createCursorResponse(items, limit);

    return res.status(200).json({
      ...result,
      // Legacy fields for backward compatibility
      total: null, // Not calculated for cursor pagination
      page: null,
      limit,
      totalPages: null,
    });
  } catch (err: any) {
    const { logger } = await import("@/lib/logger");
    logger.error("loads_list_failed", {
      userId: user.id,
      ventureId: req.query.ventureId,
      error: err?.message || String(err),
      stack: process.env.NODE_ENV !== 'production' ? err?.stack : undefined,
    });
    return res.status(err.statusCode ?? 500).json({ error: err.message ?? "Internal Server Error" });
  }
}
