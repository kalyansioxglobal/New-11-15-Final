import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTestMode } from '@/contexts/TestModeContext';
import { Skeleton } from '@/components/ui/Skeleton';

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

export default function HotelsListPage() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [ventureId, setVentureId] = useState<number | null>(null);
  const [ventures, setVentures] = useState<
    { id: number; name: string; type: string }[]
  >([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const { testMode } = useTestMode();

  useEffect(() => {
    fetch(`/api/ventures?types=HOSPITALITY&includeTest=${testMode}`)
      .then(r => r.json())
      .then(d => {
        setVentures(d);
      })
      .catch(() => { });
  }, [testMode]);

  const loadHotels = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (ventureId) params.set('ventureId', String(ventureId));
      params.set('includeTest', testMode ? 'true' : 'false');
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));

      const res = await fetch(
        `/api/hospitality/hotels?${params.toString()}`
      );
      const data = await res.json();

      // Handle both paginated and non-paginated responses for backwards compatibility
      if (data.items) {
        setHotels(data.items);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } else {
        // Fallback for old API format
        setHotels(Array.isArray(data) ? data : []);
        setTotal(Array.isArray(data) ? data.length : 0);
        setTotalPages(1);
      }
    } catch (e) {
      console.error(e);
      setHotels([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Reset to first page when filters change
    setPage(1);
  }, [ventureId, testMode]);

  useEffect(() => {
    loadHotels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ventureId, testMode, page, pageSize]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "RENOVATION":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "CLOSED":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case "SOLD":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hotel Properties</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {loading ? "Loading..." : `${total} hotel${total !== 1 ? "s" : ""} in your portfolio`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {ventures.length > 0 && (
            <select
              value={ventureId || ''}
              onChange={e =>
                setVentureId(
                  e.target.value ? Number(e.target.value) : null
                )
              }
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="">All Ventures</option>
              {ventures.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          )}
          <Link
            href="/hospitality/dashboard"
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/hospitality/hotels/new"
            className="btn flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Hotel
          </Link>
        </div>
      </div>

      {loading ? (
        <Skeleton className="w-full h-[85vh]" />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold text-gray-900 dark:text-white">Name</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-900 dark:text-white">Code</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-900 dark:text-white">Brand</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-900 dark:text-white">Location</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-900 dark:text-white">Rooms</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-900 dark:text-white">Venture</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-900 dark:text-white">Status</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {hotels.length > 0 ? (
                  hotels.map((h) => (
                    <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{h.name}</td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{h.code || "-"}</td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{h.brand || "-"}</td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                        {h.city && h.state ? `${h.city}, ${h.state}` : h.city || h.state || "-"}
                      </td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{h.rooms?.toLocaleString() || "-"}</td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                        <Link
                          href={`/ventures/${h.venture.id}`}
                          className="hover:underline text-blue-600 dark:text-blue-400"
                        >
                          {h.venture.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(h.status)}`}
                        >
                          {h.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/hospitality/hotels/${h.id}`}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium text-sm transition-colors"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <svg
                          className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                          />
                        </svg>
                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">No hotels found</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Click &quot;Add Hotel&quot; to create your first hotel property.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
       
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Showing <span className="font-medium text-gray-900 dark:text-white">{(page - 1) * pageSize + 1}</span> to{" "}
                <span className="font-medium text-gray-900 dark:text-white">{Math.min(page * pageSize, total)}</span> of{" "}
                <span className="font-medium text-gray-900 dark:text-white">{total}</span> hotels
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Page <span className="font-medium text-gray-900 dark:text-white">{page}</span> of{" "}
                  <span className="font-medium text-gray-900 dark:text-white">{totalPages}</span>
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Next
                </button>
              </div>
            </div>
        </div>
      )}
    </div>
  );
}

HotelsListPage.title = 'Hotels';
