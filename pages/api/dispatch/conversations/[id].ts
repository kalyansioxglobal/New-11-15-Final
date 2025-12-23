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
  const { id } = req.query;
  const conversationId = parseInt(id as string, 10);

  if (isNaN(conversationId)) {
    return res.status(400).json({ error: "Invalid conversation ID" });
  }

  const conversation = await prisma.dispatchConversation.findUnique({
    where: { id: conversationId },
    select: { id: true, ventureId: true },
  });

  if (!conversation) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  if (!scope.allVentures && !scope.ventureIds.includes(conversation.ventureId)) {
    return res.status(403).json({ error: "Forbidden: no access to this conversation" });
  }

  if (req.method === "GET") {
    try {
      const fullConversation = await prisma.dispatchConversation.findUnique({
        where: { id: conversationId },
        include: {
          driver: {
            select: { id: true, firstName: true, lastName: true, phone: true, email: true, status: true },
          },
          carrier: {
            select: { id: true, name: true, phone: true, email: true },
          },
          dispatchLoad: {
            select: {
              id: true,
              referenceNumber: true,
              status: true,
              pickupCity: true,
              pickupState: true,
              deliveryCity: true,
              deliveryState: true,
            },
          },
          messages: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              direction: true,
              channel: true,
              fromAddress: true,
              toAddress: true,
              subject: true,
              body: true,
              status: true,
              createdAt: true,
            },
          },
        },
      });

      await prisma.dispatchConversation.update({
        where: { id: conversationId },
        data: { unreadCount: 0 },
      });

      return res.status(200).json({ 
        conversation: {
          ...fullConversation,
          assignedDispatcherId: fullConversation?.assignedDispatcherId,
          assignmentStatus: fullConversation?.assignmentStatus,
        },
      });
    } catch (error) {
      console.error("[CONVERSATION API] Get error:", error);
      return res.status(500).json({ error: "Failed to fetch conversation" });
    }
  }

  if (req.method === "PATCH") {
    try {
      const { status } = req.body;

      const updateData: any = {};
      if (status) updateData.status = status;

      const updatedConversation = await prisma.dispatchConversation.update({
        where: { id: conversationId },
        data: updateData,
      });

      return res.status(200).json({ conversation: updatedConversation });
    } catch (error) {
      console.error("[CONVERSATION API] Update error:", error);
      return res.status(500).json({ error: "Failed to update conversation" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
