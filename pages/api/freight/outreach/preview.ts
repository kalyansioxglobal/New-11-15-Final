import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getEffectiveUser } from "@/lib/effectiveUser";
import { getVentureOutboundConfig, canSendEmail, canSendSms } from "@/lib/outreach/getVentureOutboundConfig";
import { selectCarriersForLoad } from "@/lib/outreach/selectCarriersForLoad";
import { generateEmailSubject, generateEmailBody, generateSmsBody } from "@/lib/outreach/generateDraft";
import { z } from "zod";

const PreviewSchema = z.object({
  loadId: z.number().positive(),
  channel: z.enum(["sms", "email"]),
  n: z.number().min(1).max(200).default(15),
  recipientCarrierIds: z.array(z.number()).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await getEffectiveUser(req, res);
  if (!user) return;

  const parsed = PreviewSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const { loadId, channel, n, recipientCarrierIds } = parsed.data;

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
        detail: "No outbound config found or disabled",
      });
    }

    if (channel === "email" && !canSendEmail(config)) {
      return res.status(400).json({
        error: "Email sending not configured for this venture",
      });
    }

    if (channel === "sms" && !canSendSms(config)) {
      return res.status(400).json({
        error: "SMS sending not configured for this venture",
      });
    }

    const carriers = await selectCarriersForLoad({
      loadId,
      channel,
      limit: n,
      specificCarrierIds: recipientCarrierIds,
    });

    const warnings: string[] = [];

    const validRecipients = carriers.filter((c) => {
      if (channel === "sms" && !c.phone) return false;
      if (channel === "email" && !c.email) return false;
      return true;
    });

    const skippedCount = carriers.length - validRecipients.length;
    if (skippedCount > 0) {
      warnings.push(`${skippedCount} carriers missing ${channel === "sms" ? "phone" : "email"}`);
    }

    const ventureName = load.venture?.name || "Our Company";

    const draftSubject = channel === "email" ? generateEmailSubject(load) : undefined;
    const draftBody =
      channel === "email"
        ? generateEmailBody(load, ventureName)
        : generateSmsBody(load, ventureName);

    const recipients = validRecipients.map((c) => ({
      carrierId: c.id,
      name: c.name,
      contact: channel === "sms" ? maskPhone(c.phone!) : maskEmail(c.email!),
      matchReasons: c.matchReasons,
    }));

    return res.status(200).json({
      ventureId: load.ventureId,
      ventureName,
      provider: channel === "email" ? "sendgrid" : "twilio",
      loadSummary: {
        id: load.id,
        reference: load.reference,
        pickupCity: load.pickupCity,
        pickupState: load.pickupState,
        dropCity: load.dropCity,
        dropState: load.dropState,
        pickupDate: load.pickupDate,
        equipmentType: load.equipmentType,
      },
      recipients,
      draftSubject,
      draftBody,
      warnings,
    });
  } catch (error: any) {
    console.error("Outreach preview error:", error);
    return res.status(500).json({ error: "Failed to generate preview", detail: error.message });
  }
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "****@****";
  const maskedLocal = local.length > 2 ? local[0] + "***" + local[local.length - 1] : "***";
  return `${maskedLocal}@${domain}`;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return "***-***-" + digits.slice(-4);
}
