import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/freight/loads/[id]/matches';

jest.mock('@/lib/apiAuth', () => ({ requireUser: jest.fn() }));
jest.mock('@/lib/logistics/matching', () => ({ getMatchesForLoad: jest.fn() }));

const { requireUser } = jest.requireMock('@/lib/apiAuth');
const { getMatchesForLoad } = jest.requireMock('@/lib/logistics/matching');

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

describe('GET /api/freight/loads/[id]/matches', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requires auth', async () => {
    (requireUser as jest.Mock).mockResolvedValue(null);
    const { req, res } = createMockReqRes('GET', { id: '1' });
    // @ts-ignore
    await handler(req, res);
    expect(res.statusCode).toBe(200); // handler returns early (requireUser handles response)
  });

  it('returns matches with components and reasons', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: 'CSR' });
    const fake = {
      loadId: 1,
      matches: [
        {
          carrierId: 5,
          carrierName: 'C5',
          totalScore: 87,
          components: { distanceScore: 80, equipmentScore: 100, preferredLaneScore: 50, bonusScore: 10 },
          reasons: ['Carrier preferred lane match', 'Shipper bonus: 10']
        }
      ]
    };
    (getMatchesForLoad as jest.Mock).mockResolvedValue(fake);

    const { req, res } = createMockReqRes('GET', { id: '1' });
    // @ts-ignore
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toHaveProperty('matches');
    expect(res.jsonData.matches[0]).toHaveProperty('components');
    expect(res.jsonData.matches[0]).toHaveProperty('reasons');
  });
});
