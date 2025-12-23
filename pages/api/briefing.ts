import type { NextApiRequest, NextApiResponse } from 'next';
import { buildDailyBriefing } from '@/lib/briefing';
import { requireUser } from '@/lib/apiAuth';
import { canViewKpis } from '@/lib/permissions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    if (!canViewKpis(user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const briefing = await buildDailyBriefing(user);
    return res.json(briefing);
  } catch (err) {
    console.error('[briefing API]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
