import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = Number(session.user.id);

    const latestLog = await prisma.impersonationLog.findFirst({
      where: {
        initiatorId: userId,
        endedAt: null,
      },
      orderBy: { startedAt: 'desc' },
    });

    if (latestLog) {
      await prisma.impersonationLog.update({
        where: { id: latestLog.id },
        data: { endedAt: new Date() },
      });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Impersonation stop API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
