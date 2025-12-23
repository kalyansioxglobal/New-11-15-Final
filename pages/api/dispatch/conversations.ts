import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";
import { getUserScope } from "@/lib/scope";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await requireUser(req, res);
  if (!user) return;

  const scope = getUserScope(user);

  if (req.method === "GET") {
    try {
      const { status, channel, search, page = "1", limit = "20" } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      const where: any = { isTest: user.isTestUser };

      if (!scope.allVentures && scope.ventureIds.length > 0) {
        where.ventureId = { in: scope.ventureIds };
      }

      if (status && status !== "all") {
        where.status = status as string;
      }

      if (channel && channel !== "all") {
        where.channel = channel as string;
      }

      if (search) {
        where.OR = [
          { externalAddress: { contains: search as string, mode: "insensitive" } },
          { subject: { contains: search as string, mode: "insensitive" } },
        ];
      }

      const [conversations, total] = await Promise.all([
        prisma.dispatchConversation.findMany({
          where,
          include: {
            driver: {
              select: { id: true, firstName: true, lastName: true, phone: true, email: true },
            },
            carrier: {
              select: { id: true, name: true, phone: true, email: true },
            },
            dispatchLoad: {
              select: { id: true, referenceNumber: true, status: true },
            },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { body: true, createdAt: true, direction: true },
            },
          },
          orderBy: { lastMessageAt: "desc" },
          skip,
          take: limitNum,
        }) as Promise<Array<{
          id: number;
          channel: string;
          status: string;
          subject: string | null;
          participantType: string;
          externalAddress: string;
          unreadCount: number;
          lastMessageAt: Date | null;
          createdAt: Date;
          assignedDispatcherId: number | null;
          assignmentStatus: string;
          driver: { id: number; firstName: string; lastName: string; phone: string; email: string | null } | null;
          carrier: { id: number; name: string; phone: string | null; email: string | null } | null;
          dispatchLoad: { id: number; referenceNumber: string; status: string } | null;
          messages: Array<{ body: string; createdAt: Date; direction: string }>;
        }>>,
        prisma.dispatchConversation.count({ where }),
      ]);

      const formattedConversations = conversations.map((c) => ({
        id: c.id,
        channel: c.channel,
        status: c.status,
        subject: c.subject,
        participantType: c.participantType,
        externalAddress: c.externalAddress,
        unreadCount: c.unreadCount,
        lastMessageAt: c.lastMessageAt,
        createdAt: c.createdAt,
        driver: c.driver,
        carrier: c.carrier,
        load: c.dispatchLoad,
        lastMessage: c.messages[0] || null,
        participantName: c.driver
          ? `${c.driver.firstName} ${c.driver.lastName}`
          : c.carrier?.name || "Unknown",
        assignedDispatcherId: c.assignedDispatcherId,
        assignmentStatus: c.assignmentStatus,
      }));

      return res.status(200).json({
        conversations: formattedConversations,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error("[CONVERSATIONS API] Error:", error);
      return res.status(500).json({ error: "Failed to fetch conversations" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
