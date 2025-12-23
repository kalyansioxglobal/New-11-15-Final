import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getEffectiveUser } from "@/lib/effectiveUser";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";
import { awardPointsForEvent } from "@/lib/gamification/awardPoints";

const AwardSchema = z.object({
  conversationId: z.number().positive(),
  confirm: z.literal(true),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await getEffectiveUser(req, res);
  if (!user) return;

  const parsed = AwardSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const { conversationId, confirm } = parsed.data;

  if (!confirm) {
    return res.status(400).json({ error: "Award requires explicit confirmation" });
  }

  try {
    const conversation = await prisma.outreachConversation.findUnique({
      where: { id: conversationId },
      include: {
        carrier: { select: { id: true, name: true } },
        load: { select: { id: true, reference: true, loadStatus: true, carrierId: true } },
      },
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    if (!conversation.loadId || !conversation.load) {
      return res.status(400).json({ error: "No load associated with this conversation" });
    }

    const userVentures = await prisma.ventureUser.findMany({
      where: { userId: user.id },
      select: { ventureId: true },
    });
    const userVentureIds = userVentures.map((v) => v.ventureId);
    if (!userVentureIds.includes(conversation.ventureId)) {
      return res.status(403).json({ error: "Access denied to this venture" });
    }

    if (conversation.load.loadStatus === "COVERED") {
      return res.status(400).json({ error: "Load is already covered" });
    }

    if (conversation.load.carrierId) {
      return res.status(400).json({ error: "Load already has an assigned carrier" });
    }

    const updatedLoad = await prisma.load.update({
      where: { id: conversation.loadId },
      data: {
        carrierId: conversation.carrierId,
        loadStatus: "COVERED",
      },
    });

    const firstOutreach = await prisma.outreachMessage.findFirst({
      where: { loadId: conversation.loadId },
      orderBy: { createdAt: "asc" },
    });

    const timeToCoverageMinutes = firstOutreach
      ? Math.floor((Date.now() - firstOutreach.createdAt.getTime()) / (1000 * 60))
      : null;

    const existingAttribution = await prisma.outreachAttribution.findUnique({
      where: { loadId: conversation.loadId },
    });

    if (existingAttribution) {
      await prisma.outreachAttribution.update({
        where: { loadId: conversation.loadId },
        data: {
          carrierId: conversation.carrierId,
          timeToCoverageMinutes,
        },
      });
    } else {
      await prisma.outreachAttribution.create({
        data: {
          ventureId: conversation.ventureId,
          loadId: conversation.loadId,
          carrierId: conversation.carrierId,
          channel: conversation.channel,
          timeToCoverageMinutes,
        },
      });
    }

    await logAuditEvent(req, user, {
      domain: "freight",
      action: "OUTREACH_AWARD",
      entityType: "load",
      entityId: conversation.loadId,
      metadata: {
        conversationId,
        carrierId: conversation.carrierId,
        carrierName: conversation.carrier.name,
        timeToCoverageMinutes,
      },
    });

    // Award gamification points for successful outreach award
    awardPointsForEvent(user.id, conversation.ventureId, 'OUTREACH_AWARDED', {
      metadata: { loadId: conversation.loadId, carrierId: conversation.carrierId },
      idempotencyKey: `outreach-awarded-${conversation.loadId}`,
    }).catch(err => console.error('[gamification] Outreach award error:', err));

    return res.status(200).json({
      success: true,
      loadId: updatedLoad.id,
      carrierId: conversation.carrierId,
      carrierName: conversation.carrier.name,
      timeToCoverageMinutes,
    });
  } catch (err: any) {
    console.error("Award error:", err);
    return res.status(500).json({ error: "Failed to award carrier", detail: err.message });
  }
}
