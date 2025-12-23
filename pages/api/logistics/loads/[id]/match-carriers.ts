import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../../lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '../../../../../lib/scope';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const loadId = Number(id);

  if (isNaN(loadId)) {
    return res.status(400).json({ error: 'Invalid load ID' });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const scope = getUserScope(user);

    const load = await prisma.load.findUnique({
      where: { id: loadId },
    });

    if (!load) {
      return res.status(404).json({ error: 'Load not found' });
    }

    if (!scope.allVentures && load.ventureId && !scope.ventureIds.includes(load.ventureId)) {
      return res.status(403).json({ error: 'Not authorized for this venture' });
    }

    if (load.ventureId) {
      const { assertCanAccessVenture } = await import('../../../../../lib/scope');
      assertCanAccessVenture(scope, load.ventureId);
    }

    const carriers = await prisma.carrier.findMany({
      where: {
        active: true,
      },
    });

    const scored = carriers
      .map(carrier => {
        let score = 0;

        if (carrier.rating) score += carrier.rating * 10;

        let equipmentTypes: string[] = [];
        let lanes: { from?: string; to?: string }[] = [];

        if (carrier.equipmentTypes) {
          try {
            equipmentTypes = carrier.equipmentTypes.split(',').map(e => e.trim());
          } catch {}
        }

        if (carrier.lanesJson) {
          try {
            lanes = JSON.parse(carrier.lanesJson);
          } catch {}
        }

        if (load.equipmentType && equipmentTypes.some(e => 
          e.toLowerCase() === load.equipmentType!.toLowerCase()
        )) {
          score += 30;
        }

        const laneMatch = lanes.some(
          lane =>
            (!lane.from ||
              lane.from.toLowerCase().includes((load.pickupState || load.pickupCity || '').toLowerCase())) &&
            (!lane.to ||
              lane.to.toLowerCase().includes((load.dropState || load.dropCity || '').toLowerCase())),
        );

        if (laneMatch) score += 40;

        if (carrier.state) {
          if (carrier.state.toLowerCase() === (load.pickupState || '').toLowerCase()) {
            score += 15;
          }
        }

        return { carrier, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    return res.json(
      scored.map(s => ({
        id: s.carrier.id,
        name: s.carrier.name,
        email: s.carrier.email,
        phone: s.carrier.phone,
        mcNumber: s.carrier.mcNumber,
        dotNumber: s.carrier.dotNumber,
        rating: s.carrier.rating,
        score: s.score,
      })),
    );
  } catch (err) {
    console.error('Carrier matching API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
