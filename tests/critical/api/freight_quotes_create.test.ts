import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/freight/quotes/create';

jest.mock('@/lib/apiAuth', () => ({ requireUser: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    customer: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    logisticsShipper: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    freightQuote: {
      create: jest.fn(),
    },
  },
  prisma: {
    customer: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    logisticsShipper: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    freightQuote: {
      create: jest.fn(),
    },
  },
}));
jest.mock('@/lib/permissions', () => ({
  can: jest.fn().mockReturnValue(true),
}));

const { requireUser } = jest.requireMock('@/lib/apiAuth');
const prismaMock = jest.requireMock('@/lib/prisma');
const { can } = jest.requireMock('@/lib/permissions');

function createMockReqRes(method: string, body: Record<string, unknown> = {}, query: Record<string, string> = {}) {
  const req: Partial<NextApiRequest> = { method, body, query, headers: {} };
  const res: { statusCode: number; headers: Record<string, string>; setHeader: (k: string, v: string) => void; status: (c: number) => unknown; jsonData: unknown; json: (d: unknown) => void } = {
    statusCode: 200,
    headers: {},
    setHeader: function(k: string, v: string) { this.headers[k] = v; },
    status: function(c: number) { this.statusCode = c; return this; },
    jsonData: null,
    json: function(d: unknown) { this.jsonData = d; },
  };
  return { req, res };
}

describe('POST /api/freight/quotes/create', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should reject non-POST requests', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR', ventureIds: [1] });

    const { req, res } = createMockReqRes('GET', {});
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(405);
    expect(res.jsonData).toHaveProperty('error', 'Method not allowed');
  });

  it('should require ventureId', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR', ventureIds: [] });

    const { req, res } = createMockReqRes('POST', { customerData: { name: 'Test' } });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData).toHaveProperty('error', 'ventureId is required');
  });

  it('should reject when user lacks permission', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR', ventureIds: [1] });
    (can as jest.Mock).mockReturnValue(false);

    const { req, res } = createMockReqRes('POST', { ventureId: 1, customerData: { name: 'Test' } });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData).toHaveProperty('error', 'FORBIDDEN');
  });

  it('should return 404 when customer not found', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR', ventureIds: [1] });
    (can as jest.Mock).mockReturnValue(true);
    (prismaMock.default.customer.findUnique as jest.Mock).mockResolvedValue(null);

    const { req, res } = createMockReqRes('POST', { ventureId: 1, customerId: 999 });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(404);
    expect(res.jsonData).toHaveProperty('error', 'Customer not found');
  });

  it('should require customer name when creating new customer', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR', ventureIds: [1] });
    (can as jest.Mock).mockReturnValue(true);

    const { req, res } = createMockReqRes('POST', { ventureId: 1, customerData: {} });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData).toHaveProperty('error', 'Customer name is required');
  });

  it('should require either customerId or customerData', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR', ventureIds: [1] });
    (can as jest.Mock).mockReturnValue(true);

    const { req, res } = createMockReqRes('POST', { ventureId: 1 });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData).toHaveProperty('error', 'Either customerId or customerData is required');
  });

  it('should create quote with existing customer', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR', ventureIds: [1] });
    (can as jest.Mock).mockReturnValue(true);
    (prismaMock.default.customer.findUnique as jest.Mock).mockResolvedValue({ id: 5, name: 'Existing' });
    (prismaMock.prisma.logisticsShipper.findFirst as jest.Mock).mockResolvedValue({ id: 10, name: 'Default', isDefault: true });
    (prismaMock.default.freightQuote.create as jest.Mock).mockResolvedValue({
      id: 1,
      customerId: 5,
      shipperId: 10,
      status: 'DRAFT',
      customer: { id: 5, name: 'Existing', email: null },
      shipper: { id: 10, name: 'Default' },
      salesperson: { id: 1, fullName: 'Test User', email: 'test@test.com' },
    });

    const { req, res } = createMockReqRes('POST', {
      ventureId: 1,
      customerId: 5,
      sellRate: 1000,
      buyRateEstimate: 800,
    });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(201);
    expect(res.jsonData).toHaveProperty('quote');
    expect(prismaMock.default.freightQuote.create).toHaveBeenCalled();
  });

  it('should return needsConfirmation when strong duplicate found', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR', ventureIds: [1] });
    (can as jest.Mock).mockReturnValue(true);
    (prismaMock.prisma.customer.findFirst as jest.Mock).mockResolvedValue({
      id: 99,
      name: 'Duplicate Co',
      email: 'dup@dup.com',
      phone: '5555555555',
      tmsCustomerCode: 'TMS99',
      address: '123 Main St',
    });
    (prismaMock.prisma.customer.findMany as jest.Mock).mockResolvedValue([]);

    const { req, res } = createMockReqRes('POST', {
      ventureId: 1,
      customerData: {
        name: 'Duplicate Co',
        tmsCustomerCode: 'TMS99',
      },
    });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toHaveProperty('needsConfirmation', true);
    expect(res.jsonData).toHaveProperty('duplicateCandidates');
  });
});
