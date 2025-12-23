import { getServerSideProps } from '@/pages/admin/freight/shippers/[id]/preferred-lanes.server';

jest.mock('@/lib/authGuard', () => ({ requireAdminUser: jest.fn() }));
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: { logisticsShipper: { findUnique: jest.fn() }, shipperPreferredLane: { findMany: jest.fn() } } }));

const { requireAdminUser } = jest.requireMock('@/lib/authGuard');
const prisma = jest.requireMock('@/lib/prisma').default;

describe('SSR admin shipper preferred lanes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('redirects when not admin', async () => {
    (requireAdminUser as jest.Mock).mockResolvedValue(null);
    const ctx: any = { req: {}, res: {}, query: { id: '1' } };
    const res = await getServerSideProps(ctx as any);
    // expect redirect
    expect((res as any).redirect).toBeDefined();
  });

  it('returns props when admin and shipper exists', async () => {
    (requireAdminUser as jest.Mock).mockResolvedValue({ dbUser: { id: 1 } });
    (prisma.logisticsShipper.findUnique as jest.Mock).mockResolvedValue({ id: 5, name: 'S1' });
    (prisma.shipperPreferredLane.findMany as jest.Mock).mockResolvedValue([{ id: 2, origin: 'A', destination: 'B', bonus: 0, createdAt: new Date() }]);

    const ctx: any = { req: {}, res: {}, query: { id: '5' } };
    const res = await getServerSideProps(ctx as any);
    expect((res as any).props).toBeDefined();
    expect((res as any).props).toHaveProperty('shipper');
  });
});
