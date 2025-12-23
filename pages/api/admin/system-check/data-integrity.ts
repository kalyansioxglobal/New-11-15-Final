import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getEffectiveUser } from "@/lib/effectiveUser";

interface IntegrityIssue {
  type: string;
  severity: "error" | "warning";
  description: string;
  count: number;
  sampleIds?: number[];
}

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
    const issues: IntegrityIssue[] = [];

    const loadsWithInvalidVenture = await prisma.$queryRaw<{ id: number }[]>`
      SELECT l.id FROM "Load" l
      LEFT JOIN "Venture" v ON l."ventureId" = v.id
      WHERE l."ventureId" IS NOT NULL AND v.id IS NULL
      LIMIT 10
    `;
    if (loadsWithInvalidVenture.length > 0) {
      issues.push({
        type: "orphan_load_venture",
        severity: "error",
        description: "Loads referencing non-existent ventures",
        count: loadsWithInvalidVenture.length,
        sampleIds: loadsWithInvalidVenture.map(r => r.id),
      });
    }

    const loadsWithInvalidCarrier = await prisma.$queryRaw<{ id: number }[]>`
      SELECT l.id FROM "Load" l
      LEFT JOIN "Carrier" c ON l."carrierId" = c.id
      WHERE l."carrierId" IS NOT NULL AND c.id IS NULL
      LIMIT 10
    `;
    if (loadsWithInvalidCarrier.length > 0) {
      issues.push({
        type: "orphan_load_carrier",
        severity: "error",
        description: "Loads referencing non-existent carriers",
        count: loadsWithInvalidCarrier.length,
        sampleIds: loadsWithInvalidCarrier.map(r => r.id),
      });
    }

    const usersWithInvalidVenture = await prisma.$queryRaw<{ id: number }[]>`
      SELECT u.id FROM "User" u
      LEFT JOIN "Venture" v ON u."ventureId" = v.id
      WHERE u."ventureId" IS NOT NULL AND v.id IS NULL
      LIMIT 10
    `;
    if (usersWithInvalidVenture.length > 0) {
      issues.push({
        type: "orphan_user_venture",
        severity: "error",
        description: "Users referencing non-existent ventures",
        count: usersWithInvalidVenture.length,
        sampleIds: usersWithInvalidVenture.map(r => r.id),
      });
    }

    const duplicateMcNumbers = await prisma.$queryRaw<{ mcNumber: string; cnt: number }[]>`
      SELECT "mcNumber", COUNT(*)::int as cnt FROM "Carrier"
      WHERE "mcNumber" IS NOT NULL AND "mcNumber" != ''
      GROUP BY "mcNumber"
      HAVING COUNT(*) > 1
      LIMIT 10
    `;
    if (duplicateMcNumbers.length > 0) {
      issues.push({
        type: "duplicate_mc_numbers",
        severity: "warning",
        description: "Duplicate MC numbers found",
        count: duplicateMcNumbers.length,
      });
    }

    const duplicateDotNumbers = await prisma.$queryRaw<{ dotNumber: string; cnt: number }[]>`
      SELECT "dotNumber", COUNT(*)::int as cnt FROM "Carrier"
      WHERE "dotNumber" IS NOT NULL AND "dotNumber" != ''
      GROUP BY "dotNumber"
      HAVING COUNT(*) > 1
      LIMIT 10
    `;
    if (duplicateDotNumbers.length > 0) {
      issues.push({
        type: "duplicate_dot_numbers",
        severity: "warning",
        description: "Duplicate DOT numbers found",
        count: duplicateDotNumbers.length,
      });
    }

    const crossVentureConversations = await prisma.$queryRaw<{ id: number }[]>`
      SELECT oc.id FROM "OutreachConversation" oc
      JOIN "Load" l ON oc."loadId" = l.id
      WHERE oc."ventureId" != l."ventureId"
      LIMIT 10
    `;
    if (crossVentureConversations.length > 0) {
      issues.push({
        type: "cross_venture_conversation",
        severity: "error",
        description: "Conversations with venture mismatch from load",
        count: crossVentureConversations.length,
        sampleIds: crossVentureConversations.map(r => r.id),
      });
    }

    const crossVentureMessages = await prisma.$queryRaw<{ id: number }[]>`
      SELECT om.id FROM "OutreachMessage" om
      JOIN "Load" l ON om."loadId" = l.id
      WHERE om."ventureId" != l."ventureId"
      LIMIT 10
    `;
    if (crossVentureMessages.length > 0) {
      issues.push({
        type: "cross_venture_message",
        severity: "error",
        description: "Outreach messages with venture mismatch from load",
        count: crossVentureMessages.length,
        sampleIds: crossVentureMessages.map(r => r.id),
      });
    }

    const errorCount = issues.filter(i => i.severity === "error").length;
    const warningCount = issues.filter(i => i.severity === "warning").length;

    return res.status(200).json({
      status: errorCount === 0 ? "healthy" : "issues_found",
      summary: {
        errors: errorCount,
        warnings: warningCount,
        totalChecks: 7,
      },
      issues,
      checkedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Data integrity check error:", error);
    return res.status(500).json({ error: "Data integrity check failed", detail: errMsg });
  }
}
