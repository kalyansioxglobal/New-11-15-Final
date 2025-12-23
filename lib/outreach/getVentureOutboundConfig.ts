import prisma from "@/lib/prisma";

export interface VentureOutboundConfigResolved {
  ventureId: number;
  emailProvider: "sendgrid" | "none";
  smsProvider: "twilio" | "none";
  sendgridApiKey: string | null;
  sendgridFromEmail: string | null;
  sendgridFromName: string | null;
  twilioAccountSid: string | null;
  twilioAuthToken: string | null;
  twilioFromNumber: string | null;
  isEnabled: boolean;
}

export async function getVentureOutboundConfig(
  ventureId: number
): Promise<VentureOutboundConfigResolved | null> {
  const config = await prisma.ventureOutboundConfig.findUnique({
    where: { ventureId },
  });

  if (!config || !config.isEnabled) {
    return null;
  }

  const resolved: VentureOutboundConfigResolved = {
    ventureId: config.ventureId,
    emailProvider: config.emailProvider as "sendgrid" | "none",
    smsProvider: config.smsProvider as "twilio" | "none",
    sendgridApiKey: config.sendgridApiKeyEnv
      ? process.env[config.sendgridApiKeyEnv] || null
      : null,
    sendgridFromEmail: config.sendgridFromEmail,
    sendgridFromName: config.sendgridFromName,
    twilioAccountSid: config.twilioAccountSidEnv
      ? process.env[config.twilioAccountSidEnv] || null
      : null,
    twilioAuthToken: config.twilioAuthTokenEnv
      ? process.env[config.twilioAuthTokenEnv] || null
      : null,
    twilioFromNumber: config.twilioFromNumber,
    isEnabled: config.isEnabled,
  };

  return resolved;
}

export function canSendEmail(config: VentureOutboundConfigResolved): boolean {
  return (
    config.emailProvider === "sendgrid" &&
    !!config.sendgridApiKey &&
    !!config.sendgridFromEmail
  );
}

export function canSendSms(config: VentureOutboundConfigResolved): boolean {
  return (
    config.smsProvider === "twilio" &&
    !!config.twilioAccountSid &&
    !!config.twilioAuthToken &&
    !!config.twilioFromNumber
  );
}
