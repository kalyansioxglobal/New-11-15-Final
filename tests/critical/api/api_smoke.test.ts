import type { NextApiRequest, NextApiResponse } from 'next';
import carrierPreferredHandler from '@/pages/api/freight/carriers/[carrierId]/preferred-lanes';
import shipperPreferredHandler from '@/pages/api/freight/shippers/[shipperId]/preferred-lanes';
import aiTemplatesIndexHandler from '@/pages/api/admin/ai-templates/index';
import aiTemplatesIdHandler from '@/pages/api/admin/ai-templates/[id]';
import hotelPnlHandler from '@/pages/api/hotels/pnl/monthly';
import fmcsaLookupHandler from '@/pages/api/logistics/fmcsa-carrier-lookup';
import logisticsCarriersHandler from '@/pages/api/logistics/carriers';
import carrierRefreshHandler from '@/pages/api/carriers/[id]/fmcsa-refresh';
import freightLoadHandler from '@/pages/api/freight/loads/[id]';
import freightLoadMatchesHandler from '@/pages/api/freight/loads/[id]/matches';

jest.mock('@/lib/apiAuth', () => ({
  requireUser: jest.fn(),
  requireAdminUser: jest.fn(),
}));

function buildPrismaMock() {
  return {
  carrierPreferredLane: {
    findMany: jest.fn(async () => []),
    create: jest.fn(async (data) => ({ id: 1, ...data })),
  },
  shipperPreferredLane: {
    findMany: jest.fn(async () => []),
    create: jest.fn(async (data) => ({ id: 1, ...data })),
  },
  aiDraftTemplate: {
    findMany: jest.fn(async () => []),
    count: jest.fn(async () => 0),
    create: jest.fn(async (data) => ({ id: 1, ...data })),
    findUnique: jest.fn(async () => ({ id: 1, ventureId: 1 })),
    update: jest.fn(async (data) => ({ id: 1, ...data })),
    delete: jest.fn(async () => ({})),
  },
  hotelProperty: {
    findUnique: jest.fn(async () => ({ id: 1 })),
  },
  hotelPnlMonthly: {
    findMany: jest.fn(async () => []),
    upsert: jest.fn(async (data) => ({ id: 1, ...data })),
  },
  carrier: {
    count: jest.fn(async () => 0),
    findMany: jest.fn(async () => []),
    findUnique: jest.fn(async (args: any) => {
      if (args?.where?.id) return { id: args.where.id, name: 'Carrier', mcNumber: '123' } as any;
      return null;
    }),
    create: jest.fn(async (data) => ({ id: 1, ...data })),
    update: jest.fn(async () => ({ id: 1, name: 'Carrier', fmcsaStatus: 'ACTIVE', fmcsaAuthorized: true, fmcsaLastSyncAt: new Date() })),
  },
  load: {
    findUnique: jest.fn(async () => ({ id: 1, ventureId: 1, venture: {}, office: {}, carrier: {}, createdBy: {}, contacts: [] })),
    update: jest.fn(async () => ({ id: 1 })),
    delete: jest.fn(async () => ({})),
  },
  };
}

jest.mock('@/lib/prisma', () => {
  const prismaMock = buildPrismaMock();
  return { __esModule: true, default: prismaMock, prisma: prismaMock };
});

jest.mock('@/lib/permissions', () => ({ can: jest.fn(() => true) }));
jest.mock('@/lib/logger', () => {
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
  return { __esModule: true, default: logger, logger };
});
jest.mock('@/lib/requestId', () => ({ generateRequestId: () => 'req-id' }));
jest.mock('@/lib/audit', () => ({ logAuditEvent: jest.fn() }));
jest.mock('@/lib/rateLimit', () => ({ rateLimit: jest.fn(async () => true) }));
jest.mock('@/lib/fmcsa', () => ({ lookupCarrierFromFmcsa: jest.fn(async () => ({ normalizedStatus: 'ACTIVE', statusText: 'Active' })) }));
jest.mock('@/lib/integrations/fmcsaClient', () => ({ fetchCarrierFromFMCSA: jest.fn(async () => ({ status: 'ACTIVE', authorized: true, safetyRating: 'Satisfactory' })) }));
jest.mock('@/lib/logistics/matching', () => ({ getMatchesForLoad: jest.fn(async () => ({ loadId: 1, matches: [] })) }));

const { requireUser, requireAdminUser } = jest.requireMock('@/lib/apiAuth');

function createMockReqRes(method: string, options: { query?: any; body?: any; headers?: any } = {}) {
  const req: Partial<NextApiRequest> = {
    method,
    query: options.query || {},
    body: options.body,
    headers: options.headers || {},
  };
  const res: any = { statusCode: 200, headers: {}, jsonData: null };
  res.setHeader = (k: string, v: string) => { res.headers[k] = v; };
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (data: any) => { res.jsonData = data; return res; };
  res.end = (data?: any) => { res.ended = data ?? true; return res; };
  return { req, res };
}

beforeEach(() => {
  jest.clearAllMocks();
  requireUser.mockResolvedValue({ id: 1, role: 'ADMIN', ventureIds: [1], allVentures: true });
  requireAdminUser.mockResolvedValue({ id: 1, role: 'ADMIN', ventureIds: [1], allVentures: true });
});

describe('critical API smoke tests', () => {
  it('freight carrier preferred lanes does not 404', async () => {
    const { req, res } = createMockReqRes('GET', { query: { carrierId: '1' } });
    // @ts-ignore
    await carrierPreferredHandler(req, res);
    expect(res.statusCode).not.toBe(404);
  });

  it('freight shipper preferred lanes does not 404', async () => {
    const { req, res } = createMockReqRes('GET', { query: { shipperId: '1' } });
    // @ts-ignore
    await shipperPreferredHandler(req, res);
    expect(res.statusCode).not.toBe(404);
  });

  it('admin ai-templates index does not 404', async () => {
    const { req, res } = createMockReqRes('GET', { query: {} });
    // @ts-ignore
    await aiTemplatesIndexHandler(req, res);
    expect(res.statusCode).not.toBe(404);
  });

  it('admin ai-templates detail does not 404', async () => {
    const { req, res } = createMockReqRes('GET', { query: { id: '1' } });
    // @ts-ignore
    await aiTemplatesIdHandler(req, res);
    expect(res.statusCode).not.toBe(404);
  });

  it('hotel P&L monthly does not 404', async () => {
    const { req, res } = createMockReqRes('GET', { query: { hotelId: '1', year: '2024' } });
    // @ts-ignore
    await hotelPnlHandler(req, res);
    expect(res.statusCode).not.toBe(404);
  });

  it('FMCSA lookup endpoint does not 404', async () => {
    const { req, res } = createMockReqRes('POST', { body: { type: 'DOT', value: '123456' } });
    // @ts-ignore
    await fmcsaLookupHandler(req, res);
    expect(res.statusCode).not.toBe(404);
  });

  it('logistics carriers endpoint does not 404', async () => {
    const { req, res } = createMockReqRes('POST', { body: { name: 'Carrier', normalizedStatus: 'ACTIVE' } });
    // @ts-ignore
    await logisticsCarriersHandler(req, res);
    expect(res.statusCode).not.toBe(404);
  });

  it('carrier FMCSA refresh does not 404', async () => {
    const { req, res } = createMockReqRes('POST', { query: { id: '1' } });
    // @ts-ignore
    await carrierRefreshHandler(req, res);
    expect(res.statusCode).not.toBe(404);
  });

  it('freight load detail does not 404', async () => {
    const { req, res } = createMockReqRes('GET', { query: { id: '1' } });
    // @ts-ignore
    await freightLoadHandler(req, res);
    expect(res.statusCode).not.toBe(404);
  });

  it('freight load matches does not 404', async () => {
    const { req, res } = createMockReqRes('GET', { query: { id: '1' } });
    // @ts-ignore
    await freightLoadMatchesHandler(req, res);
    expect(res.statusCode).not.toBe(404);
  });
});
