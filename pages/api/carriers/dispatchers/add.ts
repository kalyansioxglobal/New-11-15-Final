import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { withUser } from "@/lib/api";
import { withRequestLogging } from "@/lib/requestLog";
import { getUserScope } from "@/lib/scope";
import type { SessionUser } from "@/lib/scope";
import { UserRole } from "@prisma/client";
import { logAuditEvent } from "@/lib/audit";
import { parseCarrierDispatchersJson, syncCarrierDispatchersJson } from "@/lib/carriers/dispatchers";

function canManageCarrierDispatchers(role: string): boolean {
  const allowedRoles = ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "DISPATCHER"];
  return allowedRoles.includes(role);
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  user: SessionUser,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  if (!canManageCarrierDispatchers(user.role)) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }

  const { carrierId, userId } = req.body ?? {};

  if (!carrierId || !userId || Number.isNaN(Number(carrierId)) || Number.isNaN(Number(userId))) {
    return res.status(400).json({ error: "INVALID_PAYLOAD" });
  }

  const carrierIdNum = Number(carrierId);
  const userIdNum = Number(userId);

  const carrier = await prisma.carrier.findUnique({
    where: { id: carrierIdNum },
    select: { id: true, dispatchersJson: true },
  });

  if (!carrier) {
    return res.status(404).json({ error: "CARRIER_NOT_FOUND" });
  }

  // Fetch the user to get their name for the dispatcher record
  const targetUser = await prisma.user.findUnique({
    where: { id: userIdNum },
    select: { id: true, fullName: true, email: true },
  });

  if (!targetUser) {
    return res.status(404).json({ error: "USER_NOT_FOUND" });
  }

  try {
    await prisma.carrierDispatcher.create({
      data: {
        carrierId: carrierIdNum,
        userId: userIdNum,
        name: targetUser.fullName || `User ${userIdNum}`,
        email: targetUser.email,
      },
    });
  } catch (err: any) {
    // Unique violation: mapping already exists – treat as a no-op.
    if (String(err?.code) === "P2002") {
      // fall through
    } else {
      console.error("carrier_dispatchers_add error", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  await syncCarrierDispatchersJson(carrierIdNum);

  await logAuditEvent(req, user, {
    domain: "freight",
    action: "CARRIER_DISPATCHER_ADDED",
    entityType: "Carrier",
    entityId: carrierIdNum,
    metadata: { carrierId: carrierIdNum, userId: userIdNum, actorId: user.id },
  });

  const updatedCarrier = await prisma.carrier.findUnique({
    where: { id: carrierIdNum },
    select: { id: true, dispatchersJson: true },
  });

  const dispatchers = parseCarrierDispatchersJson(updatedCarrier?.dispatchersJson ?? null);

  withRequestLogging(req, res, { user, ventureId: null, officeId: null }, {
    endpoint: "carrier_dispatchers_add",
    page: null,
    pageSize: null,
    dateFrom: null,
    dateTo: null,
  });

  return res.status(200).json({ carrierId: carrier.id, dispatchers });
}

export default withUser(handler);
