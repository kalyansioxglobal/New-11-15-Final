import type { NextApiRequest, NextApiResponse } from "next";
import { serialize } from "cookie";
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
    return res.status(404).json({ error: "Not found" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cookieName =
    process.env.NODE_ENV === "production"
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

  const cookie = serialize(cookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  res.setHeader("Set-Cookie", cookie);

  logger.info("test_auth_bypass_logout", { domain: "auth" });

  return res.status(200).json({ ok: true });
}
