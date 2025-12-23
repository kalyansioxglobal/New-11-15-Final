import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { customerWhereForUser, SessionUser, isManagerLike } from '@/lib/scope';
import { logger } from '@/lib/logger';
import { generateRequestId } from '@/lib/requestId';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await requireUser(req, res);
  if (!user) return;

  const requestId = (req.headers && (req.headers["x-request-id"] as string)) || generateRequestId();

  logger.info("freight_api", {
    endpoint: "/api/logistics/customers",
    userId: user.id,
    role: user.role,
    outcome: "start",
    requestId,
  });

  try {
    switch (req.method) {
      case 'GET':
        return getCustomers(req, res, user, requestId);
      case 'POST':
        return createCustomer(req, res, user, requestId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    logger.error("freight_api", {
      endpoint: "/api/logistics/customers",
      userId: user.id,
      role: user.role,
      outcome: "error",
      requestId,
    });
    // Error already logged via logger.error above
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getCustomers(
  req: NextApiRequest,
  res: NextApiResponse,
  user: SessionUser,
  requestId: string,
) {
  const where = customerWhereForUser(user);

  const page = Number(req.query.page || 1);
  const pageSize = Number(req.query.pageSize || 50);

  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safePageSize =
    Number.isFinite(pageSize) && pageSize > 0 && pageSize <= 200 ? pageSize : 50;

  const skip = (safePage - 1) * safePageSize;
  const take = safePageSize;

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      include: {
        venture: { select: { id: true, name: true } },
        salesRep: { select: { id: true, fullName: true } },
        csr: { select: { id: true, fullName: true } },
        dispatcher: { select: { id: true, fullName: true } },
        _count: { select: { loads: true } },
      },
      orderBy: { id: 'desc' },
      skip,
      take,
    }),
  ]);

  logger.info("freight_api", {
    endpoint: "/api/logistics/customers",
    userId: user.id,
    role: user.role,
    outcome: "success",
    requestId,
  });

  return res.json({
    items: customers,
    page: safePage,
    pageSize: safePageSize,
    total,
    totalPages: Math.ceil(total / safePageSize) || 1,
  });
}

async function createCustomer(
  req: NextApiRequest,
  res: NextApiResponse,
  user: SessionUser,
  requestId: string,
) {
  if (!isManagerLike(user)) {
    return res.status(403).json({ error: 'Not allowed to create customers' });
  }

  const {
    name,
    email,
    phone,
    address,
    tmsCustomerCode,
    internalCode,
    vertical,
    ventureId,
    assignedSalesId,
    assignedCsrId,
    assignedDispatcherId,
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  const customer = await prisma.customer.create({
    data: {
      name,
      email: email ?? null,
      phone: phone ?? null,
      address: address ?? null,
      tmsCustomerCode: tmsCustomerCode ?? null,
      internalCode: internalCode ?? null,
      vertical: vertical ?? null,
      ventureId: ventureId ?? null,
      assignedSalesId: assignedSalesId ?? null,
      assignedCsrId: assignedCsrId ?? null,
      assignedDispatcherId: assignedDispatcherId ?? null,
    },
    include: {
      venture: { select: { id: true, name: true } },
      salesRep: { select: { id: true, fullName: true } },
      csr: { select: { id: true, fullName: true } },
      dispatcher: { select: { id: true, fullName: true } },
    },
  });

  logger.info("freight_api", {
    endpoint: "/api/logistics/customers",
    userId: user.id,
    role: user.role,
    outcome: "success",
    requestId,
  });

  return res.status(201).json(customer);
}
