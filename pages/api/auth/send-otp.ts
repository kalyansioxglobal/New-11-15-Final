import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma";
import sgMail from "@sendgrid/mail";
import { rateLimit, rateLimitByEmail } from "../../../lib/rateLimit";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).end("Method Not Allowed");
    }

    if (!(await rateLimit(req, res, "send-otp"))) return;

    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!(await rateLimitByEmail(res, normalizedEmail, "send-otp-email", 60 * 60 * 1000, 25))) {
      return;
    }

    // Generate secure random 6-digit code (always exactly 6 digits)
    const code = Math.floor(100000 + Math.random() * 900000).toString().padStart(6, '0');

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete old OTPs and create new one
    try {
      console.log(`[OTP] Attempting to save OTP for ${normalizedEmail}`);
      
      const deleteResult = await prisma.emailOtp.deleteMany({
        where: { email: normalizedEmail },
      });
      console.log(`[OTP] Deleted ${deleteResult.count} old OTPs for ${normalizedEmail}`);

      const savedOtp = await prisma.emailOtp.create({
        data: {
          email: normalizedEmail,
          code,
          expiresAt,
        },
      });

      console.log(`[OTP] Successfully saved OTP ${savedOtp.id} for ${normalizedEmail}, code: ${code.substring(0,2)}****, expires: ${expiresAt.toISOString()}`);
    } catch (dbError: any) {
      console.error("[OTP] Database error:", dbError?.message || dbError);
      console.error("[OTP] Full error:", JSON.stringify(dbError, null, 2));
      return res.status(500).json({ 
        error: "Database error - please contact support",
        hint: dbError?.message?.includes("does not exist") ? "EmailOtp table missing" : undefined
      });
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`[DEV] OTP for ${normalizedEmail}: ${code}`);
    }

    const sendgridKey = process.env.SENDGRID_API_KEY;
    if (!sendgridKey) {
      console.log("[OTP] SENDGRID_API_KEY not set, code saved but email not sent");
      return res.status(200).json({ ok: true, devHint: "SENDGRID_API_KEY not set" });
    }

    sgMail.setApiKey(sendgridKey);

    const msg = {
      to: normalizedEmail,
      from: process.env.SENDGRID_FROM_EMAIL || "itsupport@sioxglobal.com",
      subject: "Your SIOX Command Center login code",
      html: `
        <p>Your one-time login code is:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p>
        <p>This code will expire in 10 minutes.</p>
        <p style="color: #666; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
      `,
    };

    await sgMail.send(msg);

    console.log(`[OTP] Code sent to ${normalizedEmail}`);

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error("Error in send-otp:", err?.message || err);
    return res.status(500).json({ error: "Failed to send code. Please try again." });
  }
}
