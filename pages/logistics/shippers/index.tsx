import { useState, useEffect } from "react";
import Link from "next/link";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { canCreateTasks } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";
import { Skeleton } from "@/components/ui/Skeleton";

type Shipper = {
  id: number;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  isActive: boolean;
  venture: { id: number; name: string };
  _count: { loads: number };
};

type Venture = { id: number; name: string };

export default function ShippersListPage() {
  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [ventureOptions, setVentureOptions] = useState<Venture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [ventureFilter, setVentureFilter] = useState<string>("");

  const { effectiveUser } = useEffectiveUser();
  const role = (effectiveUser?.role || "EMPLOYEE") as UserRole;
  const allowCreate = canCreateTasks(role);

  useEffect(() => {
    fetch("/api/ventures?types=LOGISTICS,TRANSPORT&limit=100")
      .then((r) => r.json())
      .then((data) => setVentureOptions(data || []));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (ventureFilter) params.set("ventureId", ventureFilter);
        if (searchQuery) params.set("q", searchQuery);

        const res = await fetch(`/api/logistics/shippers?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load shippers");

        const json = await res.json();
        if (!cancelled) setShippers(json.items || json || []);
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const timer = setTimeout(load, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ventureFilter, searchQuery]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Shippers (Locations)</h1>
          <p className="text-sm text-gray-500 mt-1">
            Operational shipper locations linked to loads (city/state, churn tracking).
          </p>
        </div>
        {allowCreate && (
          <Link
            href="/logistics/shippers/new"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            + New Shipper
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search by name, contact, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm w-64"
        />
        <select
          value={ventureFilter}
          onChange={(e) => setVentureFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">All Ventures</option>
          {ventureOptions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center p-8">
          <Skeleton className="w-full h-[85vh]" />
        </div>
      ) : shippers.length === 0 ? (
        <div className="text-center py-12 border rounded-xl bg-gray-50">
          <div className="text-gray-400 text-3xl mb-3">🏭</div>
          <h3 className="text-gray-700 font-medium mb-1">No Shippers Found</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            {searchQuery || ventureFilter
              ? "No shippers match your current filters."
              : "No shippers have been added yet. Add your first shipper to start tracking freight relationships."}
          </p>
          {allowCreate && !searchQuery && !ventureFilter && (
            <Link
              href="/logistics/shippers/new"
              className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              + New Shipper
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Shipper
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Location
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Venture
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Loads
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {shippers.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/logistics/shippers/${s.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <div>{s.contactName || "-"}</div>
                    <div className="text-gray-400">{s.email || ""}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {[s.city, s.state, s.country].filter(Boolean).join(", ") || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {s.venture?.name || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {s._count?.loads ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

ShippersListPage.title = 'Shippers (Locations)';
