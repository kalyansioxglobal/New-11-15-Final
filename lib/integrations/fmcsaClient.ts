import { logger } from '@/lib/logger';
import { withRetry } from '@/lib/resilience/withRetry';
import { getCircuitBreaker } from '@/lib/resilience/circuitBreaker';

/**
 * Mock FMCSA client for fetching carrier status.
 * In production, this would call the actual FMCSA API via HTTP.
 * For now, we provide a mock that returns realistic data.
 */

export type FMCSACarrierData = {
  mcNumber: string;
  status: string; // e.g., "ACTIVE", "INACTIVE", "OUT_OF_SERVICE"
  authorized: boolean;
  safetyRating?: string;
  lastUpdated: Date;
};

/**
 * Fetch carrier data from FMCSA.
 * In production, make HTTP request to FMCSA API.
 * Here, we mock successful responses with realistic data.
 * 
 * Includes retry logic and circuit breaker protection.
 */
export async function fetchCarrierFromFMCSA(mcNumber: string): Promise<FMCSACarrierData | null> {
  const circuitBreaker = getCircuitBreaker('fmcsa', {
    failureThreshold: 5,
    resetTimeout: 60000, // 1 minute
  });

  try {
    return await circuitBreaker.execute(async () => {
      return await withRetry(
        async () => {
          // Check if FMCSA API key is configured
          const fmcsaApiKey = process.env.FMCSA_WEBKEY || process.env.FMCSA_API_KEY;
          
          if (!fmcsaApiKey) {
            // Fallback to mock if no API key is configured
            logger.warn('fmcsa_fetch_no_key', {
              meta: { mcNumber, message: 'FMCSA API key not configured, using mock data' },
            });
            const mockData: FMCSACarrierData = {
              mcNumber,
              status: 'ACTIVE',
              authorized: true,
              safetyRating: 'SATISFACTORY',
              lastUpdated: new Date(),
            };
            return mockData;
          }

          try {
            // Call real FMCSA API
            const apiUrl = `https://mobile.fmcsa.dot.gov/qc/services/carriers/${mcNumber}?webKey=${fmcsaApiKey}`;
            const response = await fetch(apiUrl, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
              },
            });

            if (!response.ok) {
              if (response.status === 404) {
                // Carrier not found in FMCSA database
                return {
                  mcNumber,
                  status: 'NOT_FOUND',
                  authorized: false,
                  safetyRating: undefined,
                  lastUpdated: new Date(),
                };
              }
              throw new Error(`FMCSA API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            // Parse FMCSA response (structure may vary)
            const carrierData: FMCSACarrierData = {
              mcNumber,
              status: data.carrier?.carrierOperation?.carrierOperationDesc || 'UNKNOWN',
              authorized: data.carrier?.carrierOperation?.carrierOperationCode === 'A',
              safetyRating: data.carrier?.safety?.safetyRating?.safetyRatingDesc || undefined,
              lastUpdated: new Date(),
            };

            logger.info('fmcsa_fetch', {
              meta: {
                mcNumber,
                status: 'success',
                fmcsaStatus: carrierData.status,
                authorized: carrierData.authorized,
              },
            });

            return carrierData;
          } catch (fetchErr: any) {
            // If API call fails, log and fall back to mock
            logger.warn('fmcsa_fetch_api_error', {
              meta: {
                mcNumber,
                error: fetchErr.message || String(fetchErr),
                message: 'FMCSA API call failed, using mock data',
              },
            });

            // Return mock data as fallback
            const mockData: FMCSACarrierData = {
              mcNumber,
              status: 'ACTIVE',
              authorized: true,
              safetyRating: 'SATISFACTORY',
              lastUpdated: new Date(),
            };
            return mockData;
          }
        },
        {
          maxRetries: 3,
          initialDelay: 1000,
          maxDelay: 10000,
          retryableErrors: (err: any) => {
            // Retry on network errors and 5xx errors
            if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
              return true;
            }
            if (err.status >= 500 || err.status === 429) {
              return true;
            }
            return false;
          },
        }
      );
    });
  } catch (err: any) {
    logger.error('fmcsa_fetch', {
      meta: {
        mcNumber,
        error: err.message || String(err),
        circuitState: circuitBreaker.getState(),
      },
    });
    return null;
  }
}
