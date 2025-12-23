import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/carriers/[id]/fmcsa-refresh';

jest.mock('@/lib/apiAuth', () => ({ requireUser: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    carrier: { findUnique: jest.fn(), update: jest.fn() },
  },
}));
jest.mock('@/lib/integrations/fmcsaClient', () => ({
  fetchCarrierFromFMCSA: jest.fn(),
}));
jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn() },
}));

const { requireUser } = jest.requireMock('@/lib/apiAuth');
const prisma = jest.requireMock('@/lib/prisma').default;
const { fetchCarrierFromFMCSA } = jest.requireMock('@/lib/integrations/fmcsaClient');

function createMockReqRes(method: string, query: any = {}) {
  const req: Partial<NextApiRequest> = { method, query, headers: {} };
  const res: any = {};
  res.statusCode = 200;
  res.headers = {};
  res.setHeader = (k: string, v: string) => (res.headers[k] = v);
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.jsonData = null;
  res.json = (d: any) => { res.jsonData = d; return res; };
  return { req, res };
}

describe('POST /api/carriers/[id]/fmcsa-refresh', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requires admin role', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR' });
    const { req, res } = createMockReqRes('POST', { id: '5' });
    // @ts-ignore
    await handler(req, res);
    expect(res.statusCode).toBe(403);
  });

  it('returns 404 when carrier not found', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'ADMIN' });
    (prisma.carrier.findUnique as jest.Mock).mockResolvedValue(null);
    const { req, res } = createMockReqRes('POST', { id: '999' });
    // @ts-ignore
    await handler(req, res);
    expect(res.statusCode).toBe(404);
  });

  it('returns 400 when carrier has no MC number', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'ADMIN' });
    (prisma.carrier.findUnique as jest.Mock).mockResolvedValue({ id: 5, name: 'C5', mcNumber: null });
    const { req, res } = createMockReqRes('POST', { id: '5' });
    // @ts-ignore
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  it('updates carrier with FMCSA data when fetch succeeds', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'ADMIN' });
    (prisma.carrier.findUnique as jest.Mock).mockResolvedValue({ id: 5, name: 'C5', mcNumber: 'MC12345' });
    (fetchCarrierFromFMCSA as jest.Mock).mockResolvedValue({
      mcNumber: 'MC12345',
      status: 'ACTIVE',
      authorized: true,
      safetyRating: 'SATISFACTORY',
      lastUpdated: new Date(),
    });
    (prisma.carrier.update as jest.Mock).mockResolvedValue({
      id: 5,
      name: 'C5',
      fmcsaStatus: 'ACTIVE',
      fmcsaAuthorized: true,
      fmcsaLastSyncAt: new Date(),
    });

    const { req, res } = createMockReqRes('POST', { id: '5' });
    // @ts-ignore
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData.success).toBe(true);
    expect(res.jsonData.carrier).toHaveProperty('fmcsaAuthorized', true);
  });
});
