import React, { useEffect, useState } from "react";
import { useTestMode } from "@/contexts/TestModeContext";

interface Venture {
  id: number;
  name: string;
  type: string;
}

interface LossNight {
  id: number;
  date: string;
  hotelId: number;
  hotelName: string;
  hotelCode: string | null;
  city: string | null;
  state: string | null;
  ventureId: number | null;
  ventureName: string | null;
  totalRoom: number | null;
  roomSold: number | null;
  total: number | null;
  dues: number | null;
  lostDues: number | null;
  lossRatio: number | null;
  occupancy: number | null;
  adr: number | null;
  revpar: number | null;
  highLossFlag: boolean;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function formatMoney(v: number | null) {
  if (v === null || v === undefined) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(v);
}

function formatPct(v: number | null) {
  if (v === null || v === undefined) return "-";
  return `${(v * 100).toFixed(1)}%`;
}

export default function LossNightsTab() {
  const [ventures, setVentures] = useState<Venture[]>([]);
  const [selectedVentureId, setSelectedVentureId] = useState<number | "">("");
  const [daysBack, setDaysBack] = useState<string>("30");
  const [items, setItems] = useState<LossNight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { testMode } = useTestMode();

  useEffect(() => {
    fetch("/api/ventures?limit=200")
      .then((r) => r.json())
      .then((list: Venture[]) => {
        const hotelVentures = list.filter(
          (v) => v.type === "HOTEL" || v.type === "HOSPITALITY"
        );
        setVentures(hotelVentures);
      })
      .catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (selectedVentureId) {
        params.set("ventureId", String(selectedVentureId));
      }
      if (daysBack) {
        const n = Number(daysBack);
        if (!Number.isNaN(n) && n > 0) {
          const to = new Date();
          const from = new Date();
          from.setDate(to.getDate() - n);
          params.set("from", from.toISOString().slice(0, 10));
          params.set("to", to.toISOString().slice(0, 10));
        }
      }
      params.set("limit", "200");
      params.set("includeTest", testMode ? "true" : "false");

      const res = await fetch(`/api/hotels/loss-nights?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load data");
      }
      const body = await res.json();
      setItems(body.items || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load loss nights";
      console.error(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVentureId, daysBack, testMode]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Loss Nights</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Shows nights where Lost Dues exceeded thresholds (absolute or % of
            total), so you can drill into leakage.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            className="border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            value={selectedVentureId}
            onChange={(e) =>
              setSelectedVentureId(
                e.target.value ? Number(e.target.value) : ""
              )
            }
          >
            <option value="">All Hotel Ventures</option>
            {ventures.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          <select
            className="border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            value={daysBack}
            onChange={(e) => setDaysBack(e.target.value)}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="py-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {error && (
        <div className="text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No high-loss nights found for this period.</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-slate-600">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-slate-600">Hotel</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-slate-600">Venture</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-slate-600">Rooms</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-slate-600">Sold</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-slate-600">Total</th>
                  <th className="px-4 py-3 text-right font-semibold text-red-600 dark:text-red-400 border-b border-gray-200 dark:border-slate-600">
                    Lost Dues
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-red-600 dark:text-red-400 border-b border-gray-200 dark:border-slate-600">
                    Lost Dues %
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-slate-600">Occ%</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-slate-600">ADR</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-slate-600">RevPAR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {items.map((n) => {
                  const lossPct =
                    n.lossRatio !== null && n.lossRatio !== undefined
                      ? n.lossRatio
                      : n.total && n.total > 0
                      ? (n.lostDues || 0) / n.total
                      : null;

                  const lossClass =
                    lossPct !== null && lossPct >= 0.05
                      ? "text-red-600 dark:text-red-400 font-semibold"
                      : "text-amber-600 dark:text-amber-400";

                  return (
                    <tr key={n.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-900 dark:text-white font-medium">
                        {formatDate(n.date)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {n.hotelName}
                          {n.hotelCode ? ` (${n.hotelCode})` : ""}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                          {[n.city, n.state].filter(Boolean).join(", ")}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-gray-600 dark:text-gray-400">
                        {n.ventureName || "-"}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                        {n.totalRoom ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                        {n.roomSold ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900 dark:text-white font-medium">
                        {formatMoney(n.total)}
                      </td>
                      <td className={`px-4 py-3 text-right ${lossClass}`}>
                        {formatMoney(n.lostDues)}
                      </td>
                      <td className={`px-4 py-3 text-right ${lossClass}`}>
                        {lossPct !== null ? formatPct(lossPct) : "-"}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                        {n.occupancy !== null && n.occupancy !== undefined
                          ? `${n.occupancy.toFixed(1)}%`
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                        {formatMoney(n.adr)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                        {formatMoney(n.revpar)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
