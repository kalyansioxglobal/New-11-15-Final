import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import formidable from "formidable";
import { IncomingMessage } from "http";
import { sendNewMessageNotification } from "@/lib/dispatch-notifications";

export const config = {
  api: {
    bodyParser: false,
  },
};

function extractEmail(emailString: string): string {
  const match = emailString.match(/<([^>]+)>/);
  if (match) return match[1].toLowerCase();
  return emailString.trim().toLowerCase();
}

async function parseFormData(
  req: IncomingMessage
): Promise<{ fields: Record<string, string>; files: Record<string, any> }> {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: true });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      const normalizedFields: Record<string, string> = {};
      for (const key in fields) {
        const value = fields[key];
        normalizedFields[key] = Array.isArray(value) ? value[0] : (value as string);
      }
      resolve({ fields: normalizedFields, files });
    });
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { fields } = await parseFormData(req);

    const from = fields.from || fields.From || "";
    const to = fields.to || fields.To || "";
    const subject = fields.subject || fields.Subject || "";
    const text = fields.text || fields.Text || "";
    const html = fields.html || fields.Html || "";
    const envelope = fields.envelope ? JSON.parse(fields.envelope) : {};

    const fromEmail = extractEmail(from);
    const toEmail = extractEmail(to);

    const body = text || html?.replace(/<[^>]+>/g, "") || "";

    console.log(`[DISPATCH EMAIL] Received from ${fromEmail} to ${toEmail}: ${subject}`);

    const messageId = fields["message-id"] || fields.messageId;

    if (messageId) {
      const existingMessage = await prisma.dispatchMessage.findFirst({
        where: { externalId: messageId },
      });

      if (existingMessage) {
        console.log(`[DISPATCH EMAIL] Duplicate message ${messageId}`);
        return res.status(200).json({ success: true, duplicate: true });
      }
    }

    const driver = await prisma.dispatchDriver.findFirst({
      where: {
        email: { equals: fromEmail, mode: "insensitive" },
      },
    });

    const carrier = !driver
      ? await prisma.carrier.findFirst({
          where: {
            email: { equals: fromEmail, mode: "insensitive" },
          },
        })
      : null;

    let conversation = await prisma.dispatchConversation.findFirst({
      where: {
        channel: "EMAIL",
        externalAddress: { equals: fromEmail, mode: "insensitive" },
        status: { not: "ARCHIVED" },
      },
      orderBy: { lastMessageAt: "desc" },
    });

    if (!conversation) {
      let ventureId: number;
      let participantType: string;
      let participantId: number | undefined;
      let driverId: number | undefined;
      let carrierId: number | undefined;

      if (driver) {
        ventureId = driver.ventureId;
        participantType = "DRIVER";
        participantId = driver.id;
        driverId = driver.id;
      } else if (carrier) {
        const defaultVenture = await prisma.venture.findFirst({
          where: { type: "LOGISTICS", isActive: true, isTest: false },
        });
        ventureId = defaultVenture?.id || 1;
        participantType = "CARRIER";
        participantId = carrier.id;
        carrierId = carrier.id;
      } else {
        const defaultVenture = await prisma.venture.findFirst({
          where: { type: "LOGISTICS", isActive: true, isTest: false },
        });
        if (!defaultVenture) {
          console.warn("[DISPATCH EMAIL] No default venture found");
          return res.status(500).json({ error: "No default venture configured" });
        }
        ventureId = defaultVenture.id;
        participantType = "DRIVER";
      }

      conversation = await prisma.dispatchConversation.create({
        data: {
          ventureId,
          channel: "EMAIL",
          subject,
          status: "OPEN",
          participantType,
          participantId,
          driverId,
          carrierId,
          externalAddress: fromEmail,
          lastMessageAt: new Date(),
          unreadCount: 1,
        },
      });
      console.log(`[DISPATCH EMAIL] Created new conversation ${conversation.id}`);
    }

    const message = await prisma.dispatchMessage.create({
      data: {
        conversationId: conversation.id,
        direction: "INBOUND",
        channel: "EMAIL",
        fromAddress: fromEmail,
        toAddress: toEmail,
        subject,
        body: body.substring(0, 65000),
        status: "DELIVERED",
        externalId: messageId,
        sentAt: new Date(),
        deliveredAt: new Date(),
        metadata: {
          envelope,
          headers: fields.headers ? JSON.parse(fields.headers) : null,
          attachmentCount: fields.attachments ? parseInt(fields.attachments) : 0,
        },
      },
    });

    await prisma.dispatchConversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        unreadCount: { increment: 1 },
        subject: subject || conversation.subject,
      },
    });

    console.log(`[DISPATCH EMAIL] Stored message ${message.id} in conversation ${conversation.id}`);

    sendNewMessageNotification(conversation.ventureId, {
      type: "NEW_MESSAGE",
      conversationId: conversation.id,
      message: body.substring(0, 100),
      fromAddress: fromEmail,
      channel: "EMAIL",
    });

    return res.status(200).json({ success: true, messageId: message.id });
  } catch (error) {
    console.error("[DISPATCH EMAIL] Error processing webhook:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
