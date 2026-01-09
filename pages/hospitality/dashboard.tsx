import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTestMode } from '../../contexts/TestModeContext';
import { Skeleton } from '@/components/ui/Skeleton';

interface HotelCard {
  id: number;
  name: string;
  brand: string | null;
  city: string | null;
  state: string | null;
  rooms: number | null;
  venture: { id: number; name: string };
  avgOcc: number;
  avgAdr: number;
  avgRevpar: number;
  totalRevenue: number;
}

interface HospitalityDashboardData {
  summary: {
    hotelCount: number;
    totalRooms: number;
    globalRevpar: number;
    globalOcc: number;
    globalAdr: number;
    totalRevenue7d: number;
    totalReviews: number;
    avgRating: number;
    recentReviewCount: number;
    unrespondedCount: number;
    sourceCounts: Record<string, number>;
  };
  hotels: HotelCard[];
  topPerformers: HotelCard[];
  underperformers: HotelCard[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function HospitalityDashboard() {
  const { testMode, setTestMode } = useTestMode();
  const [data, setData] = useState<HospitalityDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [ventureId, setVentureId] = useState<number | null>(null);
  const [ventures, setVentures] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    fetch(`/api/ventures?types=HOSPITALITY&includeTest=${testMode}`)
      .then(r => r.json())
      .then(d => {
        setVentures(d as { id: number; name: string }[]);
      })
      .catch(() => {});
  }, [testMode]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (ventureId) params.set('ventureId', String(ventureId));
      params.set('includeTest', testMode ? 'true' : 'false');
      const res = await fetch(`/api/hospitality/dashboard?${params.toString()}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testMode, ventureId]);

  const sum = data?.summary;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Hospitality Dashboard</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Portfolio performance, RevPAR, occupancy, ADR & review health.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {ventures.length > 1 && (
            <select
              value={ventureId || ''}
              onChange={e => setVentureId(e.target.value ? Number(e.target.value) : null)}
              className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-400 dark:focus:ring-blue-500 focus:border-blue-400 dark:focus:border-blue-500"
            >
              <option value="">All Hospitality Ventures</option>
              {ventures.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => setTestMode(!testMode)}
            className={`px-3 py-1 rounded text-sm border ${
              testMode 
                ? 'bg-yellow-200 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-700 text-yellow-900 dark:text-yellow-300' 
                : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-300'
            }`}
          >
            Test Mode: {testMode ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={loadData}
            className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4 text-sm">
        {loading ? (
          <>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-800">
                <Skeleton className="h-3 w-20 mb-2" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-800">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Hotels</div>
              <div className="text-2xl font-semibold text-gray-900 dark:text-white">{sum?.hotelCount ?? '--'}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {sum?.totalRooms ?? '--'} total rooms
              </div>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-800">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Portfolio RevPAR (7d)</div>
              <div className="text-2xl font-semibold text-green-700 dark:text-green-400">
                ${sum?.globalRevpar?.toFixed(2) ?? '--'}
              </div>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-800">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Occupancy (7d)</div>
              <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                {sum?.globalOcc ? sum.globalOcc.toFixed(1) + '%' : '--'}
              </div>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-800">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">ADR (7d)</div>
              <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                ${sum?.globalAdr?.toFixed(2) ?? '--'}
              </div>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-800">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Revenue (7d)</div>
              <div className="text-2xl font-semibold text-blue-700 dark:text-blue-400">
                {sum?.totalRevenue7d ? formatCurrency(sum.totalRevenue7d) : '--'}
              </div>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-800">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reviews</div>
              <div className="text-2xl font-semibold text-gray-900 dark:text-white">{sum?.totalReviews ?? '--'}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Avg: {sum?.avgRating?.toFixed(1) ?? '--'} | Unresponded: {sum?.unrespondedCount ?? 0}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 dark:text-white">Top Performers (by RevPAR)</h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">7-day avg</span>
          </div>
          <div className="space-y-2">
            {loading ? (
              <>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded">
                    <div className="flex items-center gap-2 flex-1">
                      <Skeleton className="w-5 h-5 rounded" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <div className="text-right">
                      <Skeleton className="h-4 w-16 mb-1" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
                ))}
              </>
            ) : data?.topPerformers?.length ? (
              data.topPerformers.map((h, i) => (
                <Link
                  key={h.id}
                  href={`/hospitality/hotels/${h.id}`}
                  className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 flex items-center justify-center text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded">
                      {i + 1}
                    </span>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{h.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {[h.city, h.state].filter(Boolean).join(', ')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-700 dark:text-green-400">${h.avgRevpar.toFixed(2)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{h.avgOcc.toFixed(1)}% occ</div>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">No data available</p>
            )}
          </div>
        </div>

        <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 dark:text-white">Needs Attention (Low Occupancy)</h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">7-day avg</span>
          </div>
          <div className="space-y-2">
            {loading ? (
              <>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded">
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <div className="text-right">
                      <Skeleton className="h-4 w-16 mb-1" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </>
            ) : data?.underperformers?.length ? (
              data.underperformers.map(h => (
                <Link
                  key={h.id}
                  href={`/hospitality/hotels/${h.id}`}
                  className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm transition-colors"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{h.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {[h.city, h.state].filter(Boolean).join(', ')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-red-700 dark:text-red-400">{h.avgOcc.toFixed(1)}%</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">RevPAR ${h.avgRevpar.toFixed(2)}</div>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">No underperforming hotels</p>
            )}
          </div>
        </div>
      </div>

      <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900 dark:text-white">All Hotels (7-day snapshot)</h2>
          {!loading && (
            <Link href="/hospitality/hotels" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              View all
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 text-sm">
          {loading ? (
            <>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <Skeleton className="h-5 w-32 mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Skeleton className="h-3 w-8 mb-1" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                    <div>
                      <Skeleton className="h-3 w-8 mb-1" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                    <div>
                      <Skeleton className="h-3 w-10 mb-1" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : data?.hotels?.length ? (
            data.hotels.map(h => (
              <Link
                key={h.id}
                href={`/hospitality/hotels/${h.id}`}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">{h.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {h.brand && <span className="mr-1">{h.brand}</span>}
                      {[h.city, h.state].filter(Boolean).join(', ') || '—'}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {h.rooms ? `${h.rooms} rooms` : ''}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-gray-500 dark:text-gray-400 mb-0.5">Occ%</div>
                    <div className="font-semibold text-gray-900 dark:text-white">{h.avgOcc.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400 mb-0.5">ADR</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      ${h.avgAdr ? h.avgAdr.toFixed(2) : '--'}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400 mb-0.5">RevPAR</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      ${h.avgRevpar ? h.avgRevpar.toFixed(2) : '--'}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="col-span-3 text-xs text-gray-500 dark:text-gray-400 py-4 text-center">
              No hotels found. Add hotels under a hospitality venture first.
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 p-4">
          <Skeleton className="h-6 w-40 mb-3" />
          <div className="flex flex-wrap gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="border border-gray-200 dark:border-gray-700 rounded px-3 py-2">
                <Skeleton className="h-3 w-16 mb-2" />
                <Skeleton className="h-5 w-8" />
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      ) : sum?.sourceCounts && Object.keys(sum.sourceCounts).length > 0 ? (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 p-4">
          <h2 className="font-semibold mb-3 text-gray-900 dark:text-white">Reviews by Source</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(sum.sourceCounts).map(([source, count]) => (
              <div key={source} className="border border-gray-200 dark:border-gray-700 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800">
                <div className="text-xs text-gray-500 dark:text-gray-400">{source}</div>
                <div className="font-semibold text-gray-900 dark:text-white">{count}</div>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Link href="/hospitality/reviews" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              View all reviews
            </Link>
          </div>
        </div>
      ) : null}

      <p className="text-xs text-gray-400 dark:text-gray-500">
        Test Mode {testMode ? 'ON' : 'OFF'} – when OFF, test data is excluded.
      </p>
    </div>
  );
}

HospitalityDashboard.title = 'Hospitality Dashboard';
