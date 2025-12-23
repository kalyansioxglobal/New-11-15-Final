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
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Loss Nights</h2>
          <p className="text-sm text-slate-400">
            Shows nights where Lost Dues exceeded thresholds (absolute or % of
            total), so you can drill into leakage.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            className="border border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-slate-800 text-slate-200"
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
            className="border border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-slate-800 text-slate-200"
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
        <div className="mb-4 text-sm text-red-400 bg-red-900/30 border border-red-700 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="border border-slate-700 rounded-xl bg-slate-800 p-6 text-sm text-slate-400">
          No high-loss nights found for this period.
        </div>
      )}

      {items.length > 0 && (
        <div className="border border-slate-700 rounded-xl bg-slate-800 overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-700">
              <tr>
                <th className="px-3 py-2 text-left text-slate-200">Date</th>
                <th className="px-3 py-2 text-left text-slate-200">Hotel</th>
                <th className="px-3 py-2 text-left text-slate-200">Venture</th>
                <th className="px-3 py-2 text-right text-slate-200">Rooms</th>
                <th className="px-3 py-2 text-right text-slate-200">Sold</th>
                <th className="px-3 py-2 text-right text-slate-200">Total</th>
                <th className="px-3 py-2 text-right text-red-400">
                  Lost Dues
                </th>
                <th className="px-3 py-2 text-right text-red-400">
                  Lost Dues %
                </th>
                <th className="px-3 py-2 text-right text-slate-200">Occ%</th>
                <th className="px-3 py-2 text-right text-slate-200">ADR</th>
                <th className="px-3 py-2 text-right text-slate-200">RevPAR</th>
              </tr>
            </thead>
            <tbody>
              {items.map((n) => {
                const lossPct =
                  n.lossRatio !== null && n.lossRatio !== undefined
                    ? n.lossRatio
                    : n.total && n.total > 0
                    ? (n.lostDues || 0) / n.total
                    : null;

                const lossClass =
                  lossPct !== null && lossPct >= 0.05
                    ? "text-red-400 font-semibold"
                    : "text-amber-400";

                return (
                  <tr key={n.id} className="border-t border-slate-700">
                    <td className="px-3 py-2 whitespace-nowrap text-slate-300">
                      {formatDate(n.date)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-200">
                        {n.hotelName}
                        {n.hotelCode ? ` (${n.hotelCode})` : ""}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {[n.city, n.state].filter(Boolean).join(", ")}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-slate-400">
                      {n.ventureName || "-"}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-300">
                      {n.totalRoom ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-300">
                      {n.roomSold ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-300">
                      {formatMoney(n.total)}
                    </td>
                    <td className={`px-3 py-2 text-right ${lossClass}`}>
                      {formatMoney(n.lostDues)}
                    </td>
                    <td className={`px-3 py-2 text-right ${lossClass}`}>
                      {lossPct !== null ? formatPct(lossPct) : "-"}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-300">
                      {n.occupancy !== null && n.occupancy !== undefined
                        ? `${n.occupancy.toFixed(1)}%`
                        : "-"}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-300">
                      {formatMoney(n.adr)}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-300">
                      {formatMoney(n.revpar)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
