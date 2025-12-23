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
    const dbConnected = await prisma.$queryRaw`SELECT 1 as connected`;
    
    const [
      ventureCount,
      userCount,
      loadCount,
      carrierCount,
      hotelPropertyCount,
      outreachMessageCount,
      activityLogCount,
    ] = await Promise.all([
      prisma.venture.count(),
      prisma.user.count(),
      prisma.load.count(),
      prisma.carrier.count(),
      prisma.hotelProperty.count(),
      prisma.outreachMessage.count(),
      prisma.activityLog.count(),
    ]);

    const warnings: string[] = [];

    const ventureConfigs = await prisma.ventureOutboundConfig.findMany({
      select: { ventureId: true, emailProvider: true, smsProvider: true },
    });

    const venturesWithConfig = new Set(ventureConfigs.map(c => c.ventureId));
    const allVentures = await prisma.venture.findMany({ select: { id: true, name: true } });
    
    for (const v of allVentures) {
      if (!venturesWithConfig.has(v.id)) {
        warnings.push(`Venture "${v.name}" (ID: ${v.id}) has no outbound config`);
      }
    }

    if (!process.env.SENDGRID_API_KEY) {
      warnings.push("SENDGRID_API_KEY not configured");
    }
    if (!process.env.TWILIO_ACCOUNT_SID) {
      warnings.push("TWILIO_ACCOUNT_SID not configured");
    }
    if (!process.env.OPENAI_API_KEY && !process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
      warnings.push("OpenAI API key not configured");
    }

    return res.status(200).json({
      server: {
        environment: process.env.NODE_ENV || "development",
        timestamp: new Date().toISOString(),
        commitHash: process.env.COMMIT_SHA || "unknown",
      },
      database: {
        connected: Array.isArray(dbConnected) && dbConnected.length > 0,
        migrationStatus: "prisma-managed",
      },
      counts: {
        ventures: ventureCount,
        users: userCount,
        loads: loadCount,
        carriers: carrierCount,
        hotelProperties: hotelPropertyCount,
        outreachMessages: outreachMessageCount,
        activityLogs: activityLogCount,
      },
      scheduler: {
        status: "not-implemented",
        note: "FMCSA autosync uses scheduled deployment",
      },
      warnings,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("System check overview error:", error);
    return res.status(500).json({ error: "System check failed", detail: errMsg });
  }
}
