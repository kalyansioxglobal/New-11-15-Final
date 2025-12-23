import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { canViewCustomer, SessionUser, isManagerLike, isGlobalAdmin } from '@/lib/scope';
import { logger } from '@/lib/logger';
import { generateRequestId } from '@/lib/requestId';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await requireUser(req, res);
  if (!user) return;

  const requestId = (req.headers && (req.headers["x-request-id"] as string)) || generateRequestId();

  const id = Number(req.query.id);
  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      venture: { select: { id: true, name: true } },
      salesRep: { select: { id: true, fullName: true } },
      csr: { select: { id: true, fullName: true } },
      dispatcher: { select: { id: true, fullName: true } },
      loads: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          tmsLoadId: true,
          status: true,
          pickupCity: true,
          pickupState: true,
          dropCity: true,
          dropState: true,
          billAmount: true,
        },
      },
    },
  });

  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  if (!canViewCustomer(user, customer)) {
    return res.status(403).json({ error: 'Not allowed to view this customer' });
  }

  try {
    switch (req.method) {
      case 'GET': {
        logger.info("freight_api", {
          endpoint: "/api/logistics/customers/[id]",
          userId: user.id,
          role: user.role,
          outcome: "success",
          requestId,
        });
        return res.json(customer);
      }
      case 'PUT':
      case 'PATCH':
        return updateCustomer(req, res, user, customer.id, requestId);
      case 'DELETE':
        return deleteCustomer(req, res, user, customer.id, requestId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    logger.error("freight_api", {
      endpoint: "/api/logistics/customers/[id]",
      userId: user.id,
      role: user.role,
      outcome: "error",
      requestId,
    });
    console.error('Customer detail API error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateCustomer(
  req: NextApiRequest,
  res: NextApiResponse,
  user: SessionUser,
  id: number,
  requestId: string,
) {
  if (!isManagerLike(user)) {
    return res.status(403).json({ error: 'Not allowed to update customers' });
  }

  const {
    name,
    email,
    phone,
    address,
    vertical,
    assignedSalesId,
    assignedCsrId,
    assignedDispatcherId,
    isActive,
  } = req.body;

  const updated = await prisma.customer.update({
    where: { id },
    data: {
      name: name ?? undefined,
      email: email !== undefined ? email : undefined,
      phone: phone !== undefined ? phone : undefined,
      address: address !== undefined ? address : undefined,
      vertical: vertical !== undefined ? vertical : undefined,
      assignedSalesId: assignedSalesId !== undefined ? assignedSalesId : undefined,
      assignedCsrId: assignedCsrId !== undefined ? assignedCsrId : undefined,
      assignedDispatcherId: assignedDispatcherId !== undefined ? assignedDispatcherId : undefined,
      isActive: isActive !== undefined ? isActive : undefined,
    },
    include: {
      venture: { select: { id: true, name: true } },
      salesRep: { select: { id: true, fullName: true } },
      csr: { select: { id: true, fullName: true } },
      dispatcher: { select: { id: true, fullName: true } },
    },
  });

  logger.info("freight_api", {
    endpoint: "/api/logistics/customers/[id]",
    userId: user.id,
    role: user.role,
    outcome: "success",
    requestId,
  });

  return res.json(updated);
}

async function deleteCustomer(
  req: NextApiRequest,
  res: NextApiResponse,
  user: SessionUser,
  id: number,
  requestId: string,
) {
  if (!isGlobalAdmin(user)) {
    return res.status(403).json({ error: 'Not allowed to delete customers' });
  }

  await prisma.customer.delete({
    where: { id },
  });

  logger.info("freight_api", {
    endpoint: "/api/logistics/customers/[id]",
    userId: user.id,
    role: user.role,
    outcome: "success",
    requestId,
  });

  return res.status(204).end();
}
