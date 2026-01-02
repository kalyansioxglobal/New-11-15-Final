import { useState, useEffect } from "react";
import Link from "next/link";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { isSuperAdmin } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";
import { Skeleton } from "@/components/ui/Skeleton";

type Asset = {
  id: number;
  name: string;
  type: string;
  location: string | null;
  valueEstimate: number | null;
  acquiredDate: string | null;
  notes: string | null;
  isActive: boolean;
  venture: { id: number; name: string } | null;
};

type Summary = {
  totalAssets: number;
  totalValue: number;
  byType: Record<string, number>;
};

type Venture = { id: number; name: string };

const ASSET_TYPE_COLORS: Record<string, string> = {
  "real_estate": "bg-blue-100 text-blue-800",
  "vehicle": "bg-green-100 text-green-800",
  "equipment": "bg-yellow-100 text-yellow-800",
  "investment": "bg-purple-100 text-purple-800",
  "intellectual_property": "bg-pink-100 text-pink-800",
  "other": "bg-gray-100 text-gray-800",
};

export default function AssetsListPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [holdingsVentures, setHoldingsVentures] = useState<Venture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ventureFilter, setVentureFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(30);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const { effectiveUser } = useEffectiveUser();
  const role = (effectiveUser?.role || "EMPLOYEE") as UserRole;
  const allowCreate = isSuperAdmin(role);

  useEffect(() => {
    fetch("/api/ventures?types=HOLDINGS")
      .then((r) => r.json())
      .then((data) => setHoldingsVentures(data || []));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (ventureFilter) params.set("ventureId", ventureFilter);
        if (typeFilter) params.set("type", typeFilter);
        params.set("page", String(page));
        params.set("pageSize", String(pageSize));

        const res = await fetch(`/api/holdings/assets?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load assets");

        const json = await res.json();
        if (!cancelled) {
          setAssets(json.assets);
          setSummary(json.summary);
          if (json.pagination) {
            setTotalPages(json.pagination.totalPages || 1);
            setTotalCount(json.pagination.totalCount || 0);
          }
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [ventureFilter, typeFilter, page, pageSize]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [ventureFilter, typeFilter]);

  const assetTypes = Array.from(new Set(assets.map((a) => a.type)));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Holdings Assets</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track and manage company assets
          </p>
        </div>
        {allowCreate && (
          <Link
            href="/holdings/assets/new"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            + New Asset
          </Link>
        )}
      </div>

      {summary && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-gray-500">Total Assets</div>
            <div className="text-2xl font-semibold mt-1">{summary.totalAssets}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-gray-500">Total Value</div>
            <div className="text-2xl font-semibold mt-1 text-green-600">
              ${summary.totalValue.toLocaleString()}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-gray-500">Asset Types</div>
            <div className="text-2xl font-semibold mt-1">
              {Object.keys(summary.byType).length}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={ventureFilter}
          onChange={(e) => setVentureFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">All Ventures</option>
          {holdingsVentures.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">All Types</option>
          {assetTypes.map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
      )}

      {loading ? (
       <Skeleton className="w-full h-[85vh]" />
      ) : assets.length === 0 ? (
        <div className="text-center py-12 border rounded-xl bg-gray-50">
          <div className="text-gray-400 text-3xl mb-3">🏠</div>
          <h3 className="text-gray-700 font-medium mb-1">No Assets Found</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">
            {ventureFilter || typeFilter 
              ? "No assets match your current filters. Try adjusting the filters above."
              : "No company assets have been recorded yet."}
          </p>
          {allowCreate && !ventureFilter && !typeFilter && (
            <p className="text-xs text-gray-400">
              Assets are typically populated from integrations or added by administrators.
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {assets.map((a) => (
            <Link
              key={a.id}
              href={`/holdings/assets/${a.id}`}
              className="block p-4 bg-white rounded-lg border hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-gray-900">{a.name}</h3>
                  <span
                    className={`inline-block px-2 py-0.5 text-xs rounded-full mt-1 ${
                      ASSET_TYPE_COLORS[a.type] || ASSET_TYPE_COLORS.other
                    }`}
                  >
                    {a.type.replace(/_/g, " ")}
                  </span>
                </div>
                {a.valueEstimate && (
                  <span className="text-lg font-semibold text-green-600">
                    ${a.valueEstimate.toLocaleString()}
                  </span>
                )}
              </div>
              {a.location && (
                <p className="text-sm text-gray-600 mt-2">{a.location}</p>
              )}
              {a.venture && (
                <div className="mt-2 text-xs text-gray-400">
                  {a.venture.name}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {!loading && assets.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} assets
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Previous
            </button>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Page {page} of {totalPages}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

AssetsListPage.title = "Holdings Assets";
