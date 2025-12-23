import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

function logInboundEvent(event: {
  action: string;
  channel: string;
  conversationId?: number;
  replyId?: number;
  carrierId?: number;
  loadId?: number | null;
  ventureId?: number;
  status: string;
  metadata?: Record<string, unknown>;
}) {
  logger.info("inbound_outreach_event", {
    domain: "freight",
    ...event,
  });
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  return digits;
}

export interface InboundSmsPayload {
  from: string;
  to: string;
  body: string;
  messageSid: string;
  rawPayload: Record<string, any>;
}

export interface InboundEmailPayload {
  from: string;
  to: string;
  subject: string;
  body: string;
  rawPayload: Record<string, any>;
}

export async function handleInboundSms(payload: InboundSmsPayload) {
  const { from, to, body, messageSid, rawPayload } = payload;
  
  const normalizedTo = normalizePhone(to);
  const normalizedFrom = normalizePhone(from);

  const ventureConfig = await prisma.ventureOutboundConfig.findFirst({
    where: {
      twilioFromNumber: { contains: normalizedTo },
      isEnabled: true,
    },
    include: { venture: true },
  });

  if (!ventureConfig) {
    console.warn(`[INBOUND SMS] No venture config found for To number: ${to}`);
    return await storeUnmatchedSms(payload, "NO_VENTURE_MATCH");
  }

  const carrier = await prisma.carrier.findFirst({
    where: {
      OR: [
        { phone: { contains: normalizedFrom } },
        { phone: from },
      ],
    },
  });

  if (!carrier) {
    console.warn(`[INBOUND SMS] No carrier found for From number: ${from}`);
    return await storeUnmatchedSms(payload, "NO_CARRIER_MATCH");
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentRecipient = await prisma.outreachRecipient.findFirst({
    where: {
      carrierId: carrier.id,
      toPhone: { not: null },
      createdAt: { gte: sevenDaysAgo },
      message: {
        ventureId: ventureConfig.ventureId,
        channel: "sms",
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      message: { select: { id: true, loadId: true } },
    },
  });

  if (!recentRecipient) {
    console.warn(`[INBOUND SMS] No recent outreach found for carrier ${carrier.id} - quarantining`);
    return await storeUnmatchedSms(payload, "NO_RECENT_OUTREACH");
  }

  const loadId = recentRecipient.message.loadId || null;

  const conversation = await findOrCreateConversation({
    ventureId: ventureConfig.ventureId,
    loadId,
    carrierId: carrier.id,
    channel: "sms",
  });

  const existingReply = await prisma.outreachReply.findFirst({
    where: {
      conversationId: conversation.id,
      rawPayload: { path: ["messageSid"], equals: messageSid },
    },
  });

  if (existingReply) {
    logger.info("sms_reply_duplicate", { domain: "freight", messageSid, replyId: existingReply.id });
    return { success: true, replyId: existingReply.id, conversationId: conversation.id, duplicate: true };
  }

  const reply = await prisma.outreachReply.create({
    data: {
      conversationId: conversation.id,
      direction: "INBOUND",
      body,
      rawPayload: { ...rawPayload, messageSid },
    },
  });

  await prisma.outreachConversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date() },
  });

  if (loadId) {
    await updateAttributionOnFirstReply({
      ventureId: ventureConfig.ventureId,
      loadId,
      carrierId: carrier.id,
      channel: "sms",
      messageId: recentRecipient?.message.id || null,
    });
  }

  logInboundEvent({
    action: "INBOUND_REPLY",
    channel: "sms",
    conversationId: conversation.id,
    replyId: reply.id,
    carrierId: carrier.id,
    loadId,
    ventureId: ventureConfig.ventureId,
    status: "SUCCESS",
  });

  console.log(`[INBOUND SMS] Stored reply ${reply.id} for conversation ${conversation.id}`);
  return { success: true, replyId: reply.id, conversationId: conversation.id };
}

export async function handleInboundEmail(payload: InboundEmailPayload) {
  const { from, to, subject, body, rawPayload } = payload;

  const fromEmail = extractEmail(from);
  const toEmail = extractEmail(to);

  const ventureConfig = await prisma.ventureOutboundConfig.findFirst({
    where: {
      OR: [
        { sendgridFromEmail: { equals: toEmail, mode: "insensitive" } },
        { sendgridFromEmail: { contains: toEmail.split("@")[0], mode: "insensitive" } },
      ],
      isEnabled: true,
    },
    include: { venture: true },
  });

  if (!ventureConfig) {
    console.warn(`[INBOUND EMAIL] No venture config found for To email: ${to}`);
    return await storeUnmatchedEmail(payload, "NO_VENTURE_MATCH");
  }

  const carrier = await prisma.carrier.findFirst({
    where: {
      email: { equals: fromEmail, mode: "insensitive" },
    },
  });

  if (!carrier) {
    console.warn(`[INBOUND EMAIL] No carrier found for From email: ${from}`);
    return await storeUnmatchedEmail(payload, "NO_CARRIER_MATCH");
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentRecipient = await prisma.outreachRecipient.findFirst({
    where: {
      carrierId: carrier.id,
      toEmail: { not: null },
      createdAt: { gte: sevenDaysAgo },
      message: {
        ventureId: ventureConfig.ventureId,
        channel: "email",
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      message: { select: { id: true, loadId: true } },
    },
  });

  if (!recentRecipient) {
    console.warn(`[INBOUND EMAIL] No recent outreach found for carrier ${carrier.id} - quarantining`);
    return await storeUnmatchedEmail(payload, "NO_RECENT_OUTREACH");
  }

  const loadId = recentRecipient.message.loadId || null;

  const conversation = await findOrCreateConversation({
    ventureId: ventureConfig.ventureId,
    loadId,
    carrierId: carrier.id,
    channel: "email",
  });

  const messageId = rawPayload?.["message-id"] || rawPayload?.headers?.["message-id"] || null;
  if (messageId) {
    const existingReply = await prisma.outreachReply.findFirst({
      where: {
        conversationId: conversation.id,
        rawPayload: { path: ["message-id"], equals: messageId },
      },
    });

    if (existingReply) {
      logger.info("email_reply_duplicate", { domain: "freight", messageId, replyId: existingReply.id });
      return { success: true, replyId: existingReply.id, conversationId: conversation.id, duplicate: true };
    }
  }

  const reply = await prisma.outreachReply.create({
    data: {
      conversationId: conversation.id,
      direction: "INBOUND",
      body: `${subject ? `Subject: ${subject}\n\n` : ""}${body}`,
      rawPayload: messageId ? { ...rawPayload, "message-id": messageId } : rawPayload,
    },
  });

  await prisma.outreachConversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date() },
  });

  if (loadId) {
    await updateAttributionOnFirstReply({
      ventureId: ventureConfig.ventureId,
      loadId,
      carrierId: carrier.id,
      channel: "email",
      messageId: recentRecipient.message.id || null,
    });
  }

  logInboundEvent({
    action: "INBOUND_REPLY",
    channel: "email",
    conversationId: conversation.id,
    replyId: reply.id,
    carrierId: carrier.id,
    loadId,
    ventureId: ventureConfig.ventureId,
    status: "SUCCESS",
  });

  console.log(`[INBOUND EMAIL] Stored reply ${reply.id} for conversation ${conversation.id}`);
  return { success: true, replyId: reply.id, conversationId: conversation.id };
}

async function findOrCreateConversation(params: {
  ventureId: number;
  loadId: number | null;
  carrierId: number;
  channel: string;
}) {
  const { ventureId, loadId, carrierId, channel } = params;

  const existing = await prisma.outreachConversation.findFirst({
    where: {
      ventureId,
      loadId,
      carrierId,
      channel,
    },
  });

  if (existing) {
    return existing;
  }

  return await prisma.outreachConversation.create({
    data: {
      ventureId,
      loadId,
      carrierId,
      channel,
      lastMessageAt: new Date(),
    },
  });
}

async function updateAttributionOnFirstReply(params: {
  ventureId: number;
  loadId: number;
  carrierId: number;
  channel: string;
  messageId: number | null;
}) {
  const { ventureId, loadId, carrierId, channel, messageId } = params;

  const existing = await prisma.outreachAttribution.findUnique({
    where: { loadId },
  });

  if (existing && existing.timeToFirstReplyMinutes !== null) {
    return;
  }

  const outreachMessage = messageId
    ? await prisma.outreachMessage.findUnique({ where: { id: messageId } })
    : await prisma.outreachMessage.findFirst({
        where: { loadId, ventureId, channel },
        orderBy: { createdAt: "asc" },
      });

  if (!outreachMessage) {
    return;
  }

  const minutesSinceOutreach = Math.floor(
    (Date.now() - outreachMessage.createdAt.getTime()) / (1000 * 60)
  );

  if (existing) {
    await prisma.outreachAttribution.update({
      where: { loadId },
      data: {
        timeToFirstReplyMinutes: minutesSinceOutreach,
        carrierId,
        channel,
        messageId: outreachMessage.id,
      },
    });
  } else {
    await prisma.outreachAttribution.create({
      data: {
        ventureId,
        loadId,
        carrierId,
        channel,
        messageId: outreachMessage.id,
        timeToFirstReplyMinutes: minutesSinceOutreach,
      },
    });
  }
}

async function storeUnmatchedSms(payload: InboundSmsPayload, reason: string) {
  console.log(`[INBOUND SMS] Storing unmatched message: ${reason}`, payload);
  
  try {
    const quarantine = await prisma.webhookQuarantine.create({
      data: {
        channel: "sms",
        reason,
        status: "PENDING",
        fromAddress: payload.from,
        toAddress: payload.to,
        body: payload.body,
        rawPayload: payload.rawPayload,
        externalId: payload.messageSid,
      },
    });
    logger.info("quarantine_stored", { domain: "freight", channel: "sms", reason, quarantineId: quarantine.id });
    return { success: false, reason, stored: true, quarantineId: quarantine.id };
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      logger.info("quarantine_duplicate", { domain: "freight", channel: "sms", externalId: payload.messageSid });
      return { success: false, reason: "DUPLICATE", stored: false };
    }
    logger.error("quarantine_store_error", { domain: "freight", channel: "sms", error: String(error) });
    throw error;
  }
}

async function storeUnmatchedEmail(payload: InboundEmailPayload, reason: string) {
  console.log(`[INBOUND EMAIL] Storing unmatched message: ${reason}`, payload);
  
  const messageId = payload.rawPayload?.["message-id"] || payload.rawPayload?.headers?.["message-id"] || null;
  
  try {
    const quarantine = await prisma.webhookQuarantine.create({
      data: {
        channel: "email",
        reason,
        status: "PENDING",
        fromAddress: payload.from,
        toAddress: payload.to,
        subject: payload.subject,
        body: payload.body,
        rawPayload: payload.rawPayload,
        externalId: messageId,
      },
    });
    logger.info("quarantine_stored", { domain: "freight", channel: "email", reason, quarantineId: quarantine.id });
    return { success: false, reason, stored: true, quarantineId: quarantine.id };
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      logger.info("quarantine_duplicate", { domain: "freight", channel: "email", externalId: messageId });
      return { success: false, reason: "DUPLICATE", stored: false };
    }
    logger.error("quarantine_store_error", { domain: "freight", channel: "email", error: String(error) });
    throw error;
  }
}

function extractEmail(emailString: string): string {
  const match = emailString.match(/<([^>]+)>/);
  if (match) return match[1].toLowerCase();
  return emailString.trim().toLowerCase();
}
