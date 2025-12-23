import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/logistics/customers/[id]/touches/create';

jest.mock('@/lib/apiAuth', () => ({ requireUser: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: {
    customer: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    customerTouch: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));
jest.mock('@/lib/scope', () => ({
  canViewCustomer: jest.fn().mockReturnValue(true),
}));
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
}));
jest.mock('@/lib/requestId', () => ({
  generateRequestId: jest.fn().mockReturnValue('test-request-id'),
}));

const { requireUser } = jest.requireMock('@/lib/apiAuth');
const prismaMock = jest.requireMock('@/lib/prisma');
const { canViewCustomer } = jest.requireMock('@/lib/scope');

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

describe('POST /api/logistics/customers/[id]/touches/create', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should reject non-POST requests', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR', ventureIds: [1] });

    const { req, res } = createMockReqRes('GET', {}, { id: '123' });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(405);
    expect(res.jsonData).toHaveProperty('error', 'Method not allowed');
  });

  it('should return 400 for invalid customer id', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR', ventureIds: [1] });

    const { req, res } = createMockReqRes('POST', { channel: 'CALL' }, { id: 'invalid' });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData).toHaveProperty('error', 'Invalid customer id');
  });

  it('should return 404 when customer not found', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR', ventureIds: [1] });
    (prismaMock.prisma.customer.findUnique as jest.Mock).mockResolvedValue(null);

    const { req, res } = createMockReqRes('POST', { channel: 'CALL' }, { id: '999' });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(404);
    expect(res.jsonData).toHaveProperty('error', 'Customer not found');
  });

  it('should return 403 when user lacks permission', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR', ventureIds: [1] });
    (prismaMock.prisma.customer.findUnique as jest.Mock).mockResolvedValue({ id: 123, ventureId: 1 });
    (canViewCustomer as jest.Mock).mockReturnValue(false);

    const { req, res } = createMockReqRes('POST', { channel: 'CALL' }, { id: '123' });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData).toHaveProperty('error', 'FORBIDDEN');
  });

  it('should require channel field', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR', ventureIds: [1] });
    (prismaMock.prisma.customer.findUnique as jest.Mock).mockResolvedValue({ id: 123, ventureId: 1 });
    (canViewCustomer as jest.Mock).mockReturnValue(true);

    const { req, res } = createMockReqRes('POST', {}, { id: '123' });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData).toHaveProperty('error', 'channel is required');
  });

  it('should reject invalid channel', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR', ventureIds: [1] });
    (prismaMock.prisma.customer.findUnique as jest.Mock).mockResolvedValue({ id: 123, ventureId: 1 });
    (canViewCustomer as jest.Mock).mockReturnValue(true);

    const { req, res } = createMockReqRes('POST', { channel: 'INVALID' }, { id: '123' });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData).toHaveProperty('error');
  });

  it('should create touch and update customer lastTouchAt', async () => {
    const mockUser = { id: 1, role: 'CSR', ventureIds: [1] };
    const mockCustomer = { id: 123, ventureId: 1, name: 'Test Customer' };
    const mockTouch = { id: 1, customerId: 123, channel: 'CALL', userId: 1, notes: 'Called customer', createdAt: new Date(), user: { id: 1, fullName: 'Test User', email: 'test@test.com' } };

    (requireUser as jest.Mock).mockResolvedValue(mockUser);
    (prismaMock.prisma.customer.findUnique as jest.Mock).mockResolvedValue(mockCustomer);
    (canViewCustomer as jest.Mock).mockReturnValue(true);
    (prismaMock.prisma.$transaction as jest.Mock).mockResolvedValue([mockTouch]);

    const { req, res } = createMockReqRes('POST', { channel: 'CALL', notes: 'Called customer' }, { id: '123' });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(201);
    expect(prismaMock.prisma.$transaction).toHaveBeenCalled();
  });
});
