import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/freight/dormant-customers';

jest.mock('@/lib/apiAuth', () => ({ requireUser: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: {
    customer: {
      findMany: jest.fn(),
      count: jest.fn(),
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

function createMockReqRes(method: string, query: Record<string, string> = {}) {
  const req: Partial<NextApiRequest> = { method, body: {}, query, headers: {} };
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

describe('GET /api/freight/dormant-customers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should reject non-GET requests', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR', ventureIds: [1] });

    const { req, res } = createMockReqRes('POST');
    req.method = 'POST';
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(405);
    expect(res.jsonData).toHaveProperty('error', 'Method not allowed');
  });

  it('should require ventureId', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR', ventureIds: [] });

    const { req, res } = createMockReqRes('GET', {});
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData).toHaveProperty('error', 'ventureId is required');
  });

  it('should return 403 when user lacks permission', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR', ventureIds: [1] });
    (can as jest.Mock).mockReturnValue(false);

    const { req, res } = createMockReqRes('GET', { ventureId: '1' });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData).toHaveProperty('error', 'Not allowed to view this venture');
  });

  it('should return dormant customers with default dormantDays=14', async () => {
    const mockUser = { id: 1, role: 'CSR', ventureIds: [1] };
    const mockCustomers = [
      {
        id: 1,
        name: 'Test Customer',
        email: 'test@example.com',
        lastTouchAt: null as Date | null,
        lastLoadDate: new Date('2023-01-01'),
        churnStatus: null as string | null,
        churnRiskScore: null as number | null,
        salesRep: null as { id: number; fullName: string } | null,
        csr: null as { id: number; fullName: string } | null,
        lastTouchBy: null as { id: number; fullName: string } | null,
        _count: { loads: 5, touches: 0 },
      },
    ];

    (requireUser as jest.Mock).mockResolvedValue(mockUser);
    (can as jest.Mock).mockReturnValue(true);
    (prismaMock.prisma.customer.findMany as jest.Mock).mockResolvedValue(mockCustomers);
    (prismaMock.prisma.customer.count as jest.Mock).mockResolvedValue(1);

    const { req, res } = createMockReqRes('GET', { ventureId: '1' });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toHaveProperty('customers');
    expect(res.jsonData).toHaveProperty('total', 1);
    expect(res.jsonData).toHaveProperty('dormantDays', 14);
    expect((res.jsonData as any).customers[0]).toHaveProperty('daysSinceTouch', null);
    expect((res.jsonData as any).customers[0]).toHaveProperty('totalLoads', 5);
  });

  it('should respect custom dormantDays parameter', async () => {
    const mockUser = { id: 1, role: 'CSR', ventureIds: [1] };

    (requireUser as jest.Mock).mockResolvedValue(mockUser);
    (can as jest.Mock).mockReturnValue(true);
    (prismaMock.prisma.customer.findMany as jest.Mock).mockResolvedValue([]);
    (prismaMock.prisma.customer.count as jest.Mock).mockResolvedValue(0);

    const { req, res } = createMockReqRes('GET', { ventureId: '1', dormantDays: '30' });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toHaveProperty('dormantDays', 30);
  });

  it('should calculate daysSinceTouch correctly', async () => {
    const mockUser = { id: 1, role: 'CSR', ventureIds: [1] };
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const mockCustomers = [
      {
        id: 1,
        name: 'Test Customer',
        lastTouchAt: tenDaysAgo,
        lastLoadDate: null as Date | null,
        churnStatus: null as string | null,
        churnRiskScore: null as number | null,
        salesRep: null as { id: number; fullName: string } | null,
        csr: null as { id: number; fullName: string } | null,
        lastTouchBy: null as { id: number; fullName: string } | null,
        _count: { loads: 0, touches: 2 },
      },
    ];

    (requireUser as jest.Mock).mockResolvedValue(mockUser);
    (can as jest.Mock).mockReturnValue(true);
    (prismaMock.prisma.customer.findMany as jest.Mock).mockResolvedValue(mockCustomers);
    (prismaMock.prisma.customer.count as jest.Mock).mockResolvedValue(1);

    const { req, res } = createMockReqRes('GET', { ventureId: '1' });
    await handler(req as NextApiRequest, res as unknown as NextApiResponse);

    expect(res.statusCode).toBe(200);
    expect((res.jsonData as any).customers[0].daysSinceTouch).toBe(10);
  });
});
