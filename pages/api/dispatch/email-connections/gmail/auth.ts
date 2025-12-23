import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/apiAuth";
import { google } from "googleapis";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
];

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

  const user = await requireUser(req, res);
  if (!user) return;

  const { ventureId } = req.query;

  if (!ventureId) {
    return res.status(400).json({ error: "ventureId is required" });
  }

  try {
    const oauth2Client = getOAuth2Client();

    const state = Buffer.from(JSON.stringify({
      userId: user.id,
      ventureId: parseInt(ventureId as string),
    })).toString("base64");

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      state,
      prompt: "consent",
    });

    return res.redirect(authUrl);
  } catch (error) {
    console.error("[GMAIL AUTH] Error:", error);
    return res.status(500).json({ error: "Failed to initiate Gmail OAuth" });
  }
}
