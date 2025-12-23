import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { withUser } from "@/lib/api";
import { withRequestLogging } from "@/lib/requestLog";
import { getUserScope } from "@/lib/scope";
import { parseCarrierDispatchersJson, syncCarrierDispatchersJson } from "@/lib/carriers/dispatchers";
import type { SessionUser } from "@/lib/scope";

async function handler(req: NextApiRequest, res: NextApiResponse, user: SessionUser) {
  if (req.method === "GET") {
    const { q, active, state, equipment, dispatcherId, page = "1", limit } = req.query;

    const scope = getUserScope(user);

    const where: any = {};

    if (active === "true") where.active = true;
    if (active === "false") where.active = false;

    if (state) {
      where.state = state;
    }

    if (equipment) {
      where.equipmentTypes = { contains: equipment as string, mode: "insensitive" };
    }

    if (q) {
      where.OR = [
        { name: { contains: q as string, mode: "insensitive" } },
        { mcNumber: { contains: q as string, mode: "insensitive" } },
        { dotNumber: { contains: q as string, mode: "insensitive" } },
        { tmsCarrierCode: { contains: q as string, mode: "insensitive" } },
        { email: { contains: q as string, mode: "insensitive" } },
        { phone: { contains: q as string, mode: "insensitive" } },
        { city: { contains: q as string, mode: "insensitive" } },
      ];
    }

    // Venture scoping for carriers
    if (!scope.allVentures && scope.ventureIds.length > 0) {
      where.ventureId = { in: scope.ventureIds };
    }

    const dispatcherIdNum = dispatcherId ? Number(dispatcherId) : null;

    const pageNum = Math.max(1, Number(page) || 1);
    const DEFAULT_LIMIT = 50;
    const MAX_LIMIT = 200;
    const pageSizeRaw = limit ? Number(limit) : DEFAULT_LIMIT;
    const pageSize = Math.max(1, Math.min(MAX_LIMIT, Number.isNaN(pageSizeRaw) ? DEFAULT_LIMIT : pageSizeRaw));

    const skip = (pageNum - 1) * pageSize;

    let carrierIdsByDispatcher: number[] | null = null;
    if (dispatcherIdNum) {
      const mappings = await (prisma.carrierDispatcher as any).findMany({
        where: { userId: dispatcherIdNum },
        select: { carrierId: true },
      });
      carrierIdsByDispatcher = mappings.map((m: { carrierId: number }) => m.carrierId);
      if (carrierIdsByDispatcher.length === 0) {
        return res.status(200).json({ carriers: [], page: pageNum, pageSize, totalCount: 0, totalPages: 0 });
      }
      where.id = { in: carrierIdsByDispatcher };
    }

    const totalCount = await prisma.carrier.count({ where });

    const carriers = await prisma.carrier.findMany({
      where,
      orderBy: [{ active: "desc" }, { name: "asc" }],
      skip,
      take: pageSize,
      select: {
        id: true,
        name: true,
        legalName: true,
        dbaName: true,
        mcNumber: true,
        dotNumber: true,
        tmsCarrierCode: true,
        email: true,
        phone: true,
        city: true,
        state: true,
        postalCode: true,
        equipmentTypes: true,
        rating: true,
        drivers: true,
        powerUnits: true,
        active: true,
        complianceStatus: true,
        fmcsaStatus: true,
        dispatchersJson: true,
      },
    });

    const items = carriers.map((c: (typeof carriers)[number]) => ({
      ...c,
      dispatchers: parseCarrierDispatchersJson(c.dispatchersJson),
    }));

    const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);

    withRequestLogging(req, res, { user, ventureId: null, officeId: null }, {
      endpoint: "/freight/carriers",
      page: pageNum,
      pageSize,
      dateFrom: null,
      dateTo: null,
    });

    return res.status(200).json({ carriers: items, page: pageNum, pageSize, totalCount, totalPages });
  }

  if (req.method === "POST") {
    const {
      name,
      mcNumber,
      dotNumber,
      email,
      phone,
      city,
      state,
      equipmentTypes,
      lanesJson,
      rating,
      notes,
      dispatcherIds,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Carrier name is required" });
    }

    const carrier = await prisma.carrier.create({
      data: {
        name,
        mcNumber: mcNumber || null,
        dotNumber: dotNumber || null,
        email: email || null,
        phone: phone || null,
        city: city || null,
        state: state || null,
        equipmentTypes: equipmentTypes || null,
        lanesJson: lanesJson || null,
        rating: rating ? parseInt(rating, 10) : null,
        notes: notes || null,
      },
    });

    if (Array.isArray(dispatcherIds) && dispatcherIds.length > 0) {
      const uniqueIds = Array.from(new Set(dispatcherIds.map((id: number | string) => Number(id)))).filter((id) => !Number.isNaN(id));
      if (uniqueIds.length > 0) {
        const usersToAdd = await prisma.user.findMany({
          where: { id: { in: uniqueIds } },
          select: { id: true, fullName: true, email: true },
        });
        const userMap = new Map(usersToAdd.map((u) => [u.id, u]));
        
        await prisma.carrierDispatcher.createMany({
          data: uniqueIds.map((uid) => {
            const userInfo = userMap.get(uid);
            return {
              carrierId: carrier.id,
              userId: uid,
              name: userInfo?.fullName || `User ${uid}`,
              email: userInfo?.email,
            };
          }),
          skipDuplicates: true,
        });
        await syncCarrierDispatchersJson(carrier.id);
      }
    }

    withRequestLogging(req, res, { user, ventureId: null, officeId: null }, {
      endpoint: "/freight/carriers_create",
      page: null,
      pageSize: null,
      dateFrom: null,
      dateTo: null,
    });

    return res.status(201).json(carrier);
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Method not allowed" });
}

export default withUser(handler);
