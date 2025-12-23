import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTestMode } from '../../../contexts/TestModeContext';

interface Hotel {
  id: number;
  name: string;
  brand: string | null;
  code: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  rooms: number | null;
  status: string;
  venture: { id: number; name: string };
}

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

interface DailyReport {
  id: number;
  date: string;
  roomSold: number | null;
  totalRoom: number | null;
  cash: number | null;
  credit: number | null;
  online: number | null;
  refund: number | null;
  total: number | null;
  dues: number | null;
  lostDues: number | null;
  occupancy: number | null;
  adr: number | null;
  revpar: number | null;
  highLossFlag: boolean;
}

interface MetricsSummary {
  avgOcc: number;
  avgAdr: number;
  avgRevpar: number;
  totalRevenue7d: number;
  daysWithData: number;
}

interface Review {
  id: number;
  source: string;
  externalId: string | null;
  reviewerName: string | null;
  rating: number | null;
  title: string | null;
  comment: string | null;
  language: string;
  reviewDate: string | null;
  responseText: string | null;
  respondedAt: string | null;
  respondedBy: { id: number; name: string } | null;
}

interface ReviewsSummary {
  total: number;
  avgRating: number;
  unrespondedCount: number;
  sourceCounts: Record<string, number>;
}

const SOURCE_COLORS: Record<string, string> = {
  GOOGLE: 'bg-blue-100 text-blue-800',
  TRIPADVISOR: 'bg-green-100 text-green-800',
  BOOKING: 'bg-indigo-100 text-indigo-800',
  EXPEDIA: 'bg-yellow-100 text-yellow-800',
  INTERNAL: 'bg-gray-100 text-gray-800',
};

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

export default function HotelDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { testMode } = useTestMode();

  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [metricsSummary, setMetricsSummary] = useState<MetricsSummary | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsSummary, setReviewsSummary] = useState<ReviewsSummary | null>(null);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'reports' | 'reviews'>('overview');

  const loadHotel = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [hRes, mRes, rRes, drRes] = await Promise.all([
        fetch(`/api/hospitality/hotels/${id}`),
        fetch(`/api/hospitality/hotels/${id}/metrics?limit=30&includeTest=${testMode}`),
        fetch(`/api/hospitality/hotels/${id}/reviews?limit=100&includeTest=${testMode}`),
        fetch(`/api/hospitality/hotels/${id}/daily-reports?limit=30`),
      ]);

      if (hRes.ok) {
        const h = await hRes.json();
        setHotel(h);
      }

      if (mRes.ok) {
        const m = await mRes.json();
        setMetrics(m.metrics || []);
        setMetricsSummary(m.summary || null);
      }

      if (rRes.ok) {
        const r = await rRes.json();
        setReviews(r.reviews || []);
        setReviewsSummary(r.summary || null);
      }

      if (drRes.ok) {
        const dr = await drRes.json();
        setDailyReports(dr.reports || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHotel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, testMode]);

  if (loading && !hotel) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Loading hotel...</p>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">Hotel not found.</p>
        <Link href="/hospitality/hotels" className="text-blue-600 underline text-sm mt-2 inline-block">
          Back to Hotels
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">{hotel.name}</h1>
          <p className="text-sm text-gray-600">
            {[hotel.brand, hotel.city, hotel.state, hotel.country]
              .filter(Boolean)
              .join(' | ')}
            {hotel.rooms && ` | ${hotel.rooms} rooms`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/hospitality/hotels"
            className="px-3 py-1 rounded border text-sm bg-white hover:bg-gray-50"
          >
            Back to Hotels
          </Link>
          <Link
            href="/hospitality/dashboard"
            className="px-3 py-1 rounded border text-sm bg-white hover:bg-gray-50"
          >
            Dashboard
          </Link>
        </div>
      </div>

      <div className="border-b text-sm flex gap-4">
        <button
          onClick={() => setTab('overview')}
          className={`pb-2 ${
            tab === 'overview'
              ? 'border-b-2 border-black font-semibold'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setTab('reports')}
          className={`pb-2 ${
            tab === 'reports'
              ? 'border-b-2 border-black font-semibold'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Daily Reports ({dailyReports.length})
        </button>
        <button
          onClick={() => setTab('reviews')}
          className={`pb-2 ${
            tab === 'reviews'
              ? 'border-b-2 border-black font-semibold'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Reviews ({reviewsSummary?.total ?? reviews.length})
        </button>
      </div>

      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div className="border rounded-lg p-3 bg-white">
              <div className="text-xs text-gray-500 mb-1">Rooms</div>
              <div className="font-semibold text-lg">{hotel.rooms ?? '—'}</div>
            </div>
            <div className="border rounded-lg p-3 bg-white">
              <div className="text-xs text-gray-500 mb-1">Occ% (7d)</div>
              <div className="font-semibold text-lg">
                {metricsSummary?.avgOcc?.toFixed(1) ?? '--'}%
              </div>
            </div>
            <div className="border rounded-lg p-3 bg-white">
              <div className="text-xs text-gray-500 mb-1">ADR (7d)</div>
              <div className="font-semibold text-lg">
                ${metricsSummary?.avgAdr?.toFixed(2) ?? '--'}
              </div>
            </div>
            <div className="border rounded-lg p-3 bg-white">
              <div className="text-xs text-gray-500 mb-1">RevPAR (7d)</div>
              <div className="font-semibold text-lg text-green-700">
                ${metricsSummary?.avgRevpar?.toFixed(2) ?? '--'}
              </div>
            </div>
            <div className="border rounded-lg p-3 bg-white">
              <div className="text-xs text-gray-500 mb-1">Revenue (7d)</div>
              <div className="font-semibold text-lg text-blue-700">
                {metricsSummary?.totalRevenue7d
                  ? formatCurrency(metricsSummary.totalRevenue7d)
                  : '--'}
              </div>
            </div>
          </div>

          <div className="border rounded-xl bg-white">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h2 className="font-semibold">Daily Metrics</h2>
              {loading && <span className="text-xs text-gray-500">Loading...</span>}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Date</th>
                    <th className="px-3 py-2 text-right font-medium">Available</th>
                    <th className="px-3 py-2 text-right font-medium">Sold</th>
                    <th className="px-3 py-2 text-right font-medium">Occ%</th>
                    <th className="px-3 py-2 text-right font-medium">ADR</th>
                    <th className="px-3 py-2 text-right font-medium">RevPAR</th>
                    <th className="px-3 py-2 text-right font-medium">Revenue</th>
                    <th className="px-3 py-2 text-right font-medium">OOO</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.length ? (
                    metrics.map(m => (
                      <tr key={m.id} className="border-t hover:bg-gray-50">
                        <td className="px-3 py-2">{formatDate(m.date)}</td>
                        <td className="px-3 py-2 text-right">{m.roomsAvailable}</td>
                        <td className="px-3 py-2 text-right">{m.roomsSold}</td>
                        <td className="px-3 py-2 text-right">{m.occupancyPct.toFixed(1)}%</td>
                        <td className="px-3 py-2 text-right">${m.adr.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">${m.revpar.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(m.totalRevenue)}</td>
                        <td className="px-3 py-2 text-right text-gray-500">{m.roomsOutOfOrder}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                        No metrics found. Import PMS data for this hotel.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'reports' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div className="border rounded-lg p-3 bg-white">
              <div className="text-xs text-gray-500 mb-1">Lost Dues Today</div>
              <div className="font-semibold text-lg text-red-700">
                {(() => {
                  const today = new Date().toDateString();
                  const todayReport = dailyReports.find(r => new Date(r.date).toDateString() === today);
                  return todayReport?.lostDues != null ? formatCurrency(todayReport.lostDues) : '$0';
                })()}
              </div>
            </div>
            <div className="border rounded-lg p-3 bg-white">
              <div className="text-xs text-gray-500 mb-1">30-Day Lost Dues</div>
              <div className="font-semibold text-lg text-red-700">
                {formatCurrency(dailyReports.reduce((sum, r) => sum + (r.lostDues ?? 0), 0))}
              </div>
            </div>
            <div className="border rounded-lg p-3 bg-white">
              <div className="text-xs text-gray-500 mb-1">30-Day Dues</div>
              <div className="font-semibold text-lg text-amber-600">
                {formatCurrency(dailyReports.reduce((sum, r) => sum + (r.dues ?? 0), 0))}
              </div>
            </div>
            <div className="border rounded-lg p-3 bg-white">
              <div className="text-xs text-gray-500 mb-1">Lost Revenue %</div>
              <div className="font-semibold text-lg text-red-700">
                {(() => {
                  const totalRevenue = dailyReports.reduce((sum, r) => sum + (r.total ?? 0), 0);
                  const totalLostDues = dailyReports.reduce((sum, r) => sum + (r.lostDues ?? 0), 0);
                  const lostRevenuePercent = totalRevenue > 0 ? (totalLostDues / totalRevenue) * 100 : 0;
                  return `${lostRevenuePercent.toFixed(1)}%`;
                })()}
              </div>
            </div>
            <div className="border rounded-lg p-3 bg-white">
              <div className="text-xs text-gray-500 mb-1">High Loss Days</div>
              <div className={`font-semibold text-lg ${dailyReports.filter(r => r.highLossFlag).length > 0 ? 'text-red-700' : 'text-green-600'}`}>
                {dailyReports.filter(r => r.highLossFlag).length} of {dailyReports.length}
              </div>
            </div>
          </div>

          <div className="border rounded-xl bg-white">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h2 className="font-semibold">Daily Reports</h2>
              {loading && <span className="text-xs text-gray-500">Loading...</span>}
            </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-center font-medium">Flag</th>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-right font-medium">Rooms</th>
                  <th className="px-3 py-2 text-right font-medium">Sold</th>
                  <th className="px-3 py-2 text-right font-medium">Cash</th>
                  <th className="px-3 py-2 text-right font-medium">Credit</th>
                  <th className="px-3 py-2 text-right font-medium">Online</th>
                  <th className="px-3 py-2 text-right font-medium">Refund</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                  <th className="px-3 py-2 text-right font-medium">Dues</th>
                  <th className="px-3 py-2 text-right font-medium">Lost Dues</th>
                  <th className="px-3 py-2 text-right font-medium">Lost %</th>
                  <th className="px-3 py-2 text-right font-medium">Occ%</th>
                  <th className="px-3 py-2 text-right font-medium">ADR (Net)</th>
                  <th className="px-3 py-2 text-right font-medium">RevPAR</th>
                </tr>
              </thead>
              <tbody>
                {dailyReports.length ? (
                  dailyReports.map(r => (
                    <tr key={r.id} className={`border-t hover:bg-gray-50 ${r.highLossFlag ? 'bg-red-50' : ''}`}>
                      <td className="px-3 py-2 text-center">{r.highLossFlag ? '🚨' : ''}</td>
                      <td className="px-3 py-2">{formatDate(r.date)}</td>
                      <td className="px-3 py-2 text-right">{r.totalRoom ?? '—'}</td>
                      <td className="px-3 py-2 text-right">{r.roomSold ?? '—'}</td>
                      <td className="px-3 py-2 text-right">{r.cash != null ? formatCurrency(r.cash) : '—'}</td>
                      <td className="px-3 py-2 text-right">{r.credit != null ? formatCurrency(r.credit) : '—'}</td>
                      <td className="px-3 py-2 text-right">{r.online != null ? formatCurrency(r.online) : '—'}</td>
                      <td className="px-3 py-2 text-right text-red-600">{r.refund != null ? formatCurrency(r.refund) : '—'}</td>
                      <td className="px-3 py-2 text-right font-medium">{r.total != null ? formatCurrency(r.total) : '—'}</td>
                      <td className="px-3 py-2 text-right text-amber-600">{r.dues != null ? formatCurrency(r.dues) : '—'}</td>
                      <td className="px-3 py-2 text-right text-red-700">{r.lostDues ?? "-"}</td>
                      <td className="px-3 py-2 text-right text-red-700">
                        {r.lostDues != null && r.total != null && r.total > 0 
                          ? `${((r.lostDues / r.total) * 100).toFixed(1)}%` 
                          : '—'}
                      </td>
                      <td className="px-3 py-2 text-right">{r.occupancy != null ? `${r.occupancy.toFixed(1)}%` : '—'}</td>
                      <td className="px-3 py-2 text-right">{r.adr != null ? `$${r.adr.toFixed(2)}` : '—'}</td>
                      <td className="px-3 py-2 text-right">{r.revpar != null ? `$${r.revpar.toFixed(2)}` : '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={15} className="px-3 py-6 text-center text-gray-500">
                      No daily reports found. Upload data via /api/hotels/upload.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {tab === 'reviews' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="border rounded-lg p-3 bg-white">
              <div className="text-xs text-gray-500 mb-1">Total Reviews</div>
              <div className="font-semibold text-lg">{reviewsSummary?.total ?? reviews.length}</div>
            </div>
            <div className="border rounded-lg p-3 bg-white">
              <div className="text-xs text-gray-500 mb-1">Avg Rating</div>
              <div className="font-semibold text-lg">
                {reviewsSummary?.avgRating ? reviewsSummary.avgRating.toFixed(1) : '—'}
              </div>
            </div>
            <div className="border rounded-lg p-3 bg-white">
              <div className="text-xs text-gray-500 mb-1">Unresponded</div>
              <div className={`font-semibold text-lg ${
                (reviewsSummary?.unrespondedCount ?? 0) > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {reviewsSummary?.unrespondedCount ?? 0}
              </div>
            </div>
            <div className="border rounded-lg p-3 bg-white">
              <div className="text-xs text-gray-500 mb-1">Sources</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {reviewsSummary?.sourceCounts &&
                  Object.entries(reviewsSummary.sourceCounts).map(([src, cnt]) => (
                    <span key={src} className={`px-1.5 py-0.5 rounded text-xs ${SOURCE_COLORS[src] || 'bg-gray-100'}`}>
                      {src}: {cnt}
                    </span>
                  ))}
              </div>
            </div>
          </div>

          <div className="border rounded-xl bg-white">
            <div className="px-4 py-3 border-b">
              <h2 className="font-semibold">Latest Reviews</h2>
            </div>
            <div className="divide-y">
              {reviews.length ? (
                reviews.map(r => (
                  <div key={r.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${SOURCE_COLORS[r.source] || 'bg-gray-100'}`}>
                            {r.source}
                          </span>
                          {r.rating && (
                            <span className="text-sm font-semibold">
                              {'★'.repeat(Math.round(r.rating))}{'☆'.repeat(5 - Math.round(r.rating))}
                              <span className="text-gray-600 ml-1">{r.rating.toFixed(1)}</span>
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {formatDate(r.reviewDate)}
                          </span>
                        </div>
                        {r.title && (
                          <div className="font-medium text-sm mb-1">{r.title}</div>
                        )}
                        {r.comment && (
                          <p className="text-sm text-gray-700 line-clamp-3">{r.comment}</p>
                        )}
                        {r.reviewerName && (
                          <div className="text-xs text-gray-500 mt-1">— {r.reviewerName}</div>
                        )}
                      </div>
                      <div className="text-right text-xs">
                        {r.responseText ? (
                          <span className="text-green-600">Responded</span>
                        ) : (
                          <Link
                            href={`/hospitality/reviews?id=${r.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            Respond
                          </Link>
                        )}
                      </div>
                    </div>
                    {r.responseText && (
                      <div className="mt-3 ml-4 pl-3 border-l-2 border-gray-200">
                        <div className="text-xs text-gray-500 mb-1">
                          Response by {r.respondedBy?.name || 'Staff'}
                          {r.respondedAt && ` on ${formatDate(r.respondedAt)}`}
                        </div>
                        <p className="text-sm text-gray-600">{r.responseText}</p>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-gray-500 text-sm">
                  No reviews found for this hotel.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

HotelDetailPage.title = 'Hotel Details';
