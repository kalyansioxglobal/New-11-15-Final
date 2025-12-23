import type { NextApiRequest, NextApiResponse } from "next";
import { getEffectiveUser } from "@/lib/effectiveUser";
import { runAudit } from "@/lib/audit/runAudit";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await getEffectiveUser(req, res);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { ventureId, officeId, propertyId } = req.body || {};

  try {
    const run = await runAudit({
      initiatedByUserId: user.id,
      scopeVentureId: ventureId || undefined,
      scopeOfficeId: officeId || undefined,
      scopePropertyId: propertyId || undefined,
    });

    return res.status(200).json({
      id: run.id,
      startedAt: run.createdAt,
      finishedAt: run.finishedAt,
      overallScore: run.overallScore,
      issuesCount: run.issues.length,
    });
  } catch (e: unknown) {
    console.error("Audit run error", e);
    return res.status(500).json({ error: "Failed to run audit" });
  }
}
