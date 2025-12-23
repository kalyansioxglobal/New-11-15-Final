import { getServerSidePropsForPnlPage } from '@/lib/hotels/pnlPageServer';

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    hotelProperty: {
      findMany: jest.fn(),
    },
  },
}));

const prisma = jest.requireMock('@/lib/prisma').default;

describe('admin hotels P&L SSR', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads all hotels on page render', async () => {
    prisma.hotelProperty.findMany.mockResolvedValue([
      { id: 1, name: 'Test Hotel 1', code: 'HTL1' },
      { id: 2, name: 'Test Hotel 2', code: 'HTL2' },
    ]);

    const result = await getServerSidePropsForPnlPage({
      query: {},
      params: {},
    });

    expect(result.props.hotels).toHaveLength(2);
    expect(result.props.hotels[0].name).toBe('Test Hotel 1');
  });

  it('passes initial hotelId from query', async () => {
    prisma.hotelProperty.findMany.mockResolvedValue([
      { id: 1, name: 'Test Hotel', code: 'HTL' },
    ]);

    const result = await getServerSidePropsForPnlPage({
      query: { hotelId: '1', year: '2024' },
      params: {},
    });

    expect(result.props.initialHotelId).toBe(1);
    expect(result.props.initialYear).toBe(2024);
  });

  it('defaults to current year if not provided', async () => {
    prisma.hotelProperty.findMany.mockResolvedValue([]);

    const result = await getServerSidePropsForPnlPage({
      query: {},
      params: {},
    });

    expect(result.props.initialYear).toBe(new Date().getFullYear());
  });

  it('handles error when loading hotels', async () => {
    prisma.hotelProperty.findMany.mockRejectedValue(new Error('DB error'));

    const result = await getServerSidePropsForPnlPage({
      query: {},
      params: {},
    });

    expect(result.props.hotels).toEqual([]);
    expect(result.props.initialHotelId).toBeNull();
  });
});
