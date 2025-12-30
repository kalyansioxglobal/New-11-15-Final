import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTestMode } from "@/contexts/TestModeContext";
import { Skeleton } from "@/components/ui/Skeleton";

type VentureStatus = "Healthy" | "Attention" | "Critical";

type Venture = {
  id: number;
  name: string;
  type: string;
  logisticsRole: "BROKER" | "CARRIER" | null;
  officesCount: number;
  health: VentureStatus;
};

const roleLabels: Record<string, string> = {
  BROKER: "Broker",
  CARRIER: "Carrier",
};

const STATUS_COLORS: Record<VentureStatus, string> = {
  Healthy: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Attention: "bg-amber-100 text-amber-700 border-amber-200",
  Critical: "bg-rose-100 text-rose-700 border-rose-200",
};

function StatusBadge({ status }: { status: VentureStatus }) {
  const icons = {
    Healthy: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    ),
    Attention: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    ),
    Critical: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
    ),
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${STATUS_COLORS[status] || STATUS_COLORS.Attention}`}
    >
      {icons[status]}
      {status}
    </span>
  );
}

function TypeChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
        active
          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
      }`}
    >
      {label}
    </button>
  );
}

function VenturesPage() {
  const router = useRouter();
  const { testMode } = useTestMode();
  const [ventures, setVentures] = useState<Venture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/overview/ventures?includeTest=${testMode}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load ventures");
        }
        const json = await res.json();
        if (!cancelled) setVentures(json.ventures || []);
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Failed to load ventures");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [testMode]);

  const ventureTypes = useMemo(() => {
    const types = Array.from(new Set(ventures.map((v) => v.type)));
    return ["All", ...types];
  }, [ventures]);

  const filteredVentures = useMemo(() => {
    return ventures.filter((v) => {
      const matchesType = typeFilter === "All" || v.type === typeFilter;
      const matchesSearch =
        !search ||
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        v.type.toLowerCase().includes(search.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [ventures, search, typeFilter]);

  const healthStats = useMemo(() => {
    return ventures.reduce(
      (acc, v) => {
        acc[v.health] = (acc[v.health] || 0) + 1;
        return acc;
      },
      { Healthy: 0, Attention: 0, Critical: 0 } as Record<VentureStatus, number>
    );
  }, [ventures]);

  const handleRowClick = (id: number) => {
    router.push(`/ventures/${id}`);
  };

  if (loading) {
    return (
      <div className="px-8 py-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Ventures</h1>
            <p className="text-sm text-gray-500 mt-1">
              All ventures across logistics, hospitality, BPO and SaaS under central command.
            </p>
          </div>
        </div>
        <Skeleton className="w-full h-[85vh]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-8 py-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Ventures</h1>
            <p className="text-sm text-gray-500 mt-1">
              All ventures across logistics, hospitality, BPO and SaaS under central command.
            </p>
          </div>
        </div>
        <div className="mt-4 p-4 bg-red-50 text-red-800 rounded-lg border border-red-200">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 py-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Ventures</h1>
            <p className="text-sm text-gray-500 mt-1">
              All ventures across logistics, hospitality, BPO and SaaS under central command.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-gray-600">
            <span className="text-gray-500">Total: </span>
            <span className="text-gray-900 font-semibold">{ventures.length}</span>
          </div>
          <div className="h-4 w-px bg-gray-300" />
          <div className="text-gray-600">
            <span className="text-gray-500">Showing: </span>
            <span className="text-gray-900 font-semibold">{filteredVentures.length}</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">Total Ventures</div>
          <div className="text-xl font-bold text-gray-900">{ventures.length}</div>
        </div>
        <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-3 shadow-sm">
          <div className="text-xs text-emerald-700 mb-1">Healthy</div>
          <div className="text-xl font-bold text-emerald-700">{healthStats.Healthy}</div>
        </div>
        <div className="bg-amber-50 rounded-lg border border-amber-200 p-3 shadow-sm">
          <div className="text-xs text-amber-700 mb-1">Attention</div>
          <div className="text-xl font-bold text-amber-700">{healthStats.Attention}</div>
        </div>
        <div className="bg-rose-50 rounded-lg border border-rose-200 p-3 shadow-sm">
          <div className="text-xs text-rose-700 mb-1">Critical</div>
          <div className="text-xl font-bold text-rose-700">{healthStats.Critical}</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {ventureTypes.map((t) => (
            <TypeChip
              key={t}
              label={t}
              active={typeFilter === t}
              onClick={() => setTypeFilter(t)}
            />
          ))}
        </div>

        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by name or type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Venture Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center justify-end gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Offices
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Health Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredVentures.map((venture) => (
                <tr
                  key={venture.id}
                  onClick={() => handleRowClick(venture.id)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors duration-150 group"
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {venture.name}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                      {venture.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {venture.logisticsRole ? (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                        {roleLabels[venture.logisticsRole]}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1.5 tabular-nums font-medium text-gray-900">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      {venture.officesCount}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={venture.health} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link 
                      href={`/ventures/${venture.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium rounded-lg transition-all duration-150"
                    >
                      <span>View</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </td>
                </tr>
              ))}

              {filteredVentures.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-16 text-center"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-3 bg-gray-100 rounded-full">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">
                          {ventures.length === 0
                            ? "No ventures found"
                            : "No ventures match your filters"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {ventures.length === 0
                            ? "Create the first venture in Admin → Ventures"
                            : "Try adjusting your search or filter criteria"}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

VenturesPage.title = "Ventures";

export default VenturesPage;
