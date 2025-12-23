import { getMatchesForLoad } from '@/lib/logistics/matching';

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    load: { findUnique: jest.fn(), groupBy: jest.fn() },
    carrier: { findMany: jest.fn() },
    carrierPreferredLane: { findFirst: jest.fn() },
    shipperPreferredLane: { findFirst: jest.fn() },
    carrierDispatcher: { findMany: jest.fn() },
  },
}));

const prisma = jest.requireMock('@/lib/prisma').default;

describe('Freight Matching - Carrier Filters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.load.groupBy as jest.Mock).mockResolvedValue([]);
    (prisma.carrierDispatcher.findMany as jest.Mock).mockResolvedValue([]);
  });

  it('excludes carriers with fmcsaAuthorized: false', async () => {
    const mockLoad = {
      id: 1,
      miles: 500,
      equipmentType: 'VAN',
      pickupCity: 'Dallas',
      dropCity: 'Houston',
      shipperId: 10,
      preferredBonusesJson: null,
    };

    (prisma.load.findUnique as jest.Mock).mockResolvedValue(mockLoad);

    // Return one active authorized carrier and one unauthorized
    (prisma.carrier.findMany as jest.Mock).mockResolvedValue([
      {
        id: 1,
        name: 'Authorized Carrier',
        active: true,
        blocked: false,
        fmcsaAuthorized: true,
        disqualified: false,
        equipmentTypes: 'VAN,FLATBED',
        onTimePercentage: 95,
        powerUnits: 10,
      },
    ]);

    (prisma.carrierPreferredLane.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.shipperPreferredLane.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await getMatchesForLoad(1);

    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].carrierId).toBe(1);
    expect(result.matches[0].carrierName).toBe('Authorized Carrier');
  });

  it('gives higher score for preferred lane match', async () => {
    const mockLoad = {
      id: 2,
      miles: 300,
      equipmentType: 'VAN',
      pickupCity: 'Dallas',
      dropCity: 'Houston',
      pickupState: 'TX',
      dropState: 'TX',
      shipperId: 20,
      preferredBonusesJson: null,
    };

    (prisma.load.findUnique as jest.Mock).mockResolvedValue(mockLoad);

    (prisma.carrier.findMany as jest.Mock).mockResolvedValue([
      {
        id: 1,
        name: 'Lane Carrier',
        active: true,
        blocked: false,
        fmcsaAuthorized: true,
        disqualified: false,
        equipmentTypes: 'VAN',
        onTimePercentage: 90,
        powerUnits: 5,
        recentLoadsDelivered: 3,
      },
      {
        id: 2,
        name: 'No Lane Carrier',
        active: true,
        blocked: false,
        fmcsaAuthorized: true,
        disqualified: false,
        equipmentTypes: 'VAN',
        onTimePercentage: 90,
        powerUnits: 5,
        recentLoadsDelivered: 3,
      },
    ]);

    (prisma.carrierPreferredLane.findFirst as jest.Mock).mockImplementation(({ where }: any) => {
      if (where.carrierId === 1) {
        return Promise.resolve({ id: 1 });
      }
      return Promise.resolve(null);
    });

    (prisma.shipperPreferredLane.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await getMatchesForLoad(2);

    const laneCarrier = result.matches.find((m: any) => m.carrierId === 1)!;
    const noLaneCarrier = result.matches.find((m: any) => m.carrierId === 2)!;

    expect(laneCarrier.totalScore).toBeGreaterThan(noLaneCarrier.totalScore);
    expect(laneCarrier.reasons).toEqual(expect.arrayContaining(['Preferred lane match (carrier)']));
  });

  it('applies shipper bonus when configured', async () => {
    const mockLoad = {
      id: 3,
      miles: 400,
      equipmentType: 'VAN',
      pickupCity: 'Austin',
      dropCity: 'Dallas',
      shipperId: 30,
      preferredBonusesJson: null,
    };

    (prisma.load.findUnique as jest.Mock).mockResolvedValue(mockLoad);

    (prisma.carrier.findMany as jest.Mock).mockResolvedValue([
      {
        id: 3,
        name: 'Bonus Carrier',
        active: true,
        blocked: false,
        fmcsaAuthorized: true,
        disqualified: false,
        equipmentTypes: 'VAN',
        onTimePercentage: 85,
        powerUnits: 4,
        recentLoadsDelivered: 2,
      },
    ]);

    (prisma.carrierPreferredLane.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.shipperPreferredLane.findFirst as jest.Mock).mockResolvedValue({ bonus: 20 });

    const result = await getMatchesForLoad(3);
    expect(result.matches[0].components.bonusScore).toBeGreaterThan(0);
    expect(result.matches[0].reasons).toEqual(expect.arrayContaining(['Shipper bonus applied']));
  });

  it('favors carriers with higher on-time performance', async () => {
    const mockLoad = {
      id: 4,
      miles: 500,
      equipmentType: 'VAN',
      pickupCity: 'San Antonio',
      dropCity: 'Houston',
      shipperId: 40,
      preferredBonusesJson: null,
    };

    (prisma.load.findUnique as jest.Mock).mockResolvedValue(mockLoad);

    (prisma.carrier.findMany as jest.Mock).mockResolvedValue([
      {
        id: 4,
        name: 'High On-Time',
        active: true,
        blocked: false,
        fmcsaAuthorized: true,
        disqualified: false,
        equipmentTypes: 'VAN',
        onTimePercentage: 98,
        powerUnits: 3,
        recentLoadsDelivered: 1,
      },
      {
        id: 5,
        name: 'Low On-Time',
        active: true,
        blocked: false,
        fmcsaAuthorized: true,
        disqualified: false,
        equipmentTypes: 'VAN',
        onTimePercentage: 60,
        powerUnits: 3,
        recentLoadsDelivered: 1,
      },
    ]);

    (prisma.carrierPreferredLane.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.shipperPreferredLane.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await getMatchesForLoad(4);
    const high = result.matches.find((m: any) => m.carrierId === 4)!;
    const low = result.matches.find((m: any) => m.carrierId === 5)!;

    expect(high.totalScore).toBeGreaterThan(low.totalScore);
    expect(high.reasons).toEqual(expect.arrayContaining(['High on-time performance']));
  });

  it('includes carriers where fmcsaAuthorized is null', async () => {
    const mockLoad = {
      id: 1,
      miles: 500,
      equipmentType: 'VAN',
      pickupCity: 'Dallas',
      dropCity: 'Houston',
      shipperId: 10,
      preferredBonusesJson: null,
    };

    (prisma.load.findUnique as jest.Mock).mockResolvedValue(mockLoad);

    // Carrier with null fmcsaAuthorized should still be included
    (prisma.carrier.findMany as jest.Mock).mockResolvedValue([
      {
        id: 2,
        name: 'Carrier with Null Status',
        active: true,
        blocked: false,
        fmcsaAuthorized: null,
        disqualified: false,
        equipmentTypes: 'VAN',
        onTimePercentage: 85,
        powerUnits: 5,
      },
    ]);

    (prisma.carrierPreferredLane.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.shipperPreferredLane.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await getMatchesForLoad(1);

    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].carrierId).toBe(2);
  });

  it('respects disqualified flag along with FMCSA status', async () => {
    const mockLoad = {
      id: 1,
      miles: 500,
      equipmentType: 'VAN',
      pickupCity: 'Dallas',
      dropCity: 'Houston',
      shipperId: 10,
      preferredBonusesJson: null,
    };

    (prisma.load.findUnique as jest.Mock).mockResolvedValue(mockLoad);

    // Return no carriers (all filtered out)
    (prisma.carrier.findMany as jest.Mock).mockResolvedValue([]);

    const result = await getMatchesForLoad(1);

    expect(result.matches.length).toBe(0);
  });
});
