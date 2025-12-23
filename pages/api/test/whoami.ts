import type { NextApiRequest, NextApiResponse } from "next";
import { getEffectiveUser } from "@/lib/effectiveUser";
import prisma from "@/lib/prisma";

const isTestBypassEnabled = () => {
  return (
    process.env.TEST_AUTH_BYPASS === "true" &&
    process.env.NODE_ENV !== "production"
  );
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!isTestBypassEnabled()) {
    return res.status(404).json({ error: "Not found" });
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await getEffectiveUser(req, res);

  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const ventures = await prisma.venture.findMany({
    where: { id: { in: user.ventureIds } },
    select: { id: true, name: true, code: true, type: true },
  });

  const requestedVentureId = req.query.ventureId
    ? Number(req.query.ventureId)
    : null;

  let effectiveVenture = null;
  if (requestedVentureId && user.ventureIds.includes(requestedVentureId)) {
    effectiveVenture = ventures.find((v) => v.id === requestedVentureId) || null;
  } else if (ventures.length === 1) {
    effectiveVenture = ventures[0];
  }

  return res.status(200).json({
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    isTestUser: user.isTestUser,
    ventureIds: user.ventureIds,
    officeIds: user.officeIds,
    ventures,
    effectiveVenture,
    requestedVentureId,
  });
}
