import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/hotels/pnl/monthly';

jest.mock('@/lib/apiAuth', () => ({ requireUser: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    hotelProperty: { findUnique: jest.fn() },
    hotelPnlMonthly: { findMany: jest.fn(), upsert: jest.fn() },
  },
}));
jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn() },
}));

const { requireUser } = jest.requireMock('@/lib/apiAuth');
const prisma = jest.requireMock('@/lib/prisma').default;

function createMockReqRes(method: string, query: any = {}, body: any = {}) {
  const req: Partial<NextApiRequest> = { method, query, headers: {}, body };
  const res: any = {};
  res.statusCode = 200;
  res.headers = {};
  res.setHeader = (k: string, v: string) => (res.headers[k] = v);
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.jsonData = null;
  res.json = (data: any) => { res.jsonData = data; return res; };
  return { req: req as NextApiRequest, res: res as NextApiResponse };
}

describe('/api/hotels/pnl/monthly', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('requires authentication', async () => {
      requireUser.mockResolvedValue(null);
      const { req, res } = createMockReqRes('GET', { hotelId: '1', year: '2025' });
      await handler(req, res);
      expect(res.statusCode).toBe(401);
    });

    it('denies non-allowed roles', async () => {
      requireUser.mockResolvedValue({ id: 1, role: 'EMPLOYEE' });
      const { req, res } = createMockReqRes('GET', { hotelId: '1', year: '2025' });
      await handler(req, res);
      expect(res.statusCode).toBe(403);
    });

    it('returns 404 if hotel not found', async () => {
      requireUser.mockResolvedValue({ id: 1, role: 'CEO' });
      prisma.hotelProperty.findUnique.mockResolvedValue(null);
      const { req, res } = createMockReqRes('GET', { hotelId: '999', year: '2025' });
      await handler(req, res);
      expect(res.statusCode).toBe(404);
    });

    it('returns 12 months with skeletons for missing', async () => {
      requireUser.mockResolvedValue({ id: 1, role: 'CEO' });
      prisma.hotelProperty.findUnique.mockResolvedValue({ id: 1, name: 'Test Hotel' });
      prisma.hotelPnlMonthly.findMany.mockResolvedValue([
        {
          month: 1,
          baseRevenue: 100000,
          payroll: 30000,
          utilities: 5000,
          repairsMaintenance: 2000,
          marketing: 1000,
          otaCommissions: 3000,
          insurance: 1000,
          propertyTax: 2000,
          adminGeneral: 1500,
          other1Label: null,
          other1Amount: 0,
          other2Label: null,
          other2Amount: 0,
          notes: 'Good month',
        },
      ]);

      const { req, res } = createMockReqRes('GET', { hotelId: '1', year: '2025' });
      await handler(req, res);

      expect(res.statusCode).toBe(200);
      const data = res.jsonData;
      expect(data.months).toHaveLength(12);
      expect(data.months[0].month).toBe(1);
      expect(data.months[1].month).toBe(2);
      expect(data.months[1].baseRevenue).toBeNull();
    });

    it('validates query parameters', async () => {
      requireUser.mockResolvedValue({ id: 1, role: 'CEO' });
      const { req, res } = createMockReqRes('GET', { hotelId: 'invalid', year: '2025' });
      await handler(req, res);
      expect(res.statusCode).toBe(400);
    });
  });

  describe('PUT', () => {
    it('requires authentication', async () => {
      requireUser.mockResolvedValue(null);
      const { req, res } = createMockReqRes('PUT', {}, { hotelId: 1, year: 2025, month: 1 });
      await handler(req, res);
      expect(res.statusCode).toBe(401);
    });

    it('denies non-allowed roles', async () => {
      requireUser.mockResolvedValue({ id: 1, role: 'CSR' });
      const { req, res } = createMockReqRes('PUT', {}, { hotelId: 1, year: 2025, month: 1 });
      await handler(req, res);
      expect(res.statusCode).toBe(403);
    });

    it('returns 404 if hotel not found', async () => {
      requireUser.mockResolvedValue({ id: 1, role: 'CEO' });
      prisma.hotelProperty.findUnique.mockResolvedValue(null);
      const { req, res } = createMockReqRes('PUT', {}, { hotelId: 999, year: 2025, month: 1 });
      await handler(req, res);
      expect(res.statusCode).toBe(404);
    });

    it('creates and updates P&L record', async () => {
      requireUser.mockResolvedValue({ id: 1, role: 'CEO' });
      prisma.hotelProperty.findUnique.mockResolvedValue({ id: 1, name: 'Test Hotel' });
      prisma.hotelPnlMonthly.upsert.mockResolvedValue({
        month: 1,
        baseRevenue: 100000,
        payroll: 30000,
        utilities: 5000,
        repairsMaintenance: 2000,
        marketing: 1000,
        otaCommissions: 3000,
        insurance: 1000,
        propertyTax: 2000,
        adminGeneral: 1500,
        other1Label: null,
        other1Amount: 0,
        other2Label: null,
        other2Amount: 0,
        notes: null,
      });

      const { req, res } = createMockReqRes('PUT', {}, {
        hotelId: 1,
        year: 2025,
        month: 1,
        baseRevenue: 100000,
        payroll: 30000,
        utilities: 5000,
        repairsMaintenance: 2000,
        marketing: 1000,
        otaCommissions: 3000,
        insurance: 1000,
        propertyTax: 2000,
        adminGeneral: 1500,
      });
      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.month).toBe(1);
      expect(res.jsonData.totalExpenses).toBe(45500);
    });

    it('validates request body', async () => {
      requireUser.mockResolvedValue({ id: 1, role: 'CEO' });
      const { req, res } = createMockReqRes('PUT', {}, {
        hotelId: 1,
        year: 2025,
        month: 13, // Invalid
      });
      await handler(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('allows FINANCE role', async () => {
      requireUser.mockResolvedValue({ id: 1, role: 'FINANCE' });
      prisma.hotelProperty.findUnique.mockResolvedValue({ id: 1, name: 'Test Hotel' });
      prisma.hotelPnlMonthly.upsert.mockResolvedValue({
        month: 1,
        baseRevenue: 100000,
        payroll: 30000,
        utilities: 5000,
        repairsMaintenance: 2000,
        marketing: 1000,
        otaCommissions: 3000,
        insurance: 1000,
        propertyTax: 2000,
        adminGeneral: 1500,
        other1Label: null,
        other1Amount: 0,
        other2Label: null,
        other2Amount: 0,
        notes: null,
      });

      const { req, res } = createMockReqRes('PUT', {}, {
        hotelId: 1,
        year: 2025,
        month: 1,
        baseRevenue: 100000,
        payroll: 30000,
        utilities: 5000,
        repairsMaintenance: 2000,
        marketing: 1000,
        otaCommissions: 3000,
        insurance: 1000,
        propertyTax: 2000,
        adminGeneral: 1500,
      });
      await handler(req, res);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('Invalid method', () => {
    it('returns 405 for unsupported methods', async () => {
      requireUser.mockResolvedValue({ id: 1, role: 'CEO' });
      const { req, res } = createMockReqRes('DELETE');
      await handler(req, res);
      expect(res.statusCode).toBe(405);
    });
  });
});
