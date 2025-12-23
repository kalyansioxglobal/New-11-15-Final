import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma";
import { rateLimit, rateLimitByEmail } from "../../../lib/rateLimit";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).end("Method Not Allowed");
    }

    if (!(await rateLimit(req, res, "verify-otp"))) return;

    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: "Email and code are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    // Normalize code: convert to string, trim, remove all whitespace
    const normalizedCode = String(code).trim().replace(/\s+/g, '');

    if (!(await rateLimitByEmail(res, normalizedEmail, "verify-otp-email", 60 * 60 * 1000, 25))) {
      return;
    }

    // Find valid OTP for this email
    console.log(`[VERIFY] Looking for OTP: email=${normalizedEmail}, code=${normalizedCode.substring(0,2)}****, now=${new Date().toISOString()}`);
    
    const allOtps = await prisma.emailOtp.findMany({
      where: { email: normalizedEmail },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    console.log(`[VERIFY] Found ${allOtps.length} OTPs for ${normalizedEmail}:`, allOtps.map(o => ({ 
      id: o.id, 
      code: o.code.substring(0,2) + "****", 
      used: o.used, 
      expiresAt: o.expiresAt.toISOString(),
      isExpired: o.expiresAt < new Date()
    })));
    
    // Add debug logging to see exact comparison
    console.log(`[VERIFY] Normalized code: "${normalizedCode}" (length: ${normalizedCode.length}, type: ${typeof normalizedCode})`);
    
    const validOtp = await prisma.emailOtp.findFirst({
      where: { 
        email: normalizedEmail,
        code: normalizedCode,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
    
    // Debug: Log what was found
    if (validOtp) {
      console.log(`[VERIFY] Found valid OTP: code="${validOtp.code}" (length: ${validOtp.code.length})`);
    } else {
      // Check if OTP exists but is expired or used
      const anyOtp = await prisma.emailOtp.findFirst({
        where: { 
          email: normalizedEmail,
          code: normalizedCode,
        },
        orderBy: { createdAt: "desc" },
      });
      if (anyOtp) {
        console.log(`[VERIFY] OTP found but invalid: used=${anyOtp.used}, expired=${anyOtp.expiresAt < new Date()}, expiresAt=${anyOtp.expiresAt.toISOString()}, now=${new Date().toISOString()}`);
      }
    }

    if (!validOtp) {
      console.log(`[VERIFY] Failed: No valid OTP found for ${normalizedEmail}. Code provided: ${normalizedCode.substring(0,2)}****`);
      return res.status(401).json({ error: "Invalid or expired code. Please try again." });
    }
    
    // Mark OTP as used
    await prisma.emailOtp.update({
      where: { id: validOtp.id },
      data: { used: true },
    });
    
    console.log(`[VERIFY] OTP verified for ${normalizedEmail}`);

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, fullName: true, role: true },
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    console.log(`[VERIFY] Success for ${normalizedEmail}`);

    return res.status(200).json({
      success: true,
      user: {
        id: String(user.id),
        email: user.email,
        name: user.fullName,
        role: user.role,
      },
    });
  } catch (err: any) {
    console.error("Error in verify-otp:", err?.message || err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
