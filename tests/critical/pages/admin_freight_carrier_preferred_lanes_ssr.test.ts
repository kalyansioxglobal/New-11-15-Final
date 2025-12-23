import { getServerSideProps } from '@/pages/admin/freight/carriers/[id]/preferred-lanes.server';

jest.mock('@/lib/authGuard', () => ({ requireAdminUser: jest.fn() }));
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: { carrier: { findUnique: jest.fn() }, carrierPreferredLane: { findMany: jest.fn() } } }));

const { requireAdminUser } = jest.requireMock('@/lib/authGuard');
const prisma = jest.requireMock('@/lib/prisma').default;

describe('SSR admin carrier preferred lanes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('redirects when not admin', async () => {
    (requireAdminUser as jest.Mock).mockResolvedValue(null);
    const ctx: any = { req: {}, res: {}, query: { id: '1' } };
    const res = await getServerSideProps(ctx as any);
    // expect redirect
    expect((res as any).redirect).toBeDefined();
  });

  it('returns props when admin and carrier exists', async () => {
    (requireAdminUser as jest.Mock).mockResolvedValue({ dbUser: { id: 1 } });
    (prisma.carrier.findUnique as jest.Mock).mockResolvedValue({ id: 5, name: 'C1' });
    (prisma.carrierPreferredLane.findMany as jest.Mock).mockResolvedValue([{ id: 2, origin: 'A', destination: 'B', radius: 200, createdAt: new Date() }]);

    const ctx: any = { req: {}, res: {}, query: { id: '5' } };
    const res = await getServerSideProps(ctx as any);
    expect((res as any).props).toBeDefined();
    expect((res as any).props).toHaveProperty('carrier');
  });
});
