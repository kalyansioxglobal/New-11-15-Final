import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { Skeleton } from "@/components/ui/Skeleton";

const ASSET_TYPES = [
  "LAPTOP",
  "DESKTOP",
  "MONITOR",
  "PHONE",
  "ROUTER",
  "SERVER",
  "LICENSE",
  "OTHER",
];

const STATUS_VALUES = ["AVAILABLE", "ASSIGNED", "REPAIR", "LOST", "RETIRED"];

export default function AssetsTab() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [meOnly, setMeOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadAssets = async (pageParam = page) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(pageParam));
      params.set("pageSize", String(pageSize));
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("type", typeFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (meOnly) params.set("me", "true");

      const res = await fetch(`/api/it-assets/list?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to load assets");
      }
      
      setAssets(json.items || []);
      setPage(json.page || pageParam);
      setTotal(json.total || 0);
      setTotalPages(json.totalPages || 1);
    } catch (e: any) {
      setError(e.message || "Unable to load assets");
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets(1);
  }, [statusFilter, typeFilter, searchQuery, meOnly]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        loadAssets(1);
      } else {
        setPage(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    setPage(nextPage);
    loadAssets(nextPage);
  };

  const formatDateTime = (value?: string) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString();
  };

  const renderStatusBadge = (status: string) => {
    const s = (status || "").toUpperCase();
    let color = "bg-gray-100 text-gray-800";
    if (s === "AVAILABLE") color = "bg-emerald-100 text-emerald-800";
    else if (s === "ASSIGNED") color = "bg-indigo-100 text-indigo-800";
    else if (s === "REPAIR") color = "bg-amber-100 text-amber-800";
    else if (s === "LOST") color = "bg-red-100 text-red-800";
    else if (s === "RETIRED") color = "bg-gray-200 text-gray-600";

    return (
      <span
        className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${color}`}
      >
        {s}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            Track hardware and equipment across ventures and offices.
          </p>
        </div>
        <Link href="/it-assets/new" className="inline-flex">
          <Button size="sm">+ Add Asset</Button>
        </Link>
      </div>

      {error && <Alert variant="error" message={error} />}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          {/* Search Bar */}
          <div className="w-full md:max-w-md relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>

            <input
              type="text"
              placeholder="Search by tag, serial number, make, or model..."
              value={searchQuery}
              onChange={(e) => {
                setPage(1);
                setSearchQuery(e.target.value);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>

          {/* Filters */}
          <div className="flex w-full items-center gap-3 text-sm ">
            <Select
              value={statusFilter}
              onChange={(e) => {
                setPage(1);
                setStatusFilter(e.target.value);
              }}
              className="w-36"
            >
              <option value="">All statuses</option>
              {STATUS_VALUES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>

            <Select
              value={typeFilter}
              onChange={(e) => {
                setPage(1);
                setTypeFilter(e.target.value);
              }}
              className="w-40"
            >
              <option value="">All types</option>
              {ASSET_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>

            {searchQuery && (
              <button
                onClick={() => {
                  setPage(1);
                  setSearchQuery("");
                }}
                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear search
              </button>
            )}
          </div>
        </div>
      </div>


      {loading && !assets.length && !error ? (
        <div className="py-10">
          <Skeleton className="w-full h-[70vh]" />
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Tag
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Venture
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Office
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assets.map((a, index) => (
                  <tr
                    key={a.id}
                    className={`hover:bg-indigo-50/50 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                      }`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-mono text-sm font-semibold text-gray-900">{a.tag}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-700">{a.type}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{renderStatusBadge(a.status)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-700">
                        {a.assignedToUser?.fullName || (
                          <span className="text-gray-400 italic">Unassigned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-700">{a.venture?.name || "-"}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-700">{a.office?.name || "-"}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs text-gray-500">{formatDateTime(a.updatedAt)}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/it-assets/${a.id}`}
                          className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                          title="View"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                        <Link
                          href={`/it-assets/${a.id}?edit=true`}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Link>
                        <button
                          onClick={async () => {
                            if (!confirm(`Are you sure you want to delete asset "${a.tag}"? This action cannot be undone.`)) {
                              return;
                            }
                            try {
                              const res = await fetch(`/api/it-assets/${a.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ isDeleted: true }),
                              });
                              if (res.ok) {
                                loadAssets(page);
                              } else {
                                const data = await res.json().catch(() => ({}));
                                alert(data.error || "Failed to delete asset");
                              }
                            } catch (err: any) {
                              alert(err.message || "Failed to delete asset");
                            }
                          }}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!loading && assets.length === 0 && !error && (
                  <tr>
                    <td className="px-4 py-12 text-center text-gray-500 text-sm" colSpan={8}>
                      <div className="flex flex-col items-center justify-center">
                        <svg
                          className="w-12 h-12 text-gray-400 mb-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                          />
                        </svg>
                        <p className="font-medium">No IT assets found</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {searchQuery || statusFilter || typeFilter
                            ? "Try adjusting your filters"
                            : "Get started by creating a new asset"}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-600">
        <div>
          Showing page {page} of {totalPages} ({total} assets)
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
