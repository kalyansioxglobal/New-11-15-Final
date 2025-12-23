import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { google } from "googleapis";

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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { code, state, error: oauthError } = req.query;

  if (oauthError) {
    return res.redirect("/dispatch/settings?error=oauth_denied");
  }

  if (!code || !state) {
    return res.redirect("/dispatch/settings?error=invalid_callback");
  }

  try {
    const stateData = JSON.parse(Buffer.from(state as string, "base64").toString());
    const { userId, ventureId } = stateData;

    if (!userId || !ventureId) {
      return res.redirect("/dispatch/settings?error=invalid_state");
    }

    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code as string);

    if (!tokens.access_token) {
      return res.redirect("/dispatch/settings?error=no_token");
    }

    oauth2Client.setCredentials(tokens);

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: "me" });
    const emailAddress = profile.data.emailAddress;

    if (!emailAddress) {
      return res.redirect("/dispatch/settings?error=no_email");
    }

    await prisma.emailProviderConnection.upsert({
      where: {
        userId_emailAddress: {
          userId,
          emailAddress,
        },
      },
      update: {
        ventureId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        status: "ACTIVE",
        updatedAt: new Date(),
      },
      create: {
        userId,
        ventureId,
        provider: "GMAIL",
        emailAddress,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        status: "ACTIVE",
      },
    });

    return res.redirect(`/dispatch/settings?success=gmail_connected&email=${encodeURIComponent(emailAddress)}`);
  } catch (error) {
    console.error("[GMAIL CALLBACK] Error:", error);
    return res.redirect("/dispatch/settings?error=oauth_failed");
  }
}
