import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useTestMode } from "@/contexts/TestModeContext";

interface Hotel {
  id: number;
  name: string;
  code?: string;
  brand?: string;
  city?: string;
  state?: string;
  rooms?: number;
  status: string;
  venture?: { id: number; name: string };
}

function HotelsPage() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const { testMode } = useTestMode();

  const fetchHotels = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("includeTest", testMode ? "true" : "false");
      const res = await fetch(`/api/hospitality/hotels?${params.toString()}`);
      const data = await res.json();
      setHotels(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch hotels:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHotels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testMode]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "RENOVATION":
        return "bg-yellow-100 text-yellow-800";
      case "CLOSED":
        return "bg-red-100 text-red-800";
      case "SOLD":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Hotel Properties</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage hotel properties in your portfolio.
          </p>
        </div>
        <Link
          href="/hotels/new"
          className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
        >
          + Add Hotel
        </Link>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500 dark:text-gray-400">Loading hotels...</div>
      ) : (
        <div className="overflow-auto border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="text-left px-3 py-2 border-b border-gray-200 dark:border-gray-600 font-medium text-gray-700 dark:text-gray-200">Name</th>
                <th className="text-left px-3 py-2 border-b border-gray-200 dark:border-gray-600 font-medium text-gray-700 dark:text-gray-200">Code</th>
                <th className="text-left px-3 py-2 border-b border-gray-200 dark:border-gray-600 font-medium text-gray-700 dark:text-gray-200">Brand</th>
                <th className="text-left px-3 py-2 border-b border-gray-200 dark:border-gray-600 font-medium text-gray-700 dark:text-gray-200">Location</th>
                <th className="text-left px-3 py-2 border-b border-gray-200 dark:border-gray-600 font-medium text-gray-700 dark:text-gray-200">Rooms</th>
                <th className="text-left px-3 py-2 border-b border-gray-200 dark:border-gray-600 font-medium text-gray-700 dark:text-gray-200">Venture</th>
                <th className="text-left px-3 py-2 border-b border-gray-200 dark:border-gray-600 font-medium text-gray-700 dark:text-gray-200">Status</th>
                <th className="text-left px-3 py-2 border-b border-gray-200 dark:border-gray-600 font-medium text-gray-700 dark:text-gray-200"></th>
              </tr>
            </thead>
            <tbody>
              {hotels.map((h) => (
                <tr key={h.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{h.name}</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{h.code || "-"}</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{h.brand || "-"}</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                    {h.city && h.state ? `${h.city}, ${h.state}` : h.city || h.state || "-"}
                  </td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{h.rooms || "-"}</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{h.venture?.name || "-"}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                        h.status
                      )}`}
                    >
                      {h.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/hotels/${h.id}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {!hotels.length && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-4 text-center text-sm text-gray-500"
                  >
                    No hotels found. Click &quot;Add Hotel&quot; to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

HotelsPage.title = "Hotels";

export default HotelsPage;
