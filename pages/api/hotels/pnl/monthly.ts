import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

// Validation schemas
const GetPnlQuerySchema = z.object({
  hotelId: z.coerce.number().int().positive(),
  year: z.coerce.number().int().min(2000).max(2100),
});

const UpdatePnlBodySchema = z.object({
  hotelId: z.number().int().positive(),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  baseRevenue: z.number().nullable().optional(),
  payroll: z.number().nullable().optional(),
  utilities: z.number().nullable().optional(),
  repairsMaintenance: z.number().nullable().optional(),
  marketing: z.number().nullable().optional(),
  otaCommissions: z.number().nullable().optional(),
  insurance: z.number().nullable().optional(),
  propertyTax: z.number().nullable().optional(),
  adminGeneral: z.number().nullable().optional(),
  cashExpenses: z.number().nullable().optional(),
  bankExpenses: z.number().nullable().optional(),
  other1Label: z.string().nullable().optional(),
  other1Amount: z.number().nullable().optional(),
  other2Label: z.string().nullable().optional(),
  other2Amount: z.number().nullable().optional(),
  other3Label: z.string().nullable().optional(),
  other3Amount: z.number().nullable().optional(),
  other4Label: z.string().nullable().optional(),
  other4Amount: z.number().nullable().optional(),
  other5Label: z.string().nullable().optional(),
  other5Amount: z.number().nullable().optional(),
  other6Label: z.string().nullable().optional(),
  other6Amount: z.number().nullable().optional(),
  other7Label: z.string().nullable().optional(),
  other7Amount: z.number().nullable().optional(),
  other8Label: z.string().nullable().optional(),
  other8Amount: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});

type PnlMonthData = {
  month: number;
  baseRevenue: number | null;
  payroll: number;
  utilities: number;
  repairsMaintenance: number;
  marketing: number;
  otaCommissions: number;
  insurance: number;
  propertyTax: number;
  adminGeneral: number;
  cashExpenses: number;
  bankExpenses: number;
  other1Label: string | null;
  other1Amount: number;
  other2Label: string | null;
  other2Amount: number;
  other3Label: string | null;
  other3Amount: number;
  other4Label: string | null;
  other4Amount: number;
  other5Label: string | null;
  other5Amount: number;
  other6Label: string | null;
  other6Amount: number;
  other7Label: string | null;
  other7Amount: number;
  other8Label: string | null;
  other8Amount: number;
  notes: string | null;
  totalExpenses: number;
  net: number;
};

/**
 * Compute total expenses and net from P&L data
 */
function computeMetrics(data: {
  baseRevenue: Decimal | null;
  payroll: Decimal;
  utilities: Decimal;
  repairsMaintenance: Decimal;
  marketing: Decimal;
  otaCommissions: Decimal;
  insurance: Decimal;
  propertyTax: Decimal;
  adminGeneral: Decimal;
  cashExpenses: Decimal;
  bankExpenses: Decimal;
  other1Amount: Decimal;
  other2Amount: Decimal;
  other3Amount: Decimal;
  other4Amount: Decimal;
  other5Amount: Decimal;
  other6Amount: Decimal;
  other7Amount: Decimal;
  other8Amount: Decimal;
}) {
  const revenue = data.baseRevenue ? parseFloat(data.baseRevenue.toString()) : 0;
  const cashExp = parseFloat(data.cashExpenses?.toString() || '0');
  const bankExp = parseFloat(data.bankExpenses?.toString() || '0');
  const operatingExpenses =
    parseFloat(data.payroll.toString()) +
    parseFloat(data.utilities.toString()) +
    parseFloat(data.repairsMaintenance.toString()) +
    parseFloat(data.marketing.toString()) +
    parseFloat(data.otaCommissions.toString()) +
    parseFloat(data.insurance.toString()) +
    parseFloat(data.propertyTax.toString()) +
    parseFloat(data.adminGeneral.toString()) +
    parseFloat(data.other1Amount.toString()) +
    parseFloat(data.other2Amount.toString()) +
    parseFloat(data.other3Amount.toString()) +
    parseFloat(data.other4Amount.toString()) +
    parseFloat(data.other5Amount.toString()) +
    parseFloat(data.other6Amount.toString()) +
    parseFloat(data.other7Amount.toString()) +
    parseFloat(data.other8Amount.toString());
  const totalExpenses = operatingExpenses + cashExp + bankExp;
  const net = revenue - totalExpenses;
  return { totalExpenses, net, cashExpenses: cashExp, bankExpenses: bankExp };
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }

  // RBAC: Allow CEO, COO, FINANCE, HOTEL_ADMIN
  const allowedRoles = ['CEO', 'COO', 'FINANCE', 'HOTEL_ADMIN'];
  if (!allowedRoles.includes(user.role)) {
    logger.info('hotel_pnl_forbidden', {
      meta: { userId: user.id, userRole: user.role, endpoint: req.url },
    });
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method === 'GET') {
    try {
      const { hotelId, year } = GetPnlQuerySchema.parse(req.query);

      // Verify hotel exists
      const hotel = await prisma.hotelProperty.findUnique({ where: { id: hotelId } });
      if (!hotel) {
        return res.status(404).json({ error: 'Hotel not found' });
      }

      // Fetch all months for the year
      const pnlRecords = await prisma.hotelPnlMonthly.findMany({
        where: { hotelId, year },
        orderBy: { month: 'asc' },
      });

      // Create map for quick lookup
      const pnlMap = new Map(
        pnlRecords.map((r: (typeof pnlRecords)[number]) => [r.month, r]),
      );

      // Build 12 months response with skeletons for missing
      const months: PnlMonthData[] = [];
      for (let month = 1; month <= 12; month++) {
        const record = pnlMap.get(month) as (typeof pnlRecords)[number] | undefined;

        if (record) {
          const { totalExpenses, net, cashExpenses, bankExpenses } = computeMetrics(record as any);
          months.push({
            month,
            baseRevenue: record.baseRevenue ? parseFloat(record.baseRevenue.toString()) : null,
            payroll: parseFloat(record.payroll.toString()),
            utilities: parseFloat(record.utilities.toString()),
            repairsMaintenance: parseFloat(record.repairsMaintenance.toString()),
            marketing: parseFloat(record.marketing.toString()),
            otaCommissions: parseFloat(record.otaCommissions.toString()),
            insurance: parseFloat(record.insurance.toString()),
            propertyTax: parseFloat(record.propertyTax.toString()),
            adminGeneral: parseFloat(record.adminGeneral.toString()),
            cashExpenses,
            bankExpenses,
            other1Label: record.other1Label,
            other1Amount: parseFloat(record.other1Amount.toString()),
            other2Label: record.other2Label,
            other2Amount: parseFloat(record.other2Amount.toString()),
            other3Label: (record as any).other3Label,
            other3Amount: parseFloat(((record as any).other3Amount ?? 0).toString()),
            other4Label: (record as any).other4Label,
            other4Amount: parseFloat(((record as any).other4Amount ?? 0).toString()),
            other5Label: (record as any).other5Label,
            other5Amount: parseFloat(((record as any).other5Amount ?? 0).toString()),
            other6Label: (record as any).other6Label,
            other6Amount: parseFloat(((record as any).other6Amount ?? 0).toString()),
            other7Label: (record as any).other7Label,
            other7Amount: parseFloat(((record as any).other7Amount ?? 0).toString()),
            other8Label: (record as any).other8Label,
            other8Amount: parseFloat(((record as any).other8Amount ?? 0).toString()),
            notes: record.notes,
            totalExpenses,
            net,
          });
        } else {
          // Skeleton with defaults
          months.push({
            month,
            baseRevenue: null,
            payroll: 0,
            utilities: 0,
            repairsMaintenance: 0,
            marketing: 0,
            otaCommissions: 0,
            insurance: 0,
            propertyTax: 0,
            adminGeneral: 0,
            cashExpenses: 0,
            bankExpenses: 0,
            other1Label: null,
            other1Amount: 0,
            other2Label: null,
            other2Amount: 0,
            other3Label: null,
            other3Amount: 0,
            other4Label: null,
            other4Amount: 0,
            other5Label: null,
            other5Amount: 0,
            other6Label: null,
            other6Amount: 0,
            other7Label: null,
            other7Amount: 0,
            other8Label: null,
            other8Amount: 0,
            notes: null,
            totalExpenses: 0,
            net: 0,
          });
        }
      }

      logger.info('hotel_pnl_get', {
        meta: { userId: user.id, hotelId, year, monthsReturned: months.length },
      });

      return res.status(200).json({ hotelId, year, months });
    } catch (err: any) {
      logger.error('hotel_pnl_get_error', {
        meta: { userId: user.id, error: err.message },
      });
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid query parameters', details: err.errors });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'PUT') {
    try {
      const payload = UpdatePnlBodySchema.parse(req.body);
      const { hotelId, year, month } = payload;

      // Verify hotel exists
      const hotel = await prisma.hotelProperty.findUnique({ where: { id: hotelId } });
      if (!hotel) {
        return res.status(404).json({ error: 'Hotel not found' });
      }

      // Upsert the monthly P&L record
      const updated = await prisma.hotelPnlMonthly.upsert({
        where: { hotelId_year_month: { hotelId, year, month } },
        update: {
          baseRevenue: payload.baseRevenue ?? undefined,
          payroll: payload.payroll ?? undefined,
          utilities: payload.utilities ?? undefined,
          repairsMaintenance: payload.repairsMaintenance ?? undefined,
          marketing: payload.marketing ?? undefined,
          otaCommissions: payload.otaCommissions ?? undefined,
          insurance: payload.insurance ?? undefined,
          propertyTax: payload.propertyTax ?? undefined,
          adminGeneral: payload.adminGeneral ?? undefined,
          cashExpenses: payload.cashExpenses ?? undefined,
          bankExpenses: payload.bankExpenses ?? undefined,
          other1Label: payload.other1Label ?? undefined,
          other1Amount: payload.other1Amount ?? undefined,
          other2Label: payload.other2Label ?? undefined,
          other2Amount: payload.other2Amount ?? undefined,
          other3Label: payload.other3Label ?? undefined,
          other3Amount: payload.other3Amount ?? undefined,
          other4Label: payload.other4Label ?? undefined,
          other4Amount: payload.other4Amount ?? undefined,
          other5Label: payload.other5Label ?? undefined,
          other5Amount: payload.other5Amount ?? undefined,
          other6Label: payload.other6Label ?? undefined,
          other6Amount: payload.other6Amount ?? undefined,
          other7Label: payload.other7Label ?? undefined,
          other7Amount: payload.other7Amount ?? undefined,
          other8Label: payload.other8Label ?? undefined,
          other8Amount: payload.other8Amount ?? undefined,
          notes: payload.notes ?? undefined,
        },
        create: {
          hotelId,
          year,
          month,
          baseRevenue: payload.baseRevenue ?? null,
          payroll: payload.payroll ?? 0,
          utilities: payload.utilities ?? 0,
          repairsMaintenance: payload.repairsMaintenance ?? 0,
          marketing: payload.marketing ?? 0,
          otaCommissions: payload.otaCommissions ?? 0,
          insurance: payload.insurance ?? 0,
          propertyTax: payload.propertyTax ?? 0,
          adminGeneral: payload.adminGeneral ?? 0,
          cashExpenses: payload.cashExpenses ?? 0,
          bankExpenses: payload.bankExpenses ?? 0,
          other1Label: payload.other1Label ?? null,
          other1Amount: payload.other1Amount ?? 0,
          other2Label: payload.other2Label ?? null,
          other2Amount: payload.other2Amount ?? 0,
          other3Label: payload.other3Label ?? null,
          other3Amount: payload.other3Amount ?? 0,
          other4Label: payload.other4Label ?? null,
          other4Amount: payload.other4Amount ?? 0,
          other5Label: payload.other5Label ?? null,
          other5Amount: payload.other5Amount ?? 0,
          other6Label: payload.other6Label ?? null,
          other6Amount: payload.other6Amount ?? 0,
          other7Label: payload.other7Label ?? null,
          other7Amount: payload.other7Amount ?? 0,
          other8Label: payload.other8Label ?? null,
          other8Amount: payload.other8Amount ?? 0,
          notes: payload.notes ?? null,
        },
      });

      const { totalExpenses, net, cashExpenses, bankExpenses } = computeMetrics(updated);

      logger.info('hotel_pnl_updated', {
        meta: { userId: user.id, hotelId, year, month },
      });

      return res.status(200).json({
        month,
        baseRevenue: updated.baseRevenue ? parseFloat(updated.baseRevenue.toString()) : null,
        payroll: parseFloat(updated.payroll.toString()),
        utilities: parseFloat(updated.utilities.toString()),
        repairsMaintenance: parseFloat(updated.repairsMaintenance.toString()),
        marketing: parseFloat(updated.marketing.toString()),
        otaCommissions: parseFloat(updated.otaCommissions.toString()),
        insurance: parseFloat(updated.insurance.toString()),
        propertyTax: parseFloat(updated.propertyTax.toString()),
        adminGeneral: parseFloat(updated.adminGeneral.toString()),
        cashExpenses,
        bankExpenses,
        other1Label: updated.other1Label,
        other1Amount: parseFloat(updated.other1Amount.toString()),
        other2Label: updated.other2Label,
        other2Amount: parseFloat(updated.other2Amount.toString()),
        other3Label: (updated as any).other3Label,
        other3Amount: parseFloat(((updated as any).other3Amount ?? 0).toString()),
        other4Label: (updated as any).other4Label,
        other4Amount: parseFloat(((updated as any).other4Amount ?? 0).toString()),
        other5Label: (updated as any).other5Label,
        other5Amount: parseFloat(((updated as any).other5Amount ?? 0).toString()),
        other6Label: (updated as any).other6Label,
        other6Amount: parseFloat(((updated as any).other6Amount ?? 0).toString()),
        other7Label: (updated as any).other7Label,
        other7Amount: parseFloat(((updated as any).other7Amount ?? 0).toString()),
        other8Label: (updated as any).other8Label,
        other8Amount: parseFloat(((updated as any).other8Amount ?? 0).toString()),
        notes: updated.notes,
        totalExpenses,
        net,
      });
    } catch (err: any) {
      logger.error('hotel_pnl_update_error', {
        meta: { userId: user.id, error: err.message },
      });
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request body', details: err.errors });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

export default handler;
