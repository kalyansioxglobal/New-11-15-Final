import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { withUser } from "@/lib/api";
import { withRequestLogging } from "@/lib/requestLog";
import type { SessionUser } from "@/lib/scope";
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

  await prisma.carrierDispatcher.deleteMany({
    where: {
      carrierId: carrierIdNum,
      userId: userIdNum,
    },
  });

  await syncCarrierDispatchersJson(carrierIdNum);

  await logAuditEvent(req, user, {
    domain: "freight",
    action: "CARRIER_DISPATCHER_REMOVED",
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
    endpoint: "carrier_dispatchers_remove",
    page: null,
    pageSize: null,
    dateFrom: null,
    dateTo: null,
  });

  return res.status(200).json({ carrierId: carrier.id, dispatchers });
}

export default withUser(handler);
