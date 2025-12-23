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

    if (conversation.assignedDispatcherId !== user.id && conversation.assignedDispatcherId !== null) {
      const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
      if (!isAdmin) {
        return res.status(403).json({ 
          error: "Only the assigned dispatcher or an admin can release this conversation",
        });
      }
    }

    const updated = await prisma.dispatchConversation.update({
      where: { id: conversationId },
      data: {
        assignedDispatcherId: null,
        assignedAt: null,
        assignmentStatus: "UNASSIGNED",
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
    console.error("[RELEASE CONVERSATION] Error:", error);
    return res.status(500).json({ error: "Failed to release conversation" });
  }
}
