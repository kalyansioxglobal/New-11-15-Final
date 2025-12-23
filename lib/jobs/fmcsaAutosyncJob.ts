import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { fetchCarrierFromFMCSA } from '@/lib/integrations/fmcsaClient';
import crypto from 'crypto';

/**
 * Autosync job for FMCSA carrier data.
 * Fetches updates for all carriers in the DB and updates their FMCSA status fields.
 * Can be triggered periodically (e.g., daily cron) or on-demand.
 */
export async function runFMCSAAutosyncJob() {
  const requestId = crypto.randomUUID();
  logger.info('fmcsa_autosync_start', { meta: { requestId, timestamp: new Date().toISOString() } });

  try {
    // Fetch all carriers with an MC number
    const carriers = await prisma.carrier.findMany({
      where: { mcNumber: { not: null } },
      select: { id: true, mcNumber: true, name: true },
    });

    let successCount = 0;
    let failureCount = 0;

    for (const carrier of carriers) {
      if (!carrier.mcNumber) continue;

      try {
        const fmcsaData = await fetchCarrierFromFMCSA(carrier.mcNumber);

        if (fmcsaData) {
          await prisma.carrier.update({
            where: { id: carrier.id },
            data: {
              fmcsaStatus: fmcsaData.status,
              fmcsaAuthorized: fmcsaData.authorized,
              fmcsaLastSyncAt: new Date(),
              fmcsaSyncError: null, // Clear previous errors
              safetyRating: fmcsaData.safetyRating || undefined,
            },
          });
          successCount++;
        } else {
          // If fetch failed, mark it and set error
          await prisma.carrier.update({
            where: { id: carrier.id },
            data: {
              fmcsaSyncError: 'Failed to fetch from FMCSA API',
            },
          });
          failureCount++;
        }
      } catch (err: any) {
        logger.error('fmcsa_autosync_carrier_error', {
          meta: { requestId, carrierId: carrier.id, mcNumber: carrier.mcNumber, error: err.message },
        });
        failureCount++;

        // Update carrier with error message
        await prisma.carrier.update({
          where: { id: carrier.id },
          data: { fmcsaSyncError: err.message || 'Unknown error' },
        });
      }
    }

    logger.info('fmcsa_autosync_complete', {
      meta: { requestId, successCount, failureCount, totalProcessed: carriers.length },
    });
  } catch (err: any) {
    logger.error('fmcsa_autosync_job_error', { meta: { requestId, error: err.message } });
    throw err;
  }
}
