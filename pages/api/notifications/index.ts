import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { createApiHandler } from "@/lib/api/handler";
import { safeValidate } from "@/lib/api/validation";

const GetQuerySchema = z.object({
  includeRead: z.enum(["true", "false"]).optional().default("false"),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

const CreateBodySchema = z.object({
  title: z.string().min(1, "title is required"),
  body: z.string().optional(),
  type: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.coerce.number().int().positive().optional(),
  userId: z.coerce.number().int().positive().optional(),
});

export default createApiHandler(
  {
    GET: async (req: NextApiRequest, res: NextApiResponse, ctx) => {
      const validation = safeValidate(GetQuerySchema, req.query);
      if (!validation.success) {
        return res.status(400).json({ error: (validation as { success: false; error: string }).error });
      }

      const { includeRead, page, pageSize } = validation.data;

      try {
        const skip = (page - 1) * pageSize;
        const includeReadBool = includeRead === "true";

        const where: { userId: number; isRead?: boolean } = { userId: ctx.user!.id };
        if (!includeReadBool) {
          where.isRead = false;
        }

        const [notifications, total, unreadCount] = await Promise.all([
          prisma.notification.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip,
            take: pageSize,
          }),
          prisma.notification.count({ where }),
          prisma.notification.count({ where: { userId: ctx.user!.id, isRead: false } }),
        ]);

        return res.status(200).json({
          items: notifications,
          unreadCount,
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize) || 1,
        });
      } catch (err) {
        const error = err as Error;
        console.error("Notifications API error:", err);
        return res.status(500).json({ 
          error: "Internal server error", 
          detail: error.message || String(err) 
        });
      }
    },

    POST: async (req: NextApiRequest, res: NextApiResponse, ctx) => {
      const { title, body, type, entityType, entityId, userId: targetUserId } = req.body;

      if (!title) {
        return res.status(400).json({ error: "title is required" });
      }

      try {
        const notifyUserId = targetUserId ? Number(targetUserId) : ctx.user!.id;

        if (notifyUserId !== ctx.user!.id) {
          const { isSuperAdmin } = await import("@/lib/permissions");
          if (!isSuperAdmin(ctx.user!.role)) {
            return res.status(403).json({ 
              error: "Only admins can create notifications for other users" 
            });
          }
        }

        const notification = await prisma.notification.create({
          data: {
            userId: notifyUserId,
            title,
            body,
            type,
            entityType,
            entityId: entityId ? Number(entityId) : null,
          },
        });

        // Push notification via SSE if available
        const { pushNotificationViaSSE, pushUnreadCountViaSSE } = await import("@/lib/notifications/push");
        await pushNotificationViaSSE(notifyUserId, notification);
        
        // Also update unread count
        const unreadCount = await prisma.notification.count({
          where: { userId: notifyUserId, isRead: false },
        });
        await pushUnreadCountViaSSE(notifyUserId, unreadCount);

        return res.status(201).json(notification);
      } catch (err) {
        const error = err as Error;
        console.error("Notifications API error:", err);
        return res.status(500).json({ 
          error: "Internal server error", 
          detail: error.message || String(err) 
        });
      }
    },
  },
  { requireAuth: true }
);
