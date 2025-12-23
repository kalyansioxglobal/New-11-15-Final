import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getEffectiveUser } from "@/lib/effectiveUser";
import { getVentureOutboundConfig, canSendEmail, canSendSms } from "@/lib/outreach/getVentureOutboundConfig";
import { sendEmailBatch } from "@/lib/outreach/providers/sendgrid";
import { sendSmsBatch } from "@/lib/outreach/providers/twilio";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const ReplySchema = z.object({
  conversationId: z.number().positive(),
  body: z.string().min(1),
  confirm: z.literal(true),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await getEffectiveUser(req, res);
  if (!user) return;

  const parsed = ReplySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const { conversationId, body, confirm } = parsed.data;

  if (!confirm) {
    return res.status(400).json({ error: "Reply requires explicit confirmation" });
  }

  try {
    const conversation = await prisma.outreachConversation.findUnique({
      where: { id: conversationId },
      include: {
        carrier: { select: { id: true, name: true, email: true, phone: true } },
        venture: { select: { id: true, name: true } },
        load: { select: { id: true, reference: true } },
      },
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const userVentures = await prisma.ventureUser.findMany({
      where: { userId: user.id },
      select: { ventureId: true },
    });
    const userVentureIds = userVentures.map((v) => v.ventureId);
    if (!userVentureIds.includes(conversation.ventureId)) {
      return res.status(403).json({ error: "Access denied to this venture" });
    }

    const config = await getVentureOutboundConfig(conversation.ventureId);
    if (!config) {
      return res.status(400).json({ error: "Outbound not configured for this venture" });
    }

    const channel = conversation.channel;
    const carrier = conversation.carrier;

    if (channel === "email" && !canSendEmail(config)) {
      return res.status(400).json({ error: "Email not configured for this venture" });
    }
    if (channel === "sms" && !canSendSms(config)) {
      return res.status(400).json({ error: "SMS not configured for this venture" });
    }

    const isDryRun = process.env.OUTREACH_DRY_RUN === "true";
    let success = false;
    let error: string | null = null;

    if (!isDryRun) {
      if (channel === "email" && carrier.email) {
        const results = await sendEmailBatch({
          apiKey: config.sendgridApiKey!,
          fromEmail: config.sendgridFromEmail!,
          fromName: config.sendgridFromName || conversation.venture?.name || "Dispatch",
          subject: `Re: Load ${conversation.load?.reference || conversation.loadId}`,
          html: body,
          recipients: [{ email: carrier.email }],
        });
        success = results[0]?.success || false;
        error = results[0]?.error || null;
      } else if (channel === "sms" && carrier.phone) {
        const results = await sendSmsBatch({
          accountSid: config.twilioAccountSid!,
          authToken: config.twilioAuthToken!,
          fromNumber: config.twilioFromNumber!,
          body,
          recipients: [{ phone: carrier.phone }],
        });
        success = results[0]?.success || false;
        error = results[0]?.error || null;
      } else {
        return res.status(400).json({ error: `Carrier missing ${channel} contact` });
      }
    } else {
      success = true;
    }

    const reply = await prisma.outreachReply.create({
      data: {
        conversationId,
        direction: "OUTBOUND",
        body,
        rawPayload: { sentBy: user.id, dryRun: isDryRun, success, error },
      },
    });

    await prisma.outreachConversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    await logAuditEvent(req, user, {
      domain: "freight",
      action: "OUTREACH_REPLY",
      entityType: "outreachReply",
      entityId: reply.id,
      metadata: {
        conversationId,
        loadId: conversation.loadId,
        carrierId: carrier.id,
        channel,
        dryRun: isDryRun,
      },
    });

    return res.status(200).json({
      success,
      replyId: reply.id,
      dryRun: isDryRun,
      error,
    });
  } catch (err: any) {
    console.error("Reply send error:", err);
    return res.status(500).json({ error: "Failed to send reply", detail: err.message });
  }
}
