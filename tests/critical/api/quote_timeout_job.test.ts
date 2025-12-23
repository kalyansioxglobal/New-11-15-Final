import { runQuoteTimeoutJob } from "@/lib/jobs/quoteTimeoutJob";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    freightQuote: {
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    jobRunLog: {
      create: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

describe("Quote Timeout Job", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update SENT quotes with expired expiresAt to NO_RESPONSE", async () => {
    const mockQuotes = [
      { id: 1 },
      { id: 2 },
    ];

    (prisma.freightQuote.findMany as jest.Mock)
      .mockResolvedValueOnce(mockQuotes)
      .mockResolvedValueOnce([]);
    (prisma.freightQuote.update as jest.Mock).mockResolvedValue({});
    (prisma.jobRunLog.create as jest.Mock).mockResolvedValue({ id: 1 });

    const result = await runQuoteTimeoutJob({ ventureId: 1 });

    expect(result.stats.scanned).toBe(2);
    expect(result.stats.updated).toBe(2);
    expect(prisma.freightQuote.update).toHaveBeenCalledTimes(2);
    expect(prisma.freightQuote.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ status: "NO_RESPONSE" }),
    });
  });

  it("should not update in dryRun mode but count quotes", async () => {
    (prisma.freightQuote.count as jest.Mock).mockResolvedValue(5);
    (prisma.jobRunLog.create as jest.Mock).mockResolvedValue({ id: 1 });

    const result = await runQuoteTimeoutJob({ ventureId: 1, dryRun: true });

    expect(result.stats.scanned).toBe(5);
    expect(result.stats.updated).toBe(5);
    expect(prisma.freightQuote.update).not.toHaveBeenCalled();
  });

  it("should respect limit option", async () => {
    const mockQuotes = [{ id: 1 }, { id: 2 }];

    (prisma.freightQuote.findMany as jest.Mock)
      .mockResolvedValueOnce(mockQuotes)
      .mockResolvedValueOnce([]);
    (prisma.freightQuote.update as jest.Mock).mockResolvedValue({});
    (prisma.jobRunLog.create as jest.Mock).mockResolvedValue({ id: 1 });

    await runQuoteTimeoutJob({ ventureId: 1, limit: 2 });

    expect(prisma.freightQuote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 2,
      })
    );
  });

  it("should log job run with stats", async () => {
    (prisma.freightQuote.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.jobRunLog.create as jest.Mock).mockResolvedValue({ id: 99 });

    const result = await runQuoteTimeoutJob({ ventureId: 1 });

    expect(result.jobRunLogId).toBe(99);
    expect(prisma.jobRunLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          jobName: "QUOTE_TIMEOUT",
          status: "SUCCESS",
        }),
      })
    );
  });
});
