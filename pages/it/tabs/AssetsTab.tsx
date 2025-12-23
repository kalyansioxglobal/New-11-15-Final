import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";

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
      if (meOnly) params.set("me", "true");

      const res = await fetch(`/api/it/assets?${params.toString()}`);
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
  }, [statusFilter, typeFilter, meOnly]);

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

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="inline-flex items-center gap-2 text-xs text-gray-700">
          <input
            type="checkbox"
            checked={meOnly}
            onChange={(e) => setMeOnly(e.target.checked)}
          />
          <span>Only my assets</span>
        </label>

        <Select
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
          className="w-40"
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
      </div>

      {loading && !assets.length && !error ? (
        <div className="py-10">
          <Alert variant="info" message="Loading assets…" />
        </div>
      ) : (
        <div className="overflow-x-auto bg-white border border-gray-200 rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Tag</th>
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Assigned To</th>
                <th className="p-2 text-left">Venture</th>
                <th className="p-2 text-left">Office</th>
                <th className="p-2 text-left">Last Updated</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id} className="border-t border-gray-200 hover:bg-gray-50">
                  <td className="p-2 font-mono text-gray-800">{a.tag}</td>
                  <td className="p-2 text-gray-700">{a.type}</td>
                  <td className="p-2">{renderStatusBadge(a.status)}</td>
                  <td className="p-2 text-sm">{a.assignedToUser?.fullName || "-"}</td>
                  <td className="p-2 text-sm">{a.venture?.name || "-"}</td>
                  <td className="p-2 text-sm">{a.office?.name || "-"}</td>
                  <td className="p-2 text-xs text-gray-500">
                    {formatDateTime(a.updatedAt)}
                  </td>
                  <td className="p-2 text-right">
                    <Link
                      href={`/it-assets/${a.id}`}
                      className="text-indigo-600 hover:underline text-sm font-medium"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}

              {!loading && assets.length === 0 && !error && (
                <tr>
                  <td className="p-4 text-center text-gray-500 text-sm" colSpan={8}>
                    No IT assets match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
