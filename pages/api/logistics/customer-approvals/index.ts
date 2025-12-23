import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';
import sgMail from '@sendgrid/mail';
import { requireUser } from '@/lib/apiAuth';

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

type CreateApprovalBody = {
  ventureId: number;
  customerId: number;
  requestedById: number;
  notes?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const user = await requireUser(req, res);
  if (!user) return;

  try {
    switch (req.method) {
      case 'POST':
        return createApproval(req, res);
      case 'GET':
        return listApprovals(req, res);
      default: {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: 'Method not allowed' });
      }
    }
  } catch (err: any) {
    console.error('Customer approvals API error', err);
    return res
      .status(500)
      .json({ error: 'Internal server error', detail: err.message || String(err) });
  }
}

async function createApproval(req: NextApiRequest, res: NextApiResponse) {
  const body = req.body as CreateApprovalBody;

  const customer = await prisma.customer.findUnique({
    where: { id: body.customerId },
    select: { id: true, name: true, ventureId: true },
  });

  if (!customer || customer.ventureId !== Number(body.ventureId)) {
    return res.status(400).json({
      error: 'Customer does not belong to the specified venture. Approval blocked.',
    });
  }

  const userVenture = await prisma.ventureUser.findFirst({
    where: {
      userId: body.requestedById,
      ventureId: body.ventureId,
    },
  });

  if (!userVenture) {
    return res.status(403).json({
      error: 'User is not allowed to submit approvals for this venture.',
    });
  }

  const approval = await prisma.customerApproval.create({
    data: {
      customerId: body.customerId,
      ventureId: body.ventureId,
      requestedById: body.requestedById,
      notes: body.notes,
    },
    include: {
      customer: true,
      venture: true,
      requestedBy: true,
    },
  });

  const routing = await prisma.approvalRouting.findFirst({
    where: { ventureId: body.ventureId },
  });

  if (routing && process.env.SENDGRID_API_KEY) {
    const to = routing.toEmails.split(',').map((s) => s.trim()).filter(Boolean);
    const cc = routing.ccEmails
      ? routing.ccEmails.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const msg = {
      to,
      cc,
      from: process.env.APPROVALS_FROM_EMAIL || 'no-reply@ops-command-center.com',
      subject: `[Customer Approval] ${approval.customer.name} - ${approval.venture.name}`,
      text: `A new customer approval has been requested.

Venture: ${approval.venture.name}
Customer: ${approval.customer.name}
Requested by: ${approval.requestedBy.fullName ?? approval.requestedBy.email}
Notes: ${approval.notes ?? 'N/A'}

Approval ID: ${approval.id}
Status: ${approval.status}
Created at: ${approval.createdAt.toISOString()}
`,
    };

    try {
      await sgMail.send(msg as any);
    } catch (e) {
      console.error('SendGrid error', e);
    }
  }

  return res.status(201).json(approval);
}

async function listApprovals(req: NextApiRequest, res: NextApiResponse) {
  const { ventureId } = req.query;
  if (!ventureId) {
    return res.status(400).json({ error: 'ventureId is required' });
  }

  const page = Number(req.query.page || 1);
  const pageSize = Number(req.query.pageSize || 50);

  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safePageSize =
    Number.isFinite(pageSize) && pageSize > 0 && pageSize <= 200 ? pageSize : 50;

  const skip = (safePage - 1) * safePageSize;
  const take = safePageSize;

  const [total, approvals] = await Promise.all([
    prisma.customerApproval.count({ where: { ventureId: Number(ventureId) } }),
    prisma.customerApproval.findMany({
      where: {
        ventureId: Number(ventureId),
      },
      include: {
        customer: true,
        requestedBy: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
  ]);

  return res.status(200).json({
    items: approvals,
    page: safePage,
    pageSize: safePageSize,
    total,
    totalPages: Math.ceil(total / safePageSize) || 1,
  });
}
