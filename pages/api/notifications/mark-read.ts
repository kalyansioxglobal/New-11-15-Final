import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { requireUser } from '@/lib/apiAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const { notificationIds, ids, markAll } = req.body;

    // Support both 'notificationIds' and 'ids' for backward compatibility
    const targetIds = notificationIds || ids;

    if (markAll) {
      const result = await prisma.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
      });
      
      // Get updated unread count
      const unreadCount = await prisma.notification.count({
        where: { userId: user.id, isRead: false },
      });
      
      // Push updated unread count via SSE
      try {
        const { pushUnreadCountViaSSE } = await import("@/lib/notifications/push");
        await pushUnreadCountViaSSE(user.id, unreadCount);
      } catch (sseErr) {
        console.error("Failed to push unread count via SSE:", sseErr);
      }
      
      return res.json({ success: true, message: 'All notifications marked as read', count: result.count, unreadCount });
    }

    if (!targetIds || !Array.isArray(targetIds)) {
      return res.status(400).json({ error: 'notificationIds (or ids) array or markAll: true is required' });
    }

    if (targetIds.length === 0) {
      return res.status(400).json({ error: 'At least one notification ID is required' });
    }

    const result = await prisma.notification.updateMany({
      where: {
        id: { in: targetIds.map(Number) },
        userId: user.id,
      },
      data: { isRead: true },
    });

    // Get updated unread count
    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, isRead: false },
    });

    // Push updated unread count via SSE
    try {
      const { pushUnreadCountViaSSE } = await import("@/lib/notifications/push");
      await pushUnreadCountViaSSE(user.id, unreadCount);
    } catch (sseErr) {
      console.error("Failed to push unread count via SSE:", sseErr);
    }

    return res.json({ success: true, count: result.count, unreadCount });
  } catch (err) {
    console.error('Mark notifications read API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
