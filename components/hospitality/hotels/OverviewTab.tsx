import { Skeleton } from '@/components/ui/Skeleton';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface Metric {
  id: number;
  date: string;
  roomsAvailable: number;
  roomsSold: number;
  occupancyPct: number;
  adr: number;
  revpar: number;
  totalRevenue: number;
  roomsOutOfOrder: number;
}

interface MetricsSummary {
  avgOcc: number;
  avgAdr: number;
  avgRevpar: number;
  totalRevenue7d: number;
  daysWithData: number;
}

interface OverviewTabProps {
  hotelId: number | string | undefined;
  testMode: boolean;
  hotelRooms: number | null;
  metricsPage: number;
  onPageChange: (page: number) => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString();
}

const ITEMS_PER_PAGE = 50;

function renderPagination(currentPage: number, total: number, onPageChange: (page: number) => void) {
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
      <div className="text-sm text-gray-700 dark:text-gray-300">
        Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, total)} of {total} results
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          Previous
        </button>
        <span className="text-sm text-gray-700 dark:text-gray-300">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default function OverviewTab({
  hotelId,
  testMode,
  hotelRooms,
  metricsPage,
  onPageChange,
}: OverviewTabProps) {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [metricsSummary, setMetricsSummary] = useState<MetricsSummary | null>(null);
  const [metricsTotal, setMetricsTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = async () => {
    if (!hotelId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const limit = Math.min(ITEMS_PER_PAGE * metricsPage, 200);
      const url = `/api/hospitality/hotels/${hotelId}/metrics?limit=${limit}&includeTest=${testMode}`;
      
      let mRes: Response;
      try {
        mRes = await fetch(url);
      } catch (fetchError) {
        console.error('Fetch error:', fetchError);
        setError('Failed to connect to server. Please check your connection.');
        setLoading(false);
        return;
      }
      
      if (!mRes.ok) {
        let errorMessage = `Unable to load metrics (status: ${mRes.status})`;
        try {
          const errorData = await mRes.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          // If JSON parsing fails, use default error message
          errorMessage = `Server error (status: ${mRes.status})`;
        }
        setError(errorMessage);
        setLoading(false);
        return;
      }

      let m: any;
      try {
        m = await mRes.json();
      } catch (jsonError) {
        console.error('JSON parse error:', jsonError);
        setError('Invalid response from server. Please try again.');
        setLoading(false);
        return;
      }

      // Safely handle response data
      try {
        const allMetrics = Array.isArray(m?.metrics) ? m.metrics : [];
        setMetricsTotal(allMetrics.length);
        
        // Frontend pagination
        const startIndex = (metricsPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        setMetrics(allMetrics.slice(startIndex, endIndex));
        
        // Handle summary - check if it exists and has the expected structure
        if (m?.summary && typeof m.summary === 'object') {
          // Transform backend summary format to frontend format if needed
          const summary = m.summary;
          setMetricsSummary({
            avgOcc: summary.occupancyPct ?? summary.avgOcc ?? 0,
            avgAdr: summary.adr ?? summary.avgAdr ?? 0,
            avgRevpar: summary.revpar ?? summary.avgRevpar ?? 0,
            totalRevenue7d: summary.totalRoomRevenue ?? summary.totalRevenue7d ?? 0,
            daysWithData: summary.daysWithData ?? allMetrics.length,
          });
        } else {
          setMetricsSummary(null);
        }
      } catch (dataError) {
        console.error('Data processing error:', dataError);
        setError('Error processing metrics data. Please try again.');
      }
    } catch (e: any) {
      // Catch any unexpected errors
      console.error('Unexpected error loading metrics:', e);
      const errorMessage = 'An unexpected error occurred. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId, testMode, metricsPage]);

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Rooms</div>
          <div className="font-semibold text-lg text-gray-900 dark:text-white">{hotelRooms ?? '—'}</div>
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Occ% (7d)</div>
          <div className="font-semibold text-lg text-gray-900 dark:text-white">
            {loading ? (
              <span className="text-gray-400">Loading...</span>
            ) : error ? (
              <span className="text-red-500">Error</span>
            ) : metricsSummary?.avgOcc != null && !isNaN(metricsSummary.avgOcc) ? (
              `${metricsSummary.avgOcc.toFixed(1)}%`
            ) : (
              '--'
            )}
          </div>
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">ADR (7d)</div>
          <div className="font-semibold text-lg text-gray-900 dark:text-white">
            {loading ? (
              <span className="text-gray-400">Loading...</span>
            ) : error ? (
              <span className="text-red-500">Error</span>
            ) : metricsSummary?.avgAdr != null && !isNaN(metricsSummary.avgAdr) ? (
              `$${metricsSummary.avgAdr.toFixed(2)}`
            ) : (
              '--'
            )}
          </div>
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">RevPAR (7d)</div>
          <div className="font-semibold text-lg text-green-700 dark:text-green-400">
            {loading ? (
              <span className="text-gray-400">Loading...</span>
            ) : error ? (
              <span className="text-red-500">Error</span>
            ) : metricsSummary?.avgRevpar != null && !isNaN(metricsSummary.avgRevpar) ? (
              `$${metricsSummary.avgRevpar.toFixed(2)}`
            ) : (
              '--'
            )}
          </div>
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Revenue (7d)</div>
          <div className="font-semibold text-lg text-blue-700 dark:text-blue-400">
            {loading ? (
              <span className="text-gray-400">Loading...</span>
            ) : error ? (
              <span className="text-red-500">Error</span>
            ) : metricsSummary?.totalRevenue7d != null && !isNaN(metricsSummary.totalRevenue7d) && metricsSummary.totalRevenue7d > 0 ? (
              formatCurrency(metricsSummary.totalRevenue7d)
            ) : (
              '--'
            )}
          </div>
        </div>
      </div>

      {/* Metrics Table */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-white">Daily Metrics</h2>
          {loading && (
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading...
            </span>
          )}
        </div>

        {error ? (
          <div className="p-6 text-center">
            <div className="text-red-600 dark:text-red-400 mb-2 font-medium">Error loading metrics</div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={loadMetrics}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Date</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">Available</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">Sold</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">Occ%</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">ADR</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">RevPAR</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">Revenue</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">OOO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading && metrics.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-gray-500 dark:text-gray-400">
                      <Skeleton className="w-full h-[85vh]" />
                    </td>
                  </tr>
                ) : metrics.length > 0 ? (
                  metrics.map(m => (
                    <tr key={m.id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-3 py-2 text-gray-900 dark:text-white">{formatDate(m.date)}</td>
                      <td className="px-3 py-2 text-right text-gray-900 dark:text-white">{m.roomsAvailable ?? '—'}</td>
                      <td className="px-3 py-2 text-right text-gray-900 dark:text-white">{m.roomsSold ?? '—'}</td>
                      <td className="px-3 py-2 text-right text-gray-900 dark:text-white">
                        {m.occupancyPct != null && !isNaN(m.occupancyPct) ? `${m.occupancyPct.toFixed(1)}%` : '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900 dark:text-white">
                        {m.adr != null && !isNaN(m.adr) ? `$${m.adr.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900 dark:text-white">
                        {m.revpar != null && !isNaN(m.revpar) ? `$${m.revpar.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900 dark:text-white">
                        {m.totalRevenue != null && !isNaN(m.totalRevenue) ? formatCurrency(m.totalRevenue) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-500 dark:text-gray-400">{m.roomsOutOfOrder ?? '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-gray-500 dark:text-gray-400">
                      No metrics found. Import PMS data for this hotel.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {!error && renderPagination(metricsPage, metricsTotal, onPageChange)}
      </div>
    </>
  );
}
