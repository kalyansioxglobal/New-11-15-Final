import { runFMCSAAutosyncJob } from '@/lib/jobs/fmcsaAutosyncJob';

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    carrier: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock('@/lib/integrations/fmcsaClient', () => ({
  fetchCarrierFromFMCSA: jest.fn(),
}));
jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn() },
}));

const prisma = jest.requireMock('@/lib/prisma').default;
const { fetchCarrierFromFMCSA } = jest.requireMock('@/lib/integrations/fmcsaClient');
const logger = jest.requireMock('@/lib/logger').default;

describe('FMCSA Autosync Job', () => {
  beforeEach(() => jest.clearAllMocks());

  it('processes all carriers with MC numbers', async () => {
    const mockCarriers = [
      { id: 1, mcNumber: 'MC123', name: 'C1' },
      { id: 2, mcNumber: 'MC456', name: 'C2' },
    ];
    (prisma.carrier.findMany as jest.Mock).mockResolvedValue(mockCarriers);
    (fetchCarrierFromFMCSA as jest.Mock).mockResolvedValue({
      mcNumber: 'MC123',
      status: 'ACTIVE',
      authorized: true,
      safetyRating: 'SATISFACTORY',
      lastUpdated: new Date(),
    });
    (prisma.carrier.update as jest.Mock).mockResolvedValue({});

    await runFMCSAAutosyncJob();

    expect(prisma.carrier.findMany).toHaveBeenCalled();
    expect(fetchCarrierFromFMCSA).toHaveBeenCalledTimes(2);
    expect(prisma.carrier.update).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenCalledWith('fmcsa_autosync_complete', expect.any(Object));
  });

  it('handles FMCSA fetch failures gracefully', async () => {
    (prisma.carrier.findMany as jest.Mock).mockResolvedValue([
      { id: 1, mcNumber: 'MC123', name: 'C1' },
    ]);
    (fetchCarrierFromFMCSA as jest.Mock).mockResolvedValue(null);
    (prisma.carrier.update as jest.Mock).mockResolvedValue({});

    await runFMCSAAutosyncJob();

    expect(prisma.carrier.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ fmcsaSyncError: 'Failed to fetch from FMCSA API' }),
      })
    );
  });
});
