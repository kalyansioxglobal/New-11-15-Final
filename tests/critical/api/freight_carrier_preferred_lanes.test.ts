import type { NextApiRequest, NextApiResponse } from 'next';
import indexHandler from '@/pages/api/freight/carriers/[carrierId]/preferred-lanes/index';
import deleteHandler from '@/pages/api/freight/carriers/[carrierId]/preferred-lanes/[laneId]';

jest.mock('@/lib/apiAuth', () => ({ requireUser: jest.fn() }));
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: { carrierPreferredLane: { findMany: jest.fn(), create: jest.fn(), deleteMany: jest.fn() } } }));

const { requireUser } = jest.requireMock('@/lib/apiAuth');
const prisma = jest.requireMock('@/lib/prisma').default;

function createMockReqRes(method: string, body: any = {}, query: any = {}) {
  const req: Partial<NextApiRequest> = { method, body, query, headers: {} };
  const res: any = {};
  res.statusCode = 200;
  res.headers = {};
  res.setHeader = (k: string, v: string) => (res.headers[k] = v);
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.jsonData = null;
  res.json = (d: any) => { res.jsonData = d; return res; };
  return { req, res };
}

describe('Carrier preferred-lanes API', () => {
  beforeEach(() => jest.clearAllMocks());

  it('GET returns lanes for allowed user', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR' });
    (prisma.carrierPreferredLane.findMany as jest.Mock).mockResolvedValue([{ id: 10, origin: 'A', destination: 'B', radius: 200, createdAt: new Date() }]);

    const { req, res } = createMockReqRes('GET', {}, { carrierId: '5' });
    // @ts-ignore
    await indexHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toHaveProperty('lanes');
  });

  it('POST creates lane when valid', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 2, role: 'ADMIN' });
    (prisma.carrierPreferredLane.create as jest.Mock).mockResolvedValue({ id: 11, origin: 'X', destination: 'Y', radius: 150 });

    const { req, res } = createMockReqRes('POST', { origin: 'X', destination: 'Y', radius: 150 }, { carrierId: '2' });
    // @ts-ignore
    await indexHandler(req, res);

    expect(res.statusCode).toBe(201);
    expect(prisma.carrierPreferredLane.create).toHaveBeenCalled();
  });

  it('DELETE removes lane', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 2, role: 'ADMIN' });
    (prisma.carrierPreferredLane.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

    const { req, res } = createMockReqRes('DELETE', {}, { carrierId: '2', laneId: '99' });
    // @ts-ignore
    await deleteHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toHaveProperty('success', true);
  });
});
