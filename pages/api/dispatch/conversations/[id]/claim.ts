import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";
import { getUserScope } from "@/lib/scope";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  const scope = getUserScope(user);
  const { id } = req.query;
  const conversationId = parseInt(id as string);

  if (isNaN(conversationId)) {
    return res.status(400).json({ error: "Invalid conversation ID" });
  }

  try {
    const conversation = await prisma.dispatchConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    if (!scope.allVentures && !scope.ventureIds.includes(conversation.ventureId)) {
      return res.status(403).json({ error: "Forbidden: no access to this conversation" });
    }

    if (conversation.assignmentStatus === "CLAIMED" && conversation.assignedDispatcherId !== user.id) {
      return res.status(409).json({ 
        error: "Conversation already claimed by another dispatcher",
        claimedBy: conversation.assignedDispatcherId,
      });
    }

    const updated = await prisma.dispatchConversation.update({
      where: { id: conversationId },
      data: {
        assignedDispatcherId: user.id,
        assignedAt: new Date(),
        assignmentStatus: "CLAIMED",
      },
      include: {
        driver: { select: { id: true, firstName: true, lastName: true } },
        carrier: { select: { id: true, name: true } },
      },
    });

    return res.status(200).json({ 
      success: true,
      conversation: {
        id: updated.id,
        assignedDispatcherId: updated.assignedDispatcherId,
        assignedAt: updated.assignedAt,
        assignmentStatus: updated.assignmentStatus,
      },
    });
  } catch (error) {
    console.error("[CLAIM CONVERSATION] Error:", error);
    return res.status(500).json({ error: "Failed to claim conversation" });
  }
}
