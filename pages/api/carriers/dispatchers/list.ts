import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { withUser } from "@/lib/api";
import { withRequestLogging } from "@/lib/requestLog";
import type { SessionUser } from "@/lib/scope";
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
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  if (!canManageCarrierDispatchers(user.role)) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }

  const carrierIdParam = req.query.carrierId;
  const carrierId = Number(Array.isArray(carrierIdParam) ? carrierIdParam[0] : carrierIdParam);

  if (!carrierId || Number.isNaN(carrierId)) {
    return res.status(400).json({ error: "INVALID_CARRIER_ID" });
  }

  const carrier = await prisma.carrier.findUnique({
    where: { id: carrierId },
    select: { id: true, dispatchersJson: true },
  });

  if (!carrier) {
    return res.status(404).json({ error: "CARRIER_NOT_FOUND" });
  }

  // Ensure dispatchersJson is up to date if empty but mappings exist.
  if (!carrier.dispatchersJson) {
    await syncCarrierDispatchersJson(carrier.id);
  }

  const updatedCarrier = carrier.dispatchersJson
    ? carrier
    : await prisma.carrier.findUnique({
        where: { id: carrierId },
        select: { id: true, dispatchersJson: true },
      });

  const dispatchers = parseCarrierDispatchersJson(updatedCarrier?.dispatchersJson);

  withRequestLogging(req, res, { user, ventureId: null, officeId: null }, {
    endpoint: "carrier_dispatchers_list",
    page: null,
    pageSize: null,
    dateFrom: null,
    dateTo: null,
  });

  return res.status(200).json({ carrierId: carrier.id, dispatchers });
}

export default withUser(handler);
