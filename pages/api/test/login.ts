import type { NextApiRequest, NextApiResponse } from "next";
import { encode } from "next-auth/jwt";
import { serialize } from "cookie";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

const isTestBypassEnabled = () => {
  return (
    process.env.TEST_AUTH_BYPASS === "true" &&
    process.env.NODE_ENV !== "production"
  );
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!isTestBypassEnabled()) {
    logger.warn("test_auth_bypass_blocked", {
      domain: "auth",
      reason: "TEST_AUTH_BYPASS not enabled or in production",
      nodeEnv: process.env.NODE_ENV,
    });
    return res.status(404).json({ error: "Not found" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email } = req.body;

  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email required" });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      ventures: {
        select: { ventureId: true },
      },
    },
  });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    logger.error("test_auth_missing_secret", { domain: "auth" });
    return res.status(500).json({ error: "Server configuration error" });
  }

  const token = await encode({
    token: {
      id: String(user.id),
      email: user.email,
      name: user.fullName,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      ventureIds: user.ventures.map((v) => v.ventureId),
    },
    secret,
    maxAge: 24 * 60 * 60,
  });

  const cookieName =
    process.env.NODE_ENV === "production"
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

  const cookie = serialize(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 24 * 60 * 60,
  });

  res.setHeader("Set-Cookie", cookie);

  logger.info("test_auth_bypass_login", {
    domain: "auth",
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return res.status(200).json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    },
  });
}
