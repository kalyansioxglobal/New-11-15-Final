import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';
import { canImpersonate } from '../../../lib/permissions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const initiatorId = Number(session.user.id);
    const initiator = await prisma.user.findUnique({
      where: { id: initiatorId },
    });

    if (!initiator) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!canImpersonate(initiator.role)) {
      return res.status(403).json({ error: 'Not authorized to impersonate' });
    }

    const { targetUserId, reason } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ error: 'targetUserId is required' });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: Number(targetUserId) },
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    if (targetUser.id === initiatorId) {
      return res.status(400).json({ error: 'Cannot impersonate yourself' });
    }

    const forwardedFor = req.headers['x-forwarded-for'];
    const ipAddress = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor?.split(',')[0]?.trim() || req.socket.remoteAddress || null;

    const log = await prisma.impersonationLog.create({
      data: {
        initiatorId,
        impersonatedId: targetUser.id,
        reason,
        ipAddress,
      },
    });

    return res.json({
      success: true,
      logId: log.id,
      impersonating: {
        id: targetUser.id,
        name: targetUser.fullName,
        email: targetUser.email,
        role: targetUser.role,
      },
    });
  } catch (err) {
    console.error('Impersonation start API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
