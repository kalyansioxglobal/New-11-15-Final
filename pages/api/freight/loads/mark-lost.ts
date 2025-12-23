import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";
import { can } from "@/lib/permissions";
import { logLoadEvent } from "@/lib/freight/events";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const { id, loadId: legacyLoadId, lostReasonId, note } = req.body;
    const parsedId = Number(id ?? legacyLoadId);

    if (!parsedId || isNaN(parsedId)) {
      return res.status(400).json({ error: "Invalid load id" });
    }

    const load = await prisma.load.findUnique({
      where: { id: parsedId },
      select: { id: true, ventureId: true, loadStatus: true },
    });

    if (!load) {
      return res.status(404).json({ error: "Load not found" });
    }

    if (!can(user, "edit", "TASK", { ventureId: load.ventureId })) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    if (lostReasonId) {
      const reason = await prisma.lostLoadReason.findUnique({
        where: { id: Number(lostReasonId) },
      });
      if (!reason) {
        return res.status(400).json({ error: "Invalid lostReasonId" });
      }
    }

    const updated = await prisma.load.update({
      where: { id: parsedId },
      data: {
        loadStatus: "LOST",
        lostAt: new Date(),
        lostReasonId: lostReasonId ? Number(lostReasonId) : null,
      },
      include: {
        venture: { select: { id: true, name: true } },
        shipper: { select: { id: true, name: true } },
        carrier: { select: { id: true, name: true } },
        lostReasonRef: { select: { id: true, name: true, category: true } },
      },
    });

    await logLoadEvent({
      loadId: parsedId,
      userId: user.id,
      eventType: "LOST_CONFIRMED",
      message: note || (updated.lostReasonRef
        ? `Marked as lost - Reason: ${updated.lostReasonRef.name}`
        : "Marked as lost"),
    });

    return res.status(200).json({ load: updated });
  } catch (err: any) {
    console.error("mark-lost error:", err);
    return res.status(err.statusCode ?? 500).json({ error: err.message ?? "Internal server error" });
  }
}
