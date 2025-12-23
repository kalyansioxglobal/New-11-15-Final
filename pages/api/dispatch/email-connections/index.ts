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
      const { ventureId } = req.query;
      
      const where: Record<string, unknown> = {
        userId: user.id,
      };
      
      if (ventureId) {
        where.ventureId = parseInt(ventureId as string);
      } else if (!scope.allVentures && scope.ventureIds.length > 0) {
        where.ventureId = { in: scope.ventureIds };
      }

      const connections = await prisma.emailProviderConnection.findMany({
        where,
        select: {
          id: true,
          userId: true,
          ventureId: true,
          provider: true,
          emailAddress: true,
          syncEnabled: true,
          lastSyncAt: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return res.status(200).json({ connections });
    } catch (error) {
      console.error("[EMAIL CONNECTIONS] Error:", error);
      return res.status(500).json({ error: "Failed to fetch connections" });
    }
  }

  if (req.method === "DELETE") {
    try {
      const { id } = req.body;

      if (!id) {
        return res.status(400).json({ error: "Connection id is required" });
      }

      const connection = await prisma.emailProviderConnection.findFirst({
        where: { 
          id: parseInt(id),
          userId: user.id,
        },
      });

      if (!connection) {
        return res.status(404).json({ error: "Connection not found or you don't have access" });
      }

      await prisma.emailProviderConnection.delete({
        where: { id: parseInt(id) },
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("[EMAIL CONNECTIONS DELETE] Error:", error);
      return res.status(500).json({ error: "Failed to delete connection" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
