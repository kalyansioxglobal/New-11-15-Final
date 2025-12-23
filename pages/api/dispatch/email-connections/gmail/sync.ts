import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/apiAuth";
import prisma from "@/lib/prisma";
import { google } from "googleapis";
import { sendNewMessageNotification } from "@/lib/dispatch-notifications";

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 
    `https://${process.env.REPLIT_DEV_DOMAIN}/api/dispatch/email-connections/gmail/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials not configured");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

async function refreshTokenIfNeeded(connection: {
  id: number;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
}) {
  if (!connection.tokenExpiresAt || !connection.refreshToken) {
    return connection.accessToken;
  }

  const expiresAt = new Date(connection.tokenExpiresAt);
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (expiresAt > fiveMinutesFromNow) {
    return connection.accessToken;
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken,
  });

  const { credentials } = await oauth2Client.refreshAccessToken();
  
  await prisma.emailProviderConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: credentials.access_token!,
      tokenExpiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
    },
  });

  return credentials.access_token!;
}

function extractEmail(emailString: string): string {
  const match = emailString.match(/<([^>]+)>/);
  if (match) return match[1].toLowerCase();
  return emailString.trim().toLowerCase();
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}

function getEmailBody(payload: any): string {
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        return decodeBase64Url(part.body.data).replace(/<[^>]+>/g, "");
      }
    }
    for (const part of payload.parts) {
      if (part.parts) {
        const body = getEmailBody(part);
        if (body) return body;
      }
    }
  }

  return "";
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

  const { connectionId } = req.body;

  if (!connectionId) {
    return res.status(400).json({ error: "connectionId is required" });
  }

  try {
    const connection = await prisma.emailProviderConnection.findFirst({
      where: {
        id: parseInt(connectionId),
        userId: user.id,
        status: "ACTIVE",
        provider: "GMAIL",
      },
    });

    if (!connection) {
      return res.status(404).json({ error: "Connection not found or you don't have access" });
    }

    const accessToken = await refreshTokenIfNeeded(connection);
    
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const carrierEmails = await prisma.carrier.findMany({
      where: { email: { not: null } },
      select: { email: true },
    });
    const carrierEmailSet = new Set(
      carrierEmails.map((c) => c.email?.toLowerCase()).filter(Boolean)
    );

    if (carrierEmailSet.size === 0) {
      return res.status(200).json({
        success: true,
        syncedCount: 0,
        newConversations: 0,
        messagesChecked: 0,
        message: "No carriers with email addresses found",
      });
    }

    const timeFilter = connection.lastSyncAt 
      ? `after:${Math.floor(connection.lastSyncAt.getTime() / 1000)}`
      : "newer_than:7d";

    const listResponse = await gmail.users.messages.list({
      userId: "me",
      q: `${timeFilter} in:inbox`,
      maxResults: 100,
    });

    const messages = listResponse.data.messages || [];
    let syncedCount = 0;
    let newConversations = 0;
    let skippedCount = 0;

    for (const msg of messages) {
      const existingMessage = await prisma.dispatchMessage.findFirst({
        where: { externalId: msg.id },
      });

      if (existingMessage) continue;

      const fullMessage = await gmail.users.messages.get({
        userId: "me",
        id: msg.id!,
        format: "full",
      });

      const headers = fullMessage.data.payload?.headers || [];
      const from = headers.find((h) => h.name?.toLowerCase() === "from")?.value || "";
      const to = headers.find((h) => h.name?.toLowerCase() === "to")?.value || "";
      const subject = headers.find((h) => h.name?.toLowerCase() === "subject")?.value || "";
      const date = headers.find((h) => h.name?.toLowerCase() === "date")?.value;
      const messageId = headers.find((h) => h.name?.toLowerCase() === "message-id")?.value;

      const fromEmail = extractEmail(from);
      const toEmails = to.split(",").map((e) => extractEmail(e.trim()));
      const body = getEmailBody(fullMessage.data.payload);

      const connectionEmail = connection.emailAddress.toLowerCase();
      const isInbound = toEmails.some((e) => e === connectionEmail);
      const externalAddress = isInbound ? fromEmail : toEmails.find((e) => e !== connectionEmail) || toEmails[0];

      if (!carrierEmailSet.has(externalAddress.toLowerCase())) {
        skippedCount++;
        continue;
      }

      const carrier = await prisma.carrier.findFirst({
        where: {
          email: { equals: externalAddress, mode: "insensitive" },
        },
      });

      let conversation = await prisma.dispatchConversation.findFirst({
        where: {
          ventureId: connection.ventureId,
          channel: "EMAIL",
          externalAddress: { equals: externalAddress, mode: "insensitive" },
          status: { not: "ARCHIVED" },
        },
        orderBy: { lastMessageAt: "desc" },
      });

      if (!conversation) {
        conversation = await prisma.dispatchConversation.create({
          data: {
            ventureId: connection.ventureId,
            channel: "EMAIL",
            subject,
            status: "OPEN",
            participantType: "CARRIER",
            participantId: carrier?.id,
            carrierId: carrier?.id,
            externalAddress,
            lastMessageAt: date ? new Date(date) : new Date(),
            unreadCount: isInbound ? 1 : 0,
          },
        });
        newConversations++;
      }

      await prisma.dispatchMessage.create({
        data: {
          conversationId: conversation.id,
          direction: isInbound ? "INBOUND" : "OUTBOUND",
          channel: "EMAIL",
          fromAddress: fromEmail,
          toAddress: toEmails.join(", "),
          subject,
          body: body.substring(0, 65000),
          status: "DELIVERED",
          externalId: msg.id,
          sentAt: date ? new Date(date) : new Date(),
          deliveredAt: date ? new Date(date) : new Date(),
          metadata: {
            gmailId: msg.id,
            messageId,
            threadId: fullMessage.data.threadId,
            labelIds: fullMessage.data.labelIds,
          },
        },
      });

      if (isInbound) {
        await prisma.dispatchConversation.update({
          where: { id: conversation.id },
          data: {
            lastMessageAt: date ? new Date(date) : new Date(),
            unreadCount: { increment: 1 },
            subject: subject || conversation.subject,
          },
        });

        sendNewMessageNotification(connection.ventureId, {
          type: "NEW_MESSAGE",
          conversationId: conversation.id,
          message: body.substring(0, 100),
          fromAddress: fromEmail,
          channel: "EMAIL",
        });
      }

      syncedCount++;
    }

    await prisma.emailProviderConnection.update({
      where: { id: connection.id },
      data: { lastSyncAt: new Date() },
    });

    return res.status(200).json({
      success: true,
      syncedCount,
      newConversations,
      messagesChecked: messages.length,
      skippedNonCarrier: skippedCount,
    });
  } catch (error: any) {
    console.error("[GMAIL SYNC] Error:", error);

    if (error.code === 401 || error.message?.includes("invalid_grant")) {
      await prisma.emailProviderConnection.update({
        where: { id: parseInt(connectionId) },
        data: { status: "EXPIRED" },
      });
      return res.status(401).json({ error: "Gmail connection expired. Please reconnect." });
    }

    return res.status(500).json({ error: "Failed to sync Gmail messages" });
  }
}
