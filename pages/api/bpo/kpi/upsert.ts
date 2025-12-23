// pages/api/bpo/kpi/upsert.ts
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { withUser } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import { upsertBpoKpiDaily } from "@/lib/kpiBpo";

export default withUser(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  user
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (
      !dbUser ||
      (!hasPermission(dbUser, "adminPanel", "admin") &&
        dbUser.role !== "VENTURE_HEAD")
    ) {
      return res.status(403).json({
        error: "Forbidden: cannot upsert BPO KPIs",
      });
    }

    const {
      campaignId,
      date,
      talkTimeMin,
      handledCalls,
      outboundCalls,
      leadsCreated,
      demosBooked,
      salesClosed,
      fteCount,
      avgQaScore,
      revenue,
      cost,
      isTest,
    } = req.body;

    const { logAuditEvent } = await import("@/lib/audit");

    if (!campaignId || !date) {
      return res.status(400).json({
        error: "campaignId and date are required",
      });
    }

    const parsedCampaignId = Number(campaignId);
    const parsedDate = new Date(date);
    parsedDate.setUTCHours(0, 0, 0, 0);

    if (
      !Number.isFinite(parsedCampaignId) ||
      isNaN(parsedDate.getTime())
    ) {
      return res.status(400).json({
        error: "Invalid campaignId or date",
      });
    }

    const kpi = await upsertBpoKpiDaily({
      campaignId: parsedCampaignId,
      date: parsedDate,
      talkTimeMin:
        talkTimeMin != null ? Number(talkTimeMin) : undefined,
      handledCalls:
        handledCalls != null ? Number(handledCalls) : undefined,
      outboundCalls:
        outboundCalls != null ? Number(outboundCalls) : undefined,
      leadsCreated:
        leadsCreated != null ? Number(leadsCreated) : undefined,
      demosBooked:
        demosBooked != null ? Number(demosBooked) : undefined,
      salesClosed:
        salesClosed != null ? Number(salesClosed) : undefined,
      fteCount:
        fteCount != null ? Number(fteCount) : undefined,
      avgQaScore:
        avgQaScore != null ? Number(avgQaScore) : undefined,
      revenue:
        revenue != null ? Number(revenue) : undefined,
      cost:
        cost != null ? Number(cost) : undefined,
      isTest: isTest === true,
    });

    logAuditEvent(req, user, {
      domain: "bpo",
      action: "BPO_KPI_UPSERT",
      entityType: "bpoDailyKpi",
      entityId: `${parsedCampaignId}:${parsedDate.toISOString().slice(0, 10)}`,
      metadata: {
        campaignId: parsedCampaignId,
        date: parsedDate.toISOString().slice(0, 10),
        isTest: isTest === true,
      },
    });

    return res.status(200).json({ success: true, kpi });
  } catch (error) {
    console.error("BPO KPI upsert error:", error);
    return res
      .status(500)
      .json({ error: "Failed to upsert BPO KPI" });
  }
});
