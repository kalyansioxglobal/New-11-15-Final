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

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-600',
  RENOVATION: 'bg-yellow-100 text-yellow-800',
  SOLD: 'bg-red-100 text-red-800',
};

export default function HotelsListPage() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [ventureId, setVentureId] = useState<number | null>(null);
  const [ventures, setVentures] = useState<
    { id: number; name: string; type: string }[]
  >([]);
  const { testMode } = useTestMode();

  useEffect(() => {
    fetch(`/api/ventures?types=HOSPITALITY&includeTest=${testMode}`)
      .then(r => r.json())
      .then(d => {
        setVentures(d);
      })
      .catch(() => {});
  }, [testMode]);

  const loadHotels = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (ventureId) params.set('ventureId', String(ventureId));
      params.set('includeTest', testMode ? 'true' : 'false');

      const res = await fetch(
        `/api/hospitality/hotels?${params.toString()}`
      );
      const data = await res.json();
      setHotels(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHotels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ventureId, testMode]);

  const totalRooms = hotels.reduce((sum, h) => sum + (h.rooms || 0), 0);

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Hotels</h1>
          <p className="text-sm text-gray-600">
            {loading ? 'Loading…' : `${hotels.length} hotels | ${totalRooms} total rooms`}
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
              className="border rounded px-2 py-1 text-sm"
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
            className="px-3 py-1 rounded border text-sm bg-white hover:bg-gray-50"
          >
            Dashboard
          </Link>

          <Link
            href="/hospitality/hotels/new"
            className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            + New Hotel
          </Link>
        </div>
      </div>

      {/* Table / Skeleton */}
      {loading ? (
        <div className="border rounded-xl bg-white p-4 space-y-3">
          <Skeleton className="h-6 w-40" />
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <div className="border rounded-xl bg-white">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold text-sm">All Hotels</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Name</th>
                  <th className="px-4 py-2 text-left font-medium">Brand</th>
                  <th className="px-4 py-2 text-left font-medium">Location</th>
                  <th className="px-4 py-2 text-left font-medium">Venture</th>
                  <th className="px-4 py-2 text-right font-medium">Rooms</th>
                  <th className="px-4 py-2 text-center font-medium">Status</th>
                </tr>
              </thead>

              <tbody>
                {hotels.length ? (
                  hotels.map(h => (
                    <tr
                      key={h.id}
                      className="border-t hover:bg-gray-50"
                    >
                      <td className="px-4 py-2">
                        <Link
                          href={`/hospitality/hotels/${h.id}`}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {h.name}
                        </Link>
                        {h.code && (
                          <span className="text-xs text-gray-500 ml-2">
                            ({h.code})
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-2 text-gray-600">
                        {h.brand || '—'}
                      </td>

                      <td className="px-4 py-2 text-gray-600">
                        {[h.city, h.state, h.country]
                          .filter(Boolean)
                          .join(', ') || '—'}
                      </td>

                      <td className="px-4 py-2 text-gray-600">
                        <Link
                          href={`/ventures/${h.venture.id}`}
                          className="hover:underline"
                        >
                          {h.venture.name}
                        </Link>
                      </td>

                      <td className="px-4 py-2 text-right">
                        {h.rooms ?? '—'}
                      </td>

                      <td className="px-4 py-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            STATUS_COLORS[h.status] ||
                            'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {h.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-gray-500 text-sm"
                    >
                      No hotels found. Add hotels under a hospitality venture.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

HotelsListPage.title = 'Hotels';
