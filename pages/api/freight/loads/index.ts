import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from "@/lib/scope";
import { can } from "@/lib/permissions";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await requireUser(req, res);
  if (!user) {
    return res.status(401).json({ error: "UNAUTHENTICATED" });
  }

  if (req.method === "GET") {
    const { ventureId, officeId, status, q, page: rawPage, pageSize: rawPageSize } = req.query;
    const scope = getUserScope(user);

    // Support both cursor and offset pagination for backward compatibility
    const cursorRaw = req.query.cursor;
    const cursor = cursorRaw ? (typeof cursorRaw === 'string' ? parseInt(cursorRaw, 10) : undefined) : undefined;
    
    const page = Number(rawPage || 1);
    const pageSize = Number(rawPageSize || 50);

    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safePageSize =
      Number.isFinite(pageSize) && pageSize > 0 && pageSize <= 200 ? pageSize : 50;

    // Use cursor pagination if cursor is provided, otherwise use offset
    const useCursor = cursor !== undefined;
    const skip = useCursor ? undefined : (safePage - 1) * safePageSize;
    const take = safePageSize;

    const where: any = {
      isTest: user.isTestUser,
    };

    if (ventureId) {
      const vid = parseInt(ventureId as string, 10);
      if (!can(user, "view", "VENTURE", { ventureId: vid })) {
        return res.status(403).json({ error: "FORBIDDEN" });
      }
      where.ventureId = vid;
    } else if (!scope.allVentures && scope.ventureIds.length > 0) {
      where.ventureId = { in: scope.ventureIds };
    }

    if (officeId) {
      const oid = parseInt(officeId as string, 10);
      where.officeId = oid;
    }

    if (status && status !== "all") {
      where.status = status;
    }

    if (q) {
      where.OR = [
        { tmsLoadId: { contains: q as string, mode: "insensitive" } },
        { reference: { contains: q as string, mode: "insensitive" } },
        { shipperName: { contains: q as string, mode: "insensitive" } },
        { shipperRef: { contains: q as string, mode: "insensitive" } },
        { customerName: { contains: q as string, mode: "insensitive" } },
        { pickupCity: { contains: q as string, mode: "insensitive" } },
        { dropCity: { contains: q as string, mode: "insensitive" } },
      ];
    }

    const [total, loads] = await Promise.all([
      prisma.load.count({ where }),
      prisma.load.findMany({
        where,
        include: {
          venture: { select: { id: true, name: true } },
          office: { select: { id: true, name: true } },
          carrier: { select: { id: true, name: true, mcNumber: true } },
          createdBy: { select: { id: true, fullName: true } },
          csrAlias: { select: { id: true, name: true } },
          dispatcherAlias: { select: { id: true, name: true } },
        },
        orderBy: [{ pickupDate: "asc" }, { createdAt: "desc" }],
        skip,
        take,
      }),
    ]);

    return res.json({
      items: loads,
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.ceil(total / safePageSize) || 1,
    });
  }

  if (req.method === "POST") {
    const {
      ventureId,
      officeId,
      reference,
      shipperName,
      shipperRef,
      customerName,
      pickupCity,
      pickupState,
      pickupZip,
      pickupDate,
      dropCity,
      dropState,
      dropZip,
      dropDate,
      equipmentType,
      weightLbs,
      rate,
      notes,
    } = req.body;

    if (!ventureId || !pickupCity || !pickupState || !pickupDate || !dropCity || !dropState || !equipmentType) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const vid = parseInt(ventureId, 10);
    if (!can(user, "create", "TASK", { ventureId: vid })) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    const load = await prisma.load.create({
      data: {
        ventureId: vid,
        officeId: officeId ? parseInt(officeId, 10) : null,
        reference: reference || null,
        shipperName: shipperName || null,
        shipperRef: shipperRef || null,
        customerName: customerName || null,
        pickupCity,
        pickupState,
        pickupZip: pickupZip || null,
        pickupDate: new Date(pickupDate),
        dropCity,
        dropState,
        dropZip: dropZip || null,
        dropDate: dropDate ? new Date(dropDate) : null,
        equipmentType,
        weightLbs: weightLbs ? parseInt(weightLbs, 10) : null,
        rate: rate ? parseFloat(rate) : null,
        notes: notes || null,
        createdById: user.id,
        isTest: user.isTestUser,
      },
    });

    return res.status(201).json(load);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
