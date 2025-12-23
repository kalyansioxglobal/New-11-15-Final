import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getEffectiveUser } from "@/lib/effectiveUser";
import { selectCarriersForLoad } from "@/lib/outreach/selectCarriersForLoad";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await getEffectiveUser(req, res);
  if (!user) return;

  const loadId = req.query.loadId ? parseInt(req.query.loadId as string, 10) : null;
  const ventureId = req.query.ventureId ? parseInt(req.query.ventureId as string, 10) : null;

  try {
    const loadsWhere: Record<string, unknown> = {
      loadStatus: { in: ["OPEN", "WORKING", "AT_RISK"] },
    };

    if (ventureId) {
      loadsWhere.ventureId = ventureId;
    }

    const loads = await prisma.load.findMany({
      where: loadsWhere,
      select: {
        id: true,
        reference: true,
        pickupCity: true,
        pickupState: true,
        dropCity: true,
        dropState: true,
        pickupDate: true,
        equipmentType: true,
        loadStatus: true,
        createdAt: true,
        ventureId: true,
        venture: { select: { name: true } },
      },
      orderBy: [
        { loadStatus: "asc" },
        { createdAt: "desc" },
      ],
      take: 100,
    });

    const loadsWithOutreach = await Promise.all(
      loads.map(async (load) => {
        const lastMessage = await prisma.outreachMessage.findFirst({
          where: { loadId: load.id },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            channel: true,
            status: true,
            createdAt: true,
            _count: { select: { recipients: true } },
          },
        });

        const unreadReplies = await prisma.outreachReply.count({
          where: {
            conversation: { loadId: load.id },
            direction: "inbound",
          },
        });

        return {
          ...load,
          minutesSincePosted: Math.floor(
            (Date.now() - new Date(load.createdAt).getTime()) / 60000
          ),
          lastOutreach: lastMessage
            ? {
                channel: lastMessage.channel,
                status: lastMessage.status,
                recipientCount: lastMessage._count.recipients,
                at: lastMessage.createdAt,
              }
            : null,
          replyCount: unreadReplies,
        };
      })
    );

    let selectedLoad = null;
    let recommendedCarriers: unknown[] = [];
    let outreachHistory: unknown[] = [];
    let conversations: unknown[] = [];
    let attribution = null;

    if (loadId) {
      selectedLoad = await prisma.load.findUnique({
        where: { id: loadId },
        include: {
          venture: { select: { id: true, name: true } },
          carrier: { select: { id: true, name: true } },
        },
      });

      if (selectedLoad) {
        recommendedCarriers = await selectCarriersForLoad({
          loadId,
          channel: "email",
          limit: 50,
        });

        outreachHistory = await prisma.outreachMessage.findMany({
          where: { loadId },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            channel: true,
            subject: true,
            status: true,
            provider: true,
            createdAt: true,
            _count: { select: { recipients: true } },
          },
          take: 20,
        });

        conversations = await prisma.outreachConversation.findMany({
          where: { loadId },
          orderBy: { lastMessageAt: "desc" },
          include: {
            carrier: { select: { id: true, name: true, email: true, phone: true } },
            replies: {
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                direction: true,
                body: true,
                createdAt: true,
              },
            },
          },
        });

        attribution = await prisma.outreachAttribution.findUnique({
          where: { loadId },
          select: {
            id: true,
            channel: true,
            timeToFirstReplyMinutes: true,
            timeToCoverageMinutes: true,
            margin: true,
            carrierId: true,
            createdAt: true,
            carrier: { select: { id: true, name: true } },
          },
        });
      }
    }

    return res.status(200).json({
      loads: loadsWithOutreach,
      selectedLoad,
      recommendedCarriers,
      outreachHistory,
      conversations,
      attribution,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Outreach war room API error:", error);
    return res.status(500).json({ error: "Failed to load war room data", detail: errMsg });
  }
}
