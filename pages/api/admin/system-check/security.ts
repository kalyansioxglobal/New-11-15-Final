import type { NextApiRequest, NextApiResponse } from "next";
import { getEffectiveUser } from "@/lib/effectiveUser";
import { ROLE_CONFIG, RoleConfig } from "@/lib/permissions";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await getEffectiveUser(req, res);
  if (!user) return;

  if (!["CEO", "ADMIN", "SUPERADMIN"].includes(user.role)) {
    return res.status(403).json({ error: "Admin access required" });
  }

  try {
    const rolesSummary = Object.entries(ROLE_CONFIG).map(([role, config]) => ({
      role,
      ventureScope: config.ventureScope,
      canAccessAdminPanel: config.canAccessAdminPanel,
    }));

    const knownUnprotectedRoutes = [
      "/api/auth/[...nextauth]",
      "/api/webhooks/twilio/inbound",
      "/api/webhooks/sendgrid/inbound",
    ];

    const sessionConfig = {
      provider: "NextAuth.js v4",
      strategy: "database-session",
      cookieSecure: process.env.NODE_ENV === "production",
      sessionMaxAge: "30 days (default)",
    };

    const corsConfig = {
      status: "Next.js default",
      note: "API routes use same-origin by default",
    };

    const rateLimitConfig = {
      enabled: true,
      type: "database-backed",
      defaultLimit: "30 requests/min/IP/route",
      aiEndpointLimit: "10 requests/min/user",
      aiDailyLimit: process.env.AI_MAX_DAILY_CALLS || "100 calls/user/day",
    };

    const securityChecks = {
      secretsInEnv: {
        DATABASE_URL: !!process.env.DATABASE_URL,
        NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
        SENDGRID_API_KEY: !!process.env.SENDGRID_API_KEY,
        TWILIO_ACCOUNT_SID: !!process.env.TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN: !!process.env.TWILIO_AUTH_TOKEN,
        OPENAI_KEY: !!(process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY),
      },
      httpOnly: true,
      sameSite: "lax",
    };

    return res.status(200).json({
      rbac: {
        rolesConfigured: rolesSummary.length,
        roles: rolesSummary,
        denyByDefault: true,
      },
      unprotectedRoutes: {
        known: knownUnprotectedRoutes,
        note: "Webhooks use signature validation instead of session auth",
      },
      session: sessionConfig,
      cors: corsConfig,
      rateLimit: rateLimitConfig,
      securityChecks,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Security check error:", error);
    return res.status(500).json({ error: "Security check failed", detail: errMsg });
  }
}
