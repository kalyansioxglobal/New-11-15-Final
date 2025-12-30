import { useState, useEffect } from "react";
import Link from "next/link";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { canCreateTasks } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";
import { Skeleton } from "@/components/ui/Skeleton";

type Load = {
  id: number;
  tmsLoadId: string | null;
  reference: string | null;
  shipperName: string | null;
  shipperRef: string | null;
  customerName: string | null;
  customerId: number | null;
  pickupCity: string;
  pickupState: string;
  pickupDate: string;
  dropCity: string;
  dropState: string;
  dropDate: string | null;
  equipmentType: string;
  rate: number | null;
  status: string;
  venture: { id: number; name: string } | null;
  office: { id: number; name: string } | null;
  carrier: { id: number; name: string; mcNumber: string | null } | null;
  createdBy: { id: number; fullName: string } | null;
  csrAlias: { id: number; name: string } | null;
  dispatcherAlias: { id: number; name: string } | null;
  billAmount?: number | null;
  costAmount?: number | null;
  marginAmount?: number | null;
  marginPercentage?: number | null;
  rpm?: number | null;
};

type Venture = { id: number; name: string };
type Office = { id: number; name: string; ventureId: number };

const STATUS_OPTIONS = ["all", "OPEN", "WORKING", "COVERED", "LOST", "DORMANT", "MAYBE"];

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
  WORKING: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
  COVERED: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
  LOST: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
  DORMANT: "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300",
  MAYBE: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300",
};

export default function LoadsListPage() {
  const [loads, setLoads] = useState<Load[]>([]);
  const [ventures, setVentures] = useState<Venture[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<{
    ventureId?: string;
    officeId?: string;
    status?: string;
    q?: string;
  }>({});

  const { effectiveUser } = useEffectiveUser();
  const role = (effectiveUser?.role || "EMPLOYEE") as UserRole;
  const allowCreate = canCreateTasks(role);

  useEffect(() => {
    fetch("/api/freight/meta")
      .then((r) => r.json())
      .then((data) => {
        setVentures(data.ventures || []);
        setOffices(data.offices || []);
      });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (filters.ventureId) params.set("ventureId", filters.ventureId);
        if (filters.officeId) params.set("officeId", filters.officeId);
        if (filters.status && filters.status !== "all") params.set("status", filters.status);
        if (filters.q) params.set("q", filters.q);
        params.set("page", "1");
        params.set("pageSize", "200");

        const res = await fetch(`/api/freight/loads?${params.toString()}`);
        if (!res.ok) {
          throw new Error("Failed to load");
        }

        const json = await res.json();
        if (!cancelled) {
          setLoads(json.items || []);
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
  }, [filters]);

  const filteredOffices = filters.ventureId
    ? offices.filter((o) => o.ventureId === parseInt(filters.ventureId!, 10))
    : offices;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Loads</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            All freight loads across your ventures
          </p>
        </div>
        {allowCreate && (
          <Link
            href="/freight/loads/new"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            + New Load
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-sm items-center">
        <input
          placeholder="Search reference, shipper, city..."
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 w-64 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          value={filters.q || ""}
          onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
        />

        <select
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          value={filters.ventureId || ""}
          onChange={(e) => {
            setFilters((prev) => ({
              ...prev,
              ventureId: e.target.value || undefined,
              officeId: undefined,
            }));
          }}
        >
          <option value="">All ventures</option>
          {ventures.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>

        <select
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          value={filters.officeId || ""}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, officeId: e.target.value || undefined }))
          }
        >
          <option value="">All offices</option>
          {filteredOffices.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>

        <select
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          value={filters.status || "all"}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, status: e.target.value }))
          }
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All statuses" : s}
            </option>
          ))}
        </select>
      </div>

      {loading && <Skeleton className="w-full h-[85vh]" />}
      {error && <div className="text-sm text-red-500 dark:text-red-400">{error}</div>}

      {!loading && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Reference</th>
                  <th className="px-4 py-3 text-left font-semibold">Lane</th>
                  <th className="px-4 py-3 text-left font-semibold">Pickup</th>
                  <th className="px-4 py-3 text-left font-semibold">Equipment</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Carrier</th>
                  <th className="px-4 py-3 text-left font-semibold">CSR</th>
                  <th className="px-4 py-3 text-left font-semibold">Dispatcher</th>
                  <th className="px-4 py-3 text-right font-semibold">Bill</th>
                  <th className="px-4 py-3 text-right font-semibold">Cost</th>
                  <th className="px-4 py-3 text-right font-semibold">Margin</th>
                  <th className="px-4 py-3 text-right font-semibold">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loads.map((load) => (
                  <tr key={load.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3">
                      <Link
                        href={`/freight/loads/${load.id}`}
                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {load.tmsLoadId || load.reference || `#${load.id}`}
                      </Link>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {load.tmsLoadId && load.reference && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">Ref: {load.reference}</span>
                        )}
                        {load.customerName && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">{load.customerName}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">
                      <div className="font-medium">
                        {load.pickupCity}, {load.pickupState}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        to {load.dropCity}, {load.dropState}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {new Date(load.pickupDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{load.equipmentType}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_COLORS[load.status] || "bg-gray-100"
                        }`}
                      >
                        {load.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {load.carrier ? (
                        <Link
                          href={`/freight/carriers/${load.carrier.id}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {load.carrier.name}
                        </Link>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {load.csrAlias?.name || <span className="text-gray-400 dark:text-gray-500">-</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {load.dispatcherAlias?.name || <span className="text-gray-400 dark:text-gray-500">-</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                      {load.billAmount != null ? load.billAmount.toFixed(0) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                      {load.costAmount != null ? load.costAmount.toFixed(0) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                      {load.marginAmount != null ? load.marginAmount.toFixed(0) : "—"}
                    </td>
                    <td
                      className={
                        "px-4 py-3 text-right " +
                        (load.marginPercentage != null && load.marginPercentage < 8
                          ? "text-red-600 dark:text-red-400"
                          : "text-gray-900 dark:text-white")
                      }
                    >
                      {load.marginPercentage != null
                        ? `${load.marginPercentage.toFixed(1)}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
                {loads.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-4 py-12 text-center">
                      <div className="text-gray-400 dark:text-gray-500 text-3xl mb-3">🚚</div>
                      <h3 className="text-gray-700 dark:text-gray-200 font-medium mb-1">No Loads Found</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                        {filters.q || filters.status !== 'all' || filters.ventureId || filters.officeId
                          ? "No loads match your current filters. Try adjusting your search criteria."
                          : "No loads have been added yet. Create your first load to start tracking freight."}
                      </p>
                      {allowCreate && !filters.q && filters.status === 'all' && !filters.ventureId && !filters.officeId && (
                        <Link
                          href="/freight/loads/new"
                          className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          + New Load
                        </Link>
                      )}
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

LoadsListPage.title = "Loads";
