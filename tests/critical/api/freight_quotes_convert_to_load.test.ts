import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/freight/quotes/[id]/convert-to-load';

jest.mock('@/lib/apiAuth', () => ({ requireUser: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    freightQuote: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    load: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));
jest.mock('@/lib/permissions', () => ({
  can: jest.fn().mockReturnValue(true),
}));
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));
jest.mock('@/lib/requestId', () => ({
  generateRequestId: jest.fn().mockReturnValue('test-request-id'),
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

describe('POST /api/freight/quotes/[id]/convert-to-load', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should reject non-POST requests', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR', ventureIds: [1] });

    const { req, res } = createMockReqRes('GET', {}, { id: '123' });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(405);
    expect(res.jsonData).toHaveProperty('error', 'Method not allowed');
  });

  it('should return 400 for invalid quote id', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR', ventureIds: [1] });

    const { req, res } = createMockReqRes('POST', {}, { id: 'invalid' });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData).toHaveProperty('error', 'Invalid quote id');
  });

  it('should return 404 when quote not found', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR', ventureIds: [1] });
    (prismaMock.default.freightQuote.findUnique as jest.Mock).mockResolvedValue(null);

    const { req, res } = createMockReqRes('POST', {}, { id: '999' });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(404);
    expect(res.jsonData).toHaveProperty('error', 'Quote not found');
  });

  it('should return 403 when user lacks permission', async () => {
    const mockQuote = { id: 123, ventureId: 1, status: 'ACCEPTED', loadId: null as number | null };
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR', ventureIds: [1] });
    (prismaMock.default.freightQuote.findUnique as jest.Mock).mockResolvedValue(mockQuote);
    (can as jest.Mock).mockReturnValue(false);

    const { req, res } = createMockReqRes('POST', {}, { id: '123' });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData).toHaveProperty('error', 'FORBIDDEN');
  });

  it('should be idempotent - return existing load if already converted', async () => {
    const mockQuote = { 
      id: 123, 
      ventureId: 1, 
      status: 'BOOKED', 
      loadId: 456,
      customer: { id: 1, name: 'Test' },
      shipper: null as { id: number; name: string } | null,
    };
    const mockLoad = { id: 456, tmsLoadId: 'TMS-123' };

    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR', ventureIds: [1] });
    (prismaMock.default.freightQuote.findUnique as jest.Mock).mockResolvedValue(mockQuote);
    (can as jest.Mock).mockReturnValue(true);
    (prismaMock.default.load.findUnique as jest.Mock).mockResolvedValue(mockLoad);

    const { req, res } = createMockReqRes('POST', {}, { id: '123' });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toHaveProperty('alreadyConverted', true);
    expect(res.jsonData).toHaveProperty('load', mockLoad);
    expect(res.jsonData).toHaveProperty('message', 'Quote already converted to load');
    expect(prismaMock.default.load.create).not.toHaveBeenCalled();
  });

  it('should reject conversion for non-ACCEPTED/BOOKED status', async () => {
    const mockQuote = { 
      id: 123, 
      ventureId: 1, 
      status: 'DRAFT', 
      loadId: null as number | null,
      customer: { id: 1, name: 'Test' },
      shipper: null as { id: number; name: string } | null,
    };

    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR', ventureIds: [1] });
    (prismaMock.default.freightQuote.findUnique as jest.Mock).mockResolvedValue(mockQuote);
    (can as jest.Mock).mockReturnValue(true);

    const { req, res } = createMockReqRes('POST', {}, { id: '123' });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(400);
    expect((res.jsonData as any).error).toContain('Cannot convert quote with status DRAFT');
  });

  it('should successfully convert ACCEPTED quote to load', async () => {
    const mockQuote = { 
      id: 123, 
      ventureId: 1, 
      customerId: 10,
      shipperId: 20,
      status: 'ACCEPTED', 
      loadId: null as number | null,
      sellRate: 1500,
      buyRateEstimate: 1200,
      marginEstimate: 300,
      origin: 'Chicago, IL',
      destination: 'Dallas, TX',
      equipmentType: 'DRY_VAN',
      notes: 'Test notes',
      customer: { id: 10, name: 'Test Customer' },
      shipper: { id: 20, name: 'Test Shipper' },
    };
    const mockLoad = { id: 789, tmsLoadId: 'NEW-TMS-123' };
    const mockUpdatedQuote = { ...mockQuote, status: 'BOOKED', loadId: 789, bookedAt: new Date() };

    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR', ventureIds: [1] });
    (prismaMock.default.freightQuote.findUnique as jest.Mock).mockResolvedValue(mockQuote);
    (can as jest.Mock).mockReturnValue(true);
    (prismaMock.default.load.create as jest.Mock).mockResolvedValue(mockLoad);
    (prismaMock.default.freightQuote.update as jest.Mock).mockResolvedValue(mockUpdatedQuote);

    const { req, res } = createMockReqRes('POST', { tmsLoadId: 'NEW-TMS-123', pickupDate: '2024-01-15' }, { id: '123' });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(201);
    expect(res.jsonData).toHaveProperty('alreadyConverted', false);
    expect(res.jsonData).toHaveProperty('load', mockLoad);
    expect(res.jsonData).toHaveProperty('message', 'Quote successfully converted to load');
    expect(prismaMock.default.load.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ventureId: 1,
          customerId: 10,
          billAmount: 1500,
          tmsLoadId: 'NEW-TMS-123',
        }),
      })
    );
    expect(prismaMock.default.freightQuote.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 123 },
        data: expect.objectContaining({
          status: 'BOOKED',
          loadId: 789,
        }),
      })
    );
  });
});
