import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

function isAllowedRole(role: string): boolean {
  return ["CEO", "ADMIN", "COO", "DISPATCHER", "CSR", "VENTURE_HEAD"].includes(
    role,
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const user = await requireUser(req, res);
  if (!user) return;

  if (!isAllowedRole(user.role)) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }

  const { carrierId } = req.query;

  if (!carrierId || typeof carrierId !== "string") {
    return res.status(400).json({ error: "carrierId is required" });
  }

  const carrierIdInt = parseInt(carrierId, 10);
  if (isNaN(carrierIdInt)) {
    return res.status(400).json({ error: "carrierId must be a valid integer" });
  }

  const carrier = await prisma.carrier.findUnique({
    where: { id: carrierIdInt },
    select: { id: true },
  });

  if (!carrier) {
    return res.status(404).json({ error: "Carrier not found" });
  }

  try {
    switch (req.method) {
      case "GET":
        return handleGet(res, carrierIdInt);
      case "POST":
        return handlePost(req, res, carrierIdInt);
      case "PUT":
      case "PATCH":
        return handleUpdate(req, res, carrierIdInt);
      case "DELETE":
        return handleDelete(req, res, carrierIdInt);
      default:
        return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (err: any) {
    console.error(`/api/freight/carriers/[carrierId]/dispatchers error`, err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function handleGet(res: NextApiResponse, carrierId: number) {
  const dispatchers = await prisma.carrierDispatcher.findMany({
    where: { carrierId },
    select: {
      id: true,
      name: true,
      role: true,
      email: true,
      phone: true,
      mobile: true,
      isPrimary: true,
      isBackup: true,
      preferredContactMethod: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ isPrimary: "desc" }, { isBackup: "desc" }, { name: "asc" }],
  });

  return res.json({ dispatchers });
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  carrierId: number,
) {
  const {
    name,
    role,
    email,
    phone,
    mobile,
    isPrimary,
    isBackup,
    preferredContactMethod,
    notes,
  } = req.body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }

  if (isPrimary) {
    await prisma.carrierDispatcher.updateMany({
      where: { carrierId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  const dispatcher = await prisma.carrierDispatcher.create({
    data: {
      carrierId,
      name: name.trim(),
      role: role?.trim() || null,
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      mobile: mobile?.trim() || null,
      isPrimary: !!isPrimary,
      isBackup: !!isBackup,
      preferredContactMethod: preferredContactMethod?.trim() || null,
      notes: notes?.trim() || null,
    },
  });

  return res.status(201).json({ dispatcher });
}

async function handleUpdate(
  req: NextApiRequest,
  res: NextApiResponse,
  carrierId: number,
) {
  const {
    dispatcherId,
    name,
    role,
    email,
    phone,
    mobile,
    isPrimary,
    isBackup,
    preferredContactMethod,
    notes,
  } = req.body;

  if (!dispatcherId || typeof dispatcherId !== "string") {
    return res.status(400).json({ error: "dispatcherId is required" });
  }

  const existing = await prisma.carrierDispatcher.findFirst({
    where: { id: dispatcherId, carrierId },
  });

  if (!existing) {
    return res.status(404).json({ error: "Dispatcher not found" });
  }

  if (isPrimary && !existing.isPrimary) {
    await prisma.carrierDispatcher.updateMany({
      where: { carrierId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  const dispatcher = await prisma.carrierDispatcher.update({
    where: { id: dispatcherId },
    data: {
      name: name?.trim() ?? existing.name,
      role: role !== undefined ? role?.trim() || null : existing.role,
      email: email !== undefined ? email?.trim() || null : existing.email,
      phone: phone !== undefined ? phone?.trim() || null : existing.phone,
      mobile: mobile !== undefined ? mobile?.trim() || null : existing.mobile,
      isPrimary: isPrimary !== undefined ? !!isPrimary : existing.isPrimary,
      isBackup: isBackup !== undefined ? !!isBackup : existing.isBackup,
      preferredContactMethod:
        preferredContactMethod !== undefined
          ? preferredContactMethod?.trim() || null
          : existing.preferredContactMethod,
      notes: notes !== undefined ? notes?.trim() || null : existing.notes,
    },
  });

  return res.json({ dispatcher });
}

async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse,
  carrierId: number,
) {
  const { dispatcherId } = req.body;

  if (!dispatcherId || typeof dispatcherId !== "string") {
    return res.status(400).json({ error: "dispatcherId is required" });
  }

  const existing = await prisma.carrierDispatcher.findFirst({
    where: { id: dispatcherId, carrierId },
  });

  if (!existing) {
    return res.status(404).json({ error: "Dispatcher not found" });
  }

  await prisma.carrierDispatcher.delete({
    where: { id: dispatcherId },
  });

  return res.json({ success: true });
}
