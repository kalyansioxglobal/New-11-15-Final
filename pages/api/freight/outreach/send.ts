import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getEffectiveUser } from "@/lib/effectiveUser";
import { getVentureOutboundConfig, canSendEmail, canSendSms } from "@/lib/outreach/getVentureOutboundConfig";
import { selectCarriersForLoad } from "@/lib/outreach/selectCarriersForLoad";
import { sendEmailBatch } from "@/lib/outreach/providers/sendgrid";
import { sendSmsBatch } from "@/lib/outreach/providers/twilio";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";
import { awardPointsForEvent } from "@/lib/gamification/awardPoints";

const MAX_SMS_RECIPIENTS = 50;
const MAX_EMAIL_RECIPIENTS = 200;

const SendSchema = z.object({
  loadId: z.number().positive(),
  channel: z.enum(["sms", "email"]),
  subject: z.string().optional(),
  body: z.string().min(1),
  recipientCarrierIds: z.array(z.number()).min(1),
  confirm: z.literal(true),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await getEffectiveUser(req, res);
  if (!user) return;

  const parsed = SendSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const { loadId, channel, subject, body, recipientCarrierIds, confirm } = parsed.data;

  if (!confirm) {
    return res.status(400).json({ error: "Send requires explicit confirmation" });
  }

  if (channel === "sms" && recipientCarrierIds.length > MAX_SMS_RECIPIENTS) {
    return res.status(400).json({
      error: `Maximum ${MAX_SMS_RECIPIENTS} SMS recipients per send`,
    });
  }

  if (channel === "email" && recipientCarrierIds.length > MAX_EMAIL_RECIPIENTS) {
    return res.status(400).json({
      error: `Maximum ${MAX_EMAIL_RECIPIENTS} email recipients per send`,
    });
  }

  try {
    const load = await prisma.load.findUnique({
      where: { id: loadId },
      include: { venture: true },
    });

    if (!load) {
      return res.status(404).json({ error: "Load not found" });
    }

    if (!load.ventureId) {
      return res.status(400).json({ error: "Load has no venture assigned" });
    }

    const userVentures = await prisma.ventureUser.findMany({
      where: { userId: user.id },
      select: { ventureId: true }
    });
    const userVentureIds = userVentures.map(v => v.ventureId);
    if (!userVentureIds.includes(load.ventureId)) {
      return res.status(403).json({ error: "Access denied to this venture" });
    }

    const config = await getVentureOutboundConfig(load.ventureId);
    if (!config) {
      return res.status(400).json({
        error: "Outbound not configured for this venture",
      });
    }

    if (channel === "email" && !canSendEmail(config)) {
      return res.status(400).json({ error: "Email not configured for this venture" });
    }

    if (channel === "sms" && !canSendSms(config)) {
      return res.status(400).json({ error: "SMS not configured for this venture" });
    }

    const eligibleCarriers = await selectCarriersForLoad({
      loadId,
      channel,
      limit: channel === "email" ? MAX_EMAIL_RECIPIENTS : MAX_SMS_RECIPIENTS,
      specificCarrierIds: recipientCarrierIds,
    });

    const eligibleCarrierIds = new Set(eligibleCarriers.map(c => c.id));
    const invalidCarrierIds = recipientCarrierIds.filter(id => !eligibleCarrierIds.has(id));
    if (invalidCarrierIds.length > 0) {
      return res.status(400).json({
        error: `${invalidCarrierIds.length} carrier(s) are not eligible for outreach on this load`,
        invalidIds: invalidCarrierIds,
      });
    }

    const validCarriers = eligibleCarriers.filter((c) => {
      if (channel === "sms") return !!c.phone;
      return !!c.email;
    }).map(c => ({ id: c.id, name: c.name, email: c.email, phone: c.phone }));

    if (validCarriers.length === 0) {
      return res.status(400).json({ error: "No valid recipients found" });
    }

    const isDryRun = process.env.OUTREACH_DRY_RUN === "true";
    const provider = channel === "email" ? "sendgrid" : "twilio";
    const status = isDryRun ? "DRY_RUN" : "QUEUED";

    const message = await prisma.outreachMessage.create({
      data: {
        ventureId: load.ventureId,
        loadId,
        channel,
        subject: channel === "email" ? subject : null,
        body,
        createdById: user.id,
        status,
        provider,
      },
    });

    const recipientRecords = await Promise.all(
      validCarriers.map((c) =>
        prisma.outreachRecipient.create({
          data: {
            messageId: message.id,
            carrierId: c.id,
            toEmail: channel === "email" ? c.email : null,
            toPhone: channel === "sms" ? c.phone : null,
            status: "PENDING",
          },
        })
      )
    );

    if (isDryRun) {
      await prisma.outreachMessage.update({
        where: { id: message.id },
        data: { status: "DRY_RUN" },
      });

      await logAuditEvent(req, user, {
        domain: "freight",
        action: "OUTREACH_SEND_DRY_RUN",
        entityType: "outreachMessage",
        entityId: message.id,
        metadata: { loadId, channel, recipientCount: validCarriers.length },
      });

      return res.status(200).json({
        success: true,
        messageId: message.id,
        dryRun: true,
        recipientCount: validCarriers.length,
      });
    }

    let results: { id: number; success: boolean; error?: string }[] = [];

    if (channel === "email") {
      const emailResults = await sendEmailBatch({
        apiKey: config.sendgridApiKey!,
        fromEmail: config.sendgridFromEmail!,
        fromName: config.sendgridFromName || load.venture?.name || "Dispatch",
        subject: subject || "Load Available",
        html: body,
        recipients: validCarriers.map((c) => ({ email: c.email! })),
      });

      for (let i = 0; i < validCarriers.length; i++) {
        const result = emailResults[i];
        const recipient = recipientRecords[i];
        await prisma.outreachRecipient.update({
          where: { id: recipient.id },
          data: {
            status: result.success ? "SENT" : "FAILED",
            error: result.error || null,
          },
        });
        results.push({ id: recipient.id, success: result.success, error: result.error });
      }
    } else {
      const smsResults = await sendSmsBatch({
        accountSid: config.twilioAccountSid!,
        authToken: config.twilioAuthToken!,
        fromNumber: config.twilioFromNumber!,
        body,
        recipients: validCarriers.map((c) => ({ phone: c.phone! })),
      });

      for (let i = 0; i < validCarriers.length; i++) {
        const result = smsResults[i];
        const recipient = recipientRecords[i];
        await prisma.outreachRecipient.update({
          where: { id: recipient.id },
          data: {
            status: result.success ? "SENT" : "FAILED",
            error: result.error || null,
          },
        });
        results.push({ id: recipient.id, success: result.success, error: result.error });
      }
    }

    const sentCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    const finalStatus = failedCount === 0 ? "SENT" : sentCount === 0 ? "FAILED" : "PARTIAL";

    await prisma.outreachMessage.update({
      where: { id: message.id },
      data: { status: finalStatus },
    });

    await logAuditEvent(req, user, {
      domain: "freight",
      action: "OUTREACH_SEND",
      entityType: "outreachMessage",
      entityId: message.id,
      metadata: { loadId, channel, sentCount, failedCount },
    });

    // Award gamification points for successful outreach send
    if (sentCount > 0) {
      awardPointsForEvent(user.id, load.ventureId, 'CARRIER_OUTREACH_SENT', {
        metadata: { messageId: message.id, channel, sentCount },
        idempotencyKey: `outreach-sent-${message.id}`,
      }).catch(err => console.error('[gamification] Outreach send award error:', err));
    }

    return res.status(200).json({
      success: true,
      messageId: message.id,
      dryRun: false,
      sentCount,
      failedCount,
      recipientCount: validCarriers.length,
    });
  } catch (error: any) {
    console.error("Outreach send error:", error);
    return res.status(500).json({ error: "Failed to send outreach", detail: error.message });
  }
}
