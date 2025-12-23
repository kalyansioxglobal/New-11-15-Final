import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";
import { getUserScope } from "@/lib/scope";
import { v4 as uuidv4 } from "uuid";

function generateMessageId(domain: string): string {
  return `<${uuidv4()}@${domain}>`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  const scope = getUserScope(user);

  try {
    const { conversationId, body, subject } = req.body;

    if (!conversationId || !body) {
      return res.status(400).json({ error: "conversationId and body are required" });
    }

    const conversation = await prisma.dispatchConversation.findUnique({
      where: { id: parseInt(conversationId) },
      include: {
        driver: { select: { phone: true, email: true } },
        carrier: { select: { phone: true, email: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { emailMessageId: true, emailReferences: true },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    if (!scope.allVentures && !scope.ventureIds.includes(conversation.ventureId)) {
      return res.status(403).json({ error: "Forbidden: no access to this conversation" });
    }

    if (conversation.assignmentStatus === "CLAIMED" && conversation.assignedDispatcherId !== user.id) {
      return res.status(409).json({ 
        error: "This conversation is claimed by another dispatcher. You cannot send messages.",
        claimedBy: conversation.assignedDispatcherId,
      });
    }

    const toAddress = conversation.externalAddress;
    const fromAddress = conversation.channel === "SMS" 
      ? process.env.TWILIO_PHONE_NUMBER || "" 
      : process.env.SENDGRID_FROM_EMAIL || "";

    const emailDomain = fromAddress.split("@")[1] || "dispatch.app";
    const emailMessageId = conversation.channel === "EMAIL" ? generateMessageId(emailDomain) : null;
    
    const lastMessage = conversation.messages[0];
    const inReplyToId = lastMessage?.emailMessageId || null;
    const emailReferences = lastMessage?.emailReferences 
      ? `${lastMessage.emailReferences} ${inReplyToId || ""}`.trim()
      : inReplyToId || null;

    const message = await prisma.dispatchMessage.create({
      data: {
        conversationId: conversation.id,
        direction: "OUTBOUND",
        channel: conversation.channel,
        fromAddress,
        toAddress,
        subject: subject || null,
        body,
        status: "PENDING",
        handledById: user.id,
        emailMessageId,
        inReplyToId,
        emailReferences,
      },
    });

    await prisma.dispatchConversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    if (conversation.channel === "SMS" && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        const twilio = require("twilio");
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

        const twilioMessage = await client.messages.create({
          body,
          from: fromAddress,
          to: toAddress,
        });

        await prisma.dispatchMessage.update({
          where: { id: message.id },
          data: {
            status: "SENT",
            externalId: twilioMessage.sid,
            sentAt: new Date(),
          },
        });
      } catch (smsError) {
        console.error("[SEND MESSAGE] SMS error:", smsError);
        await prisma.dispatchMessage.update({
          where: { id: message.id },
          data: { status: "FAILED" },
        });
      }
    } else if (conversation.channel === "EMAIL" && process.env.SENDGRID_API_KEY) {
      try {
        const sgMail = require("@sendgrid/mail");
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);

        const emailPayload: Record<string, unknown> = {
          to: toAddress,
          from: fromAddress,
          subject: subject || "Reply from Dispatch",
          text: body,
        };

        if (emailMessageId) {
          emailPayload.headers = {
            "Message-ID": emailMessageId,
            ...(inReplyToId && { "In-Reply-To": inReplyToId }),
            ...(emailReferences && { References: emailReferences }),
          };
        }

        await sgMail.send(emailPayload);

        await prisma.dispatchMessage.update({
          where: { id: message.id },
          data: { status: "SENT", sentAt: new Date() },
        });
      } catch (emailError) {
        console.error("[SEND MESSAGE] Email error:", emailError);
        await prisma.dispatchMessage.update({
          where: { id: message.id },
          data: { status: "FAILED" },
        });
      }
    } else {
      await prisma.dispatchMessage.update({
        where: { id: message.id },
        data: { status: "SENT", sentAt: new Date() },
      });
    }

    const updatedMessage = await prisma.dispatchMessage.findUnique({
      where: { id: message.id },
    });

    return res.status(201).json({ message: updatedMessage });
  } catch (error) {
    console.error("[SEND MESSAGE] Error:", error);
    return res.status(500).json({ error: "Failed to send message" });
  }
}
