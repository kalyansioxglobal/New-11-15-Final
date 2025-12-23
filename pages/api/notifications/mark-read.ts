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
    const { notificationIds, markAll } = req.body;

    if (markAll) {
      await prisma.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
      });
      return res.json({ success: true, message: 'All notifications marked as read' });
    }

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({ error: 'notificationIds array or markAll: true is required' });
    }

    await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds.map(Number) },
        userId: user.id,
      },
      data: { isRead: true },
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('Mark notifications read API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
