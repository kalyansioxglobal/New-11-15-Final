import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '@/lib/scope';
import { isSuperAdmin } from '@/lib/permissions';
import { logger } from '@/lib/logger';
import { generateRequestId } from '@/lib/requestId';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const loadId = Number(req.query.id);
  if (isNaN(loadId)) {
    return res.status(400).json({ error: 'Invalid load ID' });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  const requestId = (req.headers && (req.headers["x-request-id"] as string)) || generateRequestId();

  try {
    const scope = getUserScope(user);

    const load = await prisma.load.findUnique({
      where: { id: loadId },
      include: {
        venture: { select: { id: true, name: true } },
        office: { select: { id: true, name: true, city: true } },
        carrier: { select: { id: true, name: true, mcNumber: true } },
        shipper: { select: { id: true, name: true, city: true, state: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!load) {
      return res.status(404).json({ error: 'Load not found' });
    }

    if (!scope.allVentures && load.ventureId && !scope.ventureIds.includes(load.ventureId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (req.method === 'GET') {
      logger.info("freight_api", {
        endpoint: "/api/logistics/loads/[id]",
        userId: user.id,
        role: user.role,
        outcome: "success",
        requestId,
      });
      return res.json(load);
    }

    if (req.method === 'PATCH') {
      if (!isSuperAdmin(user.role) && user.role !== 'VENTURE_HEAD' && user.role !== 'OFFICE_MANAGER') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const {
        status,
        lostReason,
        lostReasonCategory,
        dormantReason,
        notes,
        carrierId,
        buyRate,
        sellRate,
      } = req.body;

      const updateData: any = {};

      if (status !== undefined) updateData.status = status;
      if (lostReason !== undefined) updateData.lostReason = lostReason || null;
      if (lostReasonCategory !== undefined) updateData.lostReasonCategory = lostReasonCategory || null;
      if (dormantReason !== undefined) updateData.dormantReason = dormantReason || null;
      if (notes !== undefined) updateData.notes = notes || null;
      if (carrierId !== undefined) updateData.carrierId = carrierId ? Number(carrierId) : null;
      if (buyRate !== undefined) updateData.buyRate = buyRate ? Number(buyRate) : null;
      if (sellRate !== undefined) updateData.sellRate = sellRate ? Number(sellRate) : null;

      const updated = await prisma.load.update({
        where: { id: loadId },
        data: updateData,
        include: {
          venture: { select: { id: true, name: true } },
          office: { select: { id: true, name: true, city: true } },
          carrier: { select: { id: true, name: true, mcNumber: true } },
          shipper: { select: { id: true, name: true, city: true, state: true } },
          createdBy: { select: { id: true, fullName: true, email: true } },
        },
      });

      logger.info("freight_api", {
        endpoint: "/api/logistics/loads/[id]",
        userId: user.id,
        role: user.role,
        outcome: "success",
        requestId,
      });

      return res.json(updated);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    logger.error("freight_api", {
      endpoint: "/api/logistics/loads/[id]",
      userId: user.id,
      role: user.role,
      outcome: "error",
      requestId,
    });
    // Error already logged via logger.error above
    return res.status(500).json({ error: 'Internal server error' });
  }
}
