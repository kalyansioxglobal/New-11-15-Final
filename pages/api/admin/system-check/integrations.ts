import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getEffectiveUser } from "@/lib/effectiveUser";

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
    const ventureConfigs = await prisma.ventureOutboundConfig.findMany({
      include: { venture: { select: { id: true, name: true } } },
    });

    const outboundByVenture = ventureConfigs.reduce((acc, cfg) => {
      const key = cfg.venture.name;
      if (!acc[key]) acc[key] = { ventureId: cfg.ventureId, channels: [] };
      if (cfg.emailProvider && cfg.emailProvider !== "none") {
        acc[key].channels.push({
          channel: "email",
          provider: cfg.emailProvider,
          hasFromAddress: !!cfg.sendgridFromEmail,
          hasApiKeyEnv: !!cfg.sendgridApiKeyEnv,
        });
      }
      if (cfg.smsProvider && cfg.smsProvider !== "none") {
        acc[key].channels.push({
          channel: "sms",
          provider: cfg.smsProvider,
          hasFromAddress: !!cfg.twilioFromNumber,
          hasApiKeyEnv: !!(cfg.twilioAccountSidEnv && cfg.twilioAuthTokenEnv),
        });
      }
      return acc;
    }, {} as Record<string, { ventureId: number; channels: { channel: string; provider: string; hasFromAddress: boolean; hasApiKeyEnv: boolean }[] }>);

    const fmcsaConfig = {
      bulkImportScript: "npm run fmcsa:import <csv_file>",
      autoSyncScript: "npm run fmcsa:autosync",
      apiEndpoint: "https://mobile.fmcsa.dot.gov/qc/services/carriers",
      configured: true,
    };

    const aiGateway = {
      openaiKeyPresent: !!(process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY),
      guardrailsEnabled: true,
      dailyLimitConfigured: !!process.env.AI_MAX_DAILY_CALLS,
    };

    const webhookEndpoints = [
      { path: "/api/webhooks/twilio/inbound", purpose: "SMS replies", signatureValidation: true },
      { path: "/api/webhooks/sendgrid/inbound", purpose: "Email replies", signatureValidation: false },
    ];

    const lastInboundReply = await prisma.outreachReply.findFirst({
      where: { direction: "inbound" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    return res.status(200).json({
      fmcsa: fmcsaConfig,
      outboundConfigByVenture: outboundByVenture,
      aiGateway,
      webhooks: {
        endpoints: webhookEndpoints,
        lastInboundReplyAt: lastInboundReply?.createdAt || null,
      },
      thirdParty: {
        sendgrid: { configured: !!process.env.SENDGRID_API_KEY },
        twilio: { configured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) },
      },
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Integrations check error:", error);
    return res.status(500).json({ error: "Integrations check failed", detail: errMsg });
  }
}
