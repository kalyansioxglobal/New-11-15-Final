import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { withUser } from "@/lib/api";
import { withRequestLogging } from "@/lib/requestLog";
import { getUserScope } from "@/lib/scope";
import type { SessionUser } from "@/lib/scope";
import { parseCarrierDispatchersJson, syncCarrierDispatchersJson } from "@/lib/carriers/dispatchers";

async function handler(req: NextApiRequest, res: NextApiResponse, user: SessionUser) {
  const carrierId = parseInt(req.query.carrierId as string, 10);
  if (Number.isNaN(carrierId)) {
    return res.status(400).json({ error: "Invalid carrierId" });
  }

  const scope = getUserScope(user);

  if (req.method === "GET") {
    const carrier = await prisma.carrier.findUnique({
      where: { id: carrierId },
      include: {
        loads: {
          select: {
            id: true,
            reference: true,
            pickupCity: true,
            pickupState: true,
            dropCity: true,
            dropState: true,
            pickupDate: true,
            status: true,
            rate: true,
          },
          orderBy: { pickupDate: "desc" },
          take: 20,
        },
        contacts: {
          include: {
            madeBy: { select: { id: true, fullName: true } },
            load: { select: { id: true, reference: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!carrier) {
      return res.status(404).json({ error: "Carrier not found" });
    }

    const dispatchers = parseCarrierDispatchersJson(carrier.dispatchersJson);

    withRequestLogging(req, res, { user, ventureId: null, officeId: null }, {
      endpoint: "/freight/carriers/[id]",
      page: null,
      pageSize: null,
      dateFrom: null,
      dateTo: null,
    });

    return res.json({ carrier: { ...carrier, dispatchers } });
  }

  if (req.method === "PATCH") {
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
      active,
      dispatcherIds,
    } = req.body;

    const carrier = await prisma.carrier.findUnique({
      where: { id: carrierId },
      select: { id: true },
    });

    if (!carrier) {
      return res.status(404).json({ error: "Carrier not found" });
    }

    const data: any = {};

    if (name !== undefined) data.name = name;
    if (mcNumber !== undefined) data.mcNumber = mcNumber || null;
    if (dotNumber !== undefined) data.dotNumber = dotNumber || null;
    if (email !== undefined) data.email = email || null;
    if (phone !== undefined) data.phone = phone || null;
    if (city !== undefined) data.city = city || null;
    if (state !== undefined) data.state = state || null;
    if (equipmentTypes !== undefined) data.equipmentTypes = equipmentTypes || null;
    if (lanesJson !== undefined) data.lanesJson = lanesJson || null;
    if (rating !== undefined) data.rating = rating ? parseInt(rating, 10) : null;
    if (notes !== undefined) data.notes = notes || null;
    if (active !== undefined) data.active = active;

    const updated = await prisma.carrier.update({
      where: { id: carrierId },
      data,
    });

    if (Array.isArray(dispatcherIds)) {
      const existing = await prisma.carrierDispatcher.findMany({
        where: { carrierId: carrierId },
        select: { userId: true },
      });
      const existingIds = new Set(existing.map((m: { userId: number }) => m.userId));
      const nextIds = new Set(
        dispatcherIds
          .map((uid: number | string) => Number(uid))
          .filter((uid: number) => !Number.isNaN(uid)),
      );

      const toAdd: number[] = [];
      const toRemove: number[] = [];

      nextIds.forEach((uid) => {
        if (!existingIds.has(uid)) toAdd.push(uid);
      });

      existingIds.forEach((uid: number) => {
        if (!nextIds.has(uid)) toRemove.push(uid);
      });

      if (toAdd.length > 0) {
        // Fetch user info for the users to add
        const usersToAdd = await prisma.user.findMany({
          where: { id: { in: toAdd } },
          select: { id: true, fullName: true, email: true },
        });
        const userMap = new Map(usersToAdd.map((u) => [u.id, u]));
        
        await prisma.carrierDispatcher.createMany({
          data: toAdd.map((uid) => {
            const userInfo = userMap.get(uid);
            return {
              carrierId,
              userId: uid,
              name: userInfo?.fullName || `User ${uid}`,
              email: userInfo?.email,
            };
          }),
          skipDuplicates: true,
        });
      }

      if (toRemove.length > 0) {
        await prisma.carrierDispatcher.deleteMany({
          where: { carrierId: carrierId, userId: { in: toRemove } },
        });
      }

      await syncCarrierDispatchersJson(carrierId);
    }

    withRequestLogging(req, res, { user, ventureId: null, officeId: null }, {
      endpoint: "/freight/carriers/[id]_update",
      page: null,
      pageSize: null,
      dateFrom: null,
      dateTo: null,
    });

    return res.json({ carrier: updated });
  }

  if (req.method === "DELETE") {
    const carrier = await prisma.carrier.findUnique({
      where: { id: carrierId },
      select: { id: true },
    });

    if (!carrier) {
      return res.status(404).json({ error: "Carrier not found" });
    }

    await prisma.carrier.delete({ where: { id: carrierId } });

    withRequestLogging(req, res, { user, ventureId: null, officeId: null }, {
      endpoint: "/freight/carriers/[id]_delete",
      page: null,
      pageSize: null,
      dateFrom: null,
      dateTo: null,
    });

    return res.json({ success: true });
  }

  res.setHeader("Allow", ["GET", "PATCH", "DELETE"]);
  return res.status(405).json({ error: "Method not allowed" });
}

export default withUser(handler);
