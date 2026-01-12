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

    // Optimize: Batch fetch all outreach messages and replies instead of querying per load
    // This prevents N+1 query problem and connection pool exhaustion
    const loadIds = loads.map((l) => l.id);
    const lastMessagesByLoadId = new Map<number, any>();
    const replyCountsByLoadId = new Map<number, number>();
    
    if (loadIds.length > 0) {
      // Fetch all last outreach messages in one query
      // Since we order by createdAt desc, we'll get the latest messages first
      const allLastMessages = await prisma.outreachMessage.findMany({
        where: {
          loadId: { in: loadIds },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          loadId: true,
          channel: true,
          status: true,
          createdAt: true,
          _count: { select: { recipients: true } },
        },
      });

      // Group by loadId and get the first (latest) message for each load
      for (const msg of allLastMessages) {
        if (!lastMessagesByLoadId.has(msg.loadId)) {
          lastMessagesByLoadId.set(msg.loadId, msg);
        }
      }

      // Batch fetch unread reply counts for all loads
      const conversationsWithLoads = await prisma.outreachConversation.findMany({
        where: {
          loadId: { in: loadIds },
        },
        select: {
          loadId: true,
          id: true,
        },
      });

      const conversationIds = conversationsWithLoads.map((c) => c.id);
      const conversationIdToLoadId = new Map<number, number>();
      conversationsWithLoads.forEach((c) => {
        if (c.loadId) {
          conversationIdToLoadId.set(c.id, c.loadId);
        }
      });

      if (conversationIds.length > 0) {
        const unreadRepliesCounts = await prisma.outreachReply.groupBy({
          by: ["conversationId"],
          where: {
            conversationId: { in: conversationIds },
            direction: "inbound",
          },
          _count: {
            id: true,
          },
        });

        // Map reply counts to loadIds
        for (const count of unreadRepliesCounts) {
          const loadId = conversationIdToLoadId.get(count.conversationId);
          if (loadId) {
            const current = replyCountsByLoadId.get(loadId) || 0;
            replyCountsByLoadId.set(loadId, current + count._count.id);
          }
        }
      }
    }

    // Map results back to loads
    const loadsWithOutreach = loads.map((load) => {
      const lastMessage = lastMessagesByLoadId.get(load.id);
      const unreadReplies = replyCountsByLoadId.get(load.id) || 0;

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
    });

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
