import { prisma } from "@/lib/prisma";
import { JobName } from "@prisma/client";

export interface QuoteTimeoutJobOptions {
  ventureId?: number;
  dryRun?: boolean;
  limit?: number;
}

export interface QuoteTimeoutJobResult {
  scanned: number;
  updated: number;
  skippedNoExpiresAt: number;
  skippedAlreadyResolved: number;
}

export async function runQuoteTimeoutJob(
  options: QuoteTimeoutJobOptions = {}
): Promise<{ stats: QuoteTimeoutJobResult; jobRunLogId: number }> {
  const { ventureId, dryRun = false, limit = 5000 } = options;
  const startedAt = new Date();

  const where: any = {
    status: "SENT",
    expiresAt: {
      not: null,
      lte: new Date(),
    },
  };

  if (ventureId) {
    where.ventureId = ventureId;
  }

  const stats: QuoteTimeoutJobResult = {
    scanned: 0,
    updated: 0,
    skippedNoExpiresAt: 0,
    skippedAlreadyResolved: 0,
  };

  if (dryRun) {
    const count = await prisma.freightQuote.count({ where });
    stats.scanned = count;
    stats.updated = count;
  } else {
    let processed = 0;
    const batchSize = 100;

    while (processed < limit) {
      const quotes = await prisma.freightQuote.findMany({
        where,
        take: Math.min(batchSize, limit - processed),
        select: { id: true },
      });

      if (quotes.length === 0) break;

      stats.scanned += quotes.length;

      for (const quote of quotes) {
        await prisma.freightQuote.update({
          where: { id: quote.id },
          data: {
            status: "NO_RESPONSE",
            respondedAt: new Date(),
          },
        });
        stats.updated++;
      }

      processed += quotes.length;

      if (quotes.length < batchSize) break;
    }
  }

  const jobRunLog = await prisma.jobRunLog.create({
    data: {
      ventureId: ventureId || null,
      jobName: JobName.QUOTE_TIMEOUT,
      status: "SUCCESS",
      startedAt,
      endedAt: new Date(),
      statsJson: JSON.stringify({ ...stats, dryRun }),
    },
  });

  return { stats, jobRunLogId: jobRunLog.id };
}
