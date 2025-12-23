import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import twilio from "twilio";
import { sendNewMessageNotification } from "@/lib/dispatch-notifications";

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  return digits;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { From, To, Body, MessageSid, AccountSid } = req.body;

    if (!From || !Body) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const twilioSignature = req.headers["x-twilio-signature"] as string;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (authToken && twilioSignature) {
      const host = req.headers.host || "";
      const proto = req.headers["x-forwarded-proto"] || "https";
      const url = `${proto}://${host}${req.url}`;
      
      const isValid = twilio.validateRequest(authToken, twilioSignature, url, req.body);
      if (!isValid) {
        console.warn("[DISPATCH SMS] Invalid Twilio signature");
        return res.status(403).json({ error: "Invalid signature" });
      }
    }

    const normalizedFrom = normalizePhone(From);
    const normalizedTo = normalizePhone(To);

    console.log(`[DISPATCH SMS] Received from ${From} to ${To}: ${Body.substring(0, 50)}...`);

    const existingMessage = await prisma.dispatchMessage.findFirst({
      where: { externalId: MessageSid },
    });

    if (existingMessage) {
      console.log(`[DISPATCH SMS] Duplicate message ${MessageSid}`);
      return res.status(200).json({ success: true, duplicate: true });
    }

    const driver = await prisma.dispatchDriver.findFirst({
      where: {
        OR: [
          { phone: { contains: normalizedFrom } },
          { phone: From },
        ],
      },
    });

    let conversation = await prisma.dispatchConversation.findFirst({
      where: {
        channel: "SMS",
        externalAddress: { contains: normalizedFrom },
        status: { not: "ARCHIVED" },
      },
      orderBy: { lastMessageAt: "desc" },
    });

    if (!conversation && driver) {
      conversation = await prisma.dispatchConversation.create({
        data: {
          ventureId: driver.ventureId,
          channel: "SMS",
          status: "OPEN",
          participantType: "DRIVER",
          participantId: driver.id,
          driverId: driver.id,
          externalAddress: From,
          lastMessageAt: new Date(),
          unreadCount: 1,
        },
      });
      console.log(`[DISPATCH SMS] Created new conversation ${conversation.id} for driver ${driver.id}`);
    } else if (!conversation) {
      const defaultVenture = await prisma.venture.findFirst({
        where: { type: "LOGISTICS", isActive: true, isTest: false },
      });

      if (!defaultVenture) {
        console.warn("[DISPATCH SMS] No default venture found");
        return res.status(500).json({ error: "No default venture configured" });
      }

      conversation = await prisma.dispatchConversation.create({
        data: {
          ventureId: defaultVenture.id,
          channel: "SMS",
          status: "OPEN",
          participantType: "DRIVER",
          externalAddress: From,
          lastMessageAt: new Date(),
          unreadCount: 1,
        },
      });
      console.log(`[DISPATCH SMS] Created new conversation ${conversation.id} for unknown sender`);
    }

    const message = await prisma.dispatchMessage.create({
      data: {
        conversationId: conversation.id,
        direction: "INBOUND",
        channel: "SMS",
        fromAddress: From,
        toAddress: To,
        body: Body,
        status: "DELIVERED",
        externalId: MessageSid,
        sentAt: new Date(),
        deliveredAt: new Date(),
        metadata: {
          AccountSid,
          ...req.body,
        },
      },
    });

    await prisma.dispatchConversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        unreadCount: { increment: 1 },
      },
    });

    console.log(`[DISPATCH SMS] Stored message ${message.id} in conversation ${conversation.id}`);

    sendNewMessageNotification(conversation.ventureId, {
      type: "NEW_MESSAGE",
      conversationId: conversation.id,
      message: Body.substring(0, 100),
      fromAddress: From,
      channel: "SMS",
    });

    res.setHeader("Content-Type", "text/xml");
    return res.status(200).send("<Response></Response>");
  } catch (error) {
    console.error("[DISPATCH SMS] Error processing webhook:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
};
