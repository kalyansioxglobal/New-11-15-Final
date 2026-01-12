import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/apiAuth";

const clients = new Map<number, Set<NextApiResponse>>();

export function pushNotificationToUser(userId: number, notification: unknown) {
  const userClients = clients.get(userId);
  if (userClients && userClients.size > 0) {
    const message = `event: new_notification\ndata: ${JSON.stringify(notification)}\n\n`;
    const deadClients: NextApiResponse[] = [];
    userClients.forEach((res) => {
      try {
        res.write(message);
        if ('flush' in res && typeof res.flush === 'function') {
          (res as any).flush();
        }
      } catch (error) {
        console.error(`[SSE Stream] Failed to write to client for user ${userId}:`, error);
        deadClients.push(res);
      }
    });
    deadClients.forEach((res) => userClients.delete(res));
    if (userClients.size === 0) {
      clients.delete(userId);
    }
  }
}

export function pushUnreadCountToUser(userId: number, unreadCount: number) {
  const userClients = clients.get(userId);
  if (userClients && userClients.size > 0) {
    const message = `event: unread_count\ndata: ${JSON.stringify({ unreadCount })}\n\n`;
    const deadClients: NextApiResponse[] = [];
    userClients.forEach((res) => {
      try {
        res.write(message);
      } catch (error) {
        console.error(`[SSE Stream] Failed to write unread count to client for user ${userId}:`, error);
        deadClients.push(res);
      }
    });
    deadClients.forEach((res) => userClients.delete(res));
    if (userClients.size === 0) {
      clients.delete(userId);
    }
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  res.write(`event: connected\ndata: {"userId": ${user.id}}\n\n`);

  if (!clients.has(user.id)) {
    clients.set(user.id, new Set());
  }
  clients.get(user.id)!.add(res);

  // Send heartbeat every 30 seconds to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(`:heartbeat\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, 30000);

  req.on("close", () => {
    clearInterval(heartbeat);
    const userClients = clients.get(user.id);
    if (userClients) {
      userClients.delete(res);
      if (userClients.size === 0) {
        clients.delete(user.id);
      }
    }
  });
}

export const config = {
  api: {
    bodyParser: false,
  },
};

