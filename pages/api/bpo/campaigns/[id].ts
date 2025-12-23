import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '../../../../lib/scope';
import { isSuperAdmin } from '../../../../lib/permissions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const campaignId = Number(id);

  if (isNaN(campaignId)) {
    return res.status(400).json({ error: 'Invalid campaign ID' });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const scope = getUserScope(user);

    const campaign = await prisma.bpoCampaign.findUnique({
      where: { id: campaignId },
      include: {
        venture: { select: { id: true, name: true } },
        office: { select: { id: true, name: true, city: true } },
        agents: {
          include: {
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
        _count: { select: { kpiRecords: true, dailyMetrics: true } },
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (!scope.ventureIds.includes(campaign.ventureId) && !scope.allVentures) {
      return res.status(403).json({ error: 'Not authorized for this venture' });
    }

    if (req.method === 'GET') {
      return res.json(campaign);
    }

    if (req.method === 'PATCH') {
      if (!isSuperAdmin(user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { name, clientName, formulaJson, description, isActive, vertical, timezone, officeId } = req.body;

      const updated = await prisma.bpoCampaign.update({
        where: { id: campaignId },
        data: {
          ...(name !== undefined && { name }),
          ...(clientName !== undefined && { clientName }),
          ...(formulaJson !== undefined && { formulaJson }),
          ...(description !== undefined && { description }),
          ...(isActive !== undefined && { isActive }),
          ...(vertical !== undefined && { vertical }),
          ...(timezone !== undefined && { timezone }),
          ...(officeId !== undefined && { officeId: officeId ? Number(officeId) : null }),
        },
        include: {
          venture: { select: { id: true, name: true } },
          office: { select: { id: true, name: true, city: true } },
        },
      });

      return res.json(updated);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('BPO Campaign detail API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
