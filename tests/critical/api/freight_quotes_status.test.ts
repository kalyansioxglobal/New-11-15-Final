import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/freight/quotes/[id]/status';

jest.mock('@/lib/apiAuth', () => ({ requireUser: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    freightQuote: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock('@/lib/permissions', () => ({
  can: jest.fn().mockReturnValue(true),
}));

const { requireUser } = jest.requireMock('@/lib/apiAuth');
const prisma = jest.requireMock('@/lib/prisma').default;
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

describe('PATCH /api/freight/quotes/[id]/status', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should reject non-PATCH requests', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR', ventureIds: [1] });

    const { req, res } = createMockReqRes('GET', {}, { id: '1' });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(405);
    expect(res.jsonData).toHaveProperty('error', 'Method not allowed');
  });

  it('should return 404 when quote not found', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR', ventureIds: [1] });
    (prisma.freightQuote.findUnique as jest.Mock).mockResolvedValue(null);

    const { req, res } = createMockReqRes('PATCH', { status: 'SENT' }, { id: '999' });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(404);
    expect(res.jsonData).toHaveProperty('error', 'Quote not found');
  });

  it('should reject invalid status transitions', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR', ventureIds: [1] });
    (can as jest.Mock).mockReturnValue(true);
    (prisma.freightQuote.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      status: 'BOOKED',
      ventureId: 1,
    });

    const { req, res } = createMockReqRes('PATCH', { status: 'DRAFT' }, { id: '1' });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(400);
    expect((res.jsonData as Record<string, unknown>).error).toContain('Invalid status transition');
  });

  it('should allow valid status transition DRAFT -> SENT', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR', ventureIds: [1] });
    (can as jest.Mock).mockReturnValue(true);
    (prisma.freightQuote.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      status: 'DRAFT',
      ventureId: 1,
      sentAt: null,
      expiresAt: null,
    });
    (prisma.freightQuote.update as jest.Mock).mockResolvedValue({
      id: 1,
      status: 'SENT',
      sentAt: new Date(),
      customer: { id: 1, name: 'Test' },
      shipper: null,
      salesperson: { id: 1, fullName: 'User' },
    });

    const { req, res } = createMockReqRes('PATCH', { status: 'SENT' }, { id: '1' });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toHaveProperty('quote');
    expect(prisma.freightQuote.update).toHaveBeenCalled();
  });

  it('should allow ACCEPTED transition from SENT', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR', ventureIds: [1] });
    (can as jest.Mock).mockReturnValue(true);
    (prisma.freightQuote.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      status: 'SENT',
      ventureId: 1,
    });
    (prisma.freightQuote.update as jest.Mock).mockResolvedValue({
      id: 1,
      status: 'ACCEPTED',
      respondedAt: new Date(),
      customer: { id: 1, name: 'Test' },
      shipper: null,
      salesperson: { id: 1, fullName: 'User' },
    });

    const { req, res } = createMockReqRes('PATCH', { status: 'ACCEPTED' }, { id: '1' });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(200);
    expect(prisma.freightQuote.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'ACCEPTED',
        }),
      })
    );
  });

  it('should allow REJECTED transition from SENT', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR', ventureIds: [1] });
    (can as jest.Mock).mockReturnValue(true);
    (prisma.freightQuote.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      status: 'SENT',
      ventureId: 1,
    });
    (prisma.freightQuote.update as jest.Mock).mockResolvedValue({
      id: 1,
      status: 'REJECTED',
      respondedAt: new Date(),
      customer: { id: 1, name: 'Test' },
      shipper: null,
      salesperson: { id: 1, fullName: 'User' },
    });

    const { req, res } = createMockReqRes('PATCH', { status: 'REJECTED', rejectionReasonText: 'Too expensive' }, { id: '1' });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(200);
    expect(prisma.freightQuote.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'REJECTED',
          rejectionReasonText: 'Too expensive',
        }),
      })
    );
  });

  it('should require status field', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR', ventureIds: [1] });

    const { req, res } = createMockReqRes('PATCH', {}, { id: '1' });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData).toHaveProperty('error', 'status is required');
  });

  it('should allow COUNTERED transition from SENT with counterOfferRate', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR', ventureIds: [1] });
    (can as jest.Mock).mockReturnValue(true);
    (prisma.freightQuote.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      status: 'SENT',
      ventureId: 1,
    });
    (prisma.freightQuote.update as jest.Mock).mockResolvedValue({
      id: 1,
      status: 'COUNTERED',
      respondedAt: new Date(),
      counterOfferRate: 1200,
      customer: { id: 1, name: 'Test' },
      shipper: null,
      salesperson: { id: 1, fullName: 'User' },
    });

    const { req, res } = createMockReqRes('PATCH', { status: 'COUNTERED', counterOfferRate: 1200 }, { id: '1' });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(200);
    expect(prisma.freightQuote.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'COUNTERED',
          counterOfferRate: 1200,
        }),
      })
    );
  });

  it('should allow NO_RESPONSE transition from SENT', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR', ventureIds: [1] });
    (can as jest.Mock).mockReturnValue(true);
    (prisma.freightQuote.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      status: 'SENT',
      ventureId: 1,
    });
    (prisma.freightQuote.update as jest.Mock).mockResolvedValue({
      id: 1,
      status: 'NO_RESPONSE',
      respondedAt: new Date(),
      customer: { id: 1, name: 'Test' },
      shipper: null,
      salesperson: { id: 1, fullName: 'User' },
    });

    const { req, res } = createMockReqRes('PATCH', { status: 'NO_RESPONSE' }, { id: '1' });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(200);
    expect(prisma.freightQuote.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'NO_RESPONSE',
        }),
      })
    );
  });

  it('should allow BOOKED transition from ACCEPTED with bookedAt timestamp', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR', ventureIds: [1] });
    (can as jest.Mock).mockReturnValue(true);
    (prisma.freightQuote.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      status: 'ACCEPTED',
      ventureId: 1,
    });
    const bookedAt = new Date();
    (prisma.freightQuote.update as jest.Mock).mockResolvedValue({
      id: 1,
      status: 'BOOKED',
      bookedAt,
      customer: { id: 1, name: 'Test' },
      shipper: null,
      salesperson: { id: 1, fullName: 'User' },
    });

    const { req, res } = createMockReqRes('PATCH', { status: 'BOOKED' }, { id: '1' });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(200);
    expect(prisma.freightQuote.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'BOOKED',
          bookedAt: expect.any(Date),
        }),
      })
    );
  });

  it('should allow REJECTED transition with rejectionReasonCode', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR', ventureIds: [1] });
    (can as jest.Mock).mockReturnValue(true);
    (prisma.freightQuote.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      status: 'SENT',
      ventureId: 1,
    });
    (prisma.freightQuote.update as jest.Mock).mockResolvedValue({
      id: 1,
      status: 'REJECTED',
      respondedAt: new Date(),
      rejectionReasonCode: 'PRICE',
      rejectionReasonText: 'Rate too high',
      customer: { id: 1, name: 'Test' },
      shipper: null,
      salesperson: { id: 1, fullName: 'User' },
    });

    const { req, res } = createMockReqRes('PATCH', { 
      status: 'REJECTED', 
      rejectionReasonCode: 'PRICE',
      rejectionReasonText: 'Rate too high' 
    }, { id: '1' });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(200);
    expect(prisma.freightQuote.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'REJECTED',
          rejectionReasonCode: 'PRICE',
          rejectionReasonText: 'Rate too high',
        }),
      })
    );
  });

  it('should set sentAt timestamp on first SENT transition', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR', ventureIds: [1] });
    (can as jest.Mock).mockReturnValue(true);
    (prisma.freightQuote.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      status: 'DRAFT',
      ventureId: 1,
      sentAt: null,
      expiresAt: null,
    });
    (prisma.freightQuote.update as jest.Mock).mockResolvedValue({
      id: 1,
      status: 'SENT',
      sentAt: new Date(),
      expiresAt: new Date(),
      customer: { id: 1, name: 'Test' },
      shipper: null,
      salesperson: { id: 1, fullName: 'User' },
    });

    const { req, res } = createMockReqRes('PATCH', { status: 'SENT' }, { id: '1' });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(200);
    expect(prisma.freightQuote.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'SENT',
          sentAt: expect.any(Date),
          expiresAt: expect.any(Date),
        }),
      })
    );
  });

  it('should set respondedAt timestamp on ACCEPTED transition', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR', ventureIds: [1] });
    (can as jest.Mock).mockReturnValue(true);
    (prisma.freightQuote.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      status: 'SENT',
      ventureId: 1,
    });
    (prisma.freightQuote.update as jest.Mock).mockResolvedValue({
      id: 1,
      status: 'ACCEPTED',
      respondedAt: new Date(),
      customer: { id: 1, name: 'Test' },
      shipper: null,
      salesperson: { id: 1, fullName: 'User' },
    });

    const { req, res } = createMockReqRes('PATCH', { status: 'ACCEPTED' }, { id: '1' });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(200);
    expect(prisma.freightQuote.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'ACCEPTED',
          respondedAt: expect.any(Date),
        }),
      })
    );
  });
});
