import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/apiAuth";

const clients = new Map<number, Set<NextApiResponse>>();

export function notifyUser(userId: number, event: string, data: unknown) {
  const userClients = clients.get(userId);
  if (userClients) {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    userClients.forEach((res) => {
      try {
        res.write(message);
      } catch {
        userClients.delete(res);
      }
    });
  }
}

export function notifyAllDispatchers(ventureId: number, event: string, data: unknown) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach((userClients, userId) => {
    userClients.forEach((res) => {
      try {
        res.write(message);
      } catch {
        userClients.delete(res);
      }
    });
  });
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
