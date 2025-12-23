import { computeFreightStats } from '../../../lib/freight/stats';
import { getMatchesForLoad } from '../../../lib/logistics/matching';

jest.mock('../../../lib/logistics/matching');
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    load: { findMany: jest.fn() },
    carrier: { count: jest.fn(), findMany: jest.fn() },
  },
}));

const prisma = jest.requireMock('@/lib/prisma').default;
const mockedGetMatchesForLoad = getMatchesForLoad as jest.Mock;

describe('Freight stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('computes matching, FMCSA, and on-time stats', async () => {
    prisma.load.findMany.mockResolvedValue([
      {
        id: 1,
        equipmentType: 'VAN',
        pickupCity: 'Dallas',
        pickupState: 'TX',
        dropCity: 'Houston',
        dropState: 'TX',
        miles: 250,
        shipperId: 10,
        preferredBonusesJson: null,
        scheduledDeliveryAt: new Date('2025-01-02T12:00:00Z'),
        actualDeliveryAt: new Date('2025-01-02T11:00:00Z'),
        dropDate: null,
      },
      {
        id: 2,
        equipmentType: 'VAN',
        pickupCity: 'Austin',
        pickupState: 'TX',
        dropCity: 'San Antonio',
        dropState: 'TX',
        miles: 120,
        shipperId: 10,
        preferredBonusesJson: null,
        scheduledDeliveryAt: new Date('2025-01-03T12:00:00Z'),
        actualDeliveryAt: new Date('2025-01-03T13:00:00Z'),
        dropDate: null,
      },
    ]);

    mockedGetMatchesForLoad.mockImplementation(async (id: number) => {
      if (id === 1) {
        return {
          loadId: 1,
          matches: [
            { totalScore: 90, components: {}, reasons: [] },
            { totalScore: 70, components: {}, reasons: [] },
          ],
        };
      }
      return {
        loadId: 2,
        matches: [{ totalScore: 50, components: {}, reasons: [] }],
      };
    });

    prisma.carrier.count.mockResolvedValueOnce(3); // unauthorized
    prisma.carrier.count.mockResolvedValueOnce(1); // disqualified

    prisma.carrier.findMany.mockResolvedValue([
      { onTimePercentage: 98 },
      { onTimePercentage: 90 },
      { onTimePercentage: 70 },
    ]);

    const stats = await computeFreightStats({ ventureId: 1, range: { from: null, to: null } });

    expect(stats.matching.averageMatchScore).toBe(70); // (90+70+50)/3
    expect(stats.matching.averageTopMatchScore).toBe(70); // (90 + 50)/2 -> 70
    expect(stats.matching.percentLoadsWithAtLeastOneMatch).toBe(100);
    expect(stats.fmcsa.countUnauthorizedCarriersExcluded).toBe(3);
    expect(stats.fmcsa.countDisqualifiedCarriersExcluded).toBe(1);
    expect(stats.onTime.onTimeDeliveryRate).toBe(50);
    expect(stats.onTime.carrierBuckets).toEqual({ high: 1, medium: 1, low: 1 });
  });
});
