import React, { useEffect, useMemo, useState } from "react";
import { PageWithLayout } from "@/types/page";
import { BaseTimeSeriesChart } from "@/components/charts/BaseTimeSeriesChart";
import type { TimeSeriesPoint } from "@/components/charts/BaseTimeSeriesChart";
import type { MetricFormat } from "@/lib/analytics/metrics";

interface VentureOption {
  id: number;
  name: string;
}

interface VentureUserSummary {
  userId: number;
  userName: string;
  email: string | null;
  role: string | null;
  totalAmount: number;
  daysWithIncentives: number;
}

interface VentureSummaryResponse {
  ventureId: number;
  from: string;
  to: string;
  items: VentureUserSummary[];
  totalAmount: number;
}

interface UserDailyItem {
  date: string;
  amount: number;
  note: string | null;
}

interface UserDailyResponse {
  userId: number;
  ventureId: number;
  from: string;
  to: string;
  items: UserDailyItem[];
  totalAmount: number;
}

interface VentureTimeseriesResponse {
  ventureId: number;
  from: string;
  to: string;
  points: { date: string; amount: number }[];
}

interface UserTimeseriesResponse {
  userId: number;
  ventureId: number;
  from: string;
  to: string;
  points: { date: string; amount: number }[];
}

interface IncentiveAuditResponse {
  userId: number;
  ventureId: number;
  date: string;
  amount: number;
  breakdown: any | null;
}

const AdminVentureIncentivesPage: PageWithLayout = () => {
  const [ventures, setVentures] = useState<VentureOption[]>([]);
  const [selectedVentureId, setSelectedVentureId] = useState<number | "">("");
  const [ventureName, setVentureName] = useState<string | null>(null);

  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [quickRange, setQuickRange] = useState<"7d" | "30d" | null>("30d");

  const [data, setData] = useState<VentureSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedUser, setSelectedUser] = useState<VentureUserSummary | null>(null);
  const [userDaily, setUserDaily] = useState<UserDailyResponse | null>(null);
  const [userDailyLoading, setUserDailyLoading] = useState(false);
  const [userDailyError, setUserDailyError] = useState<string | null>(null);
  const [userQuickRange, setUserQuickRange] = useState<"7d" | "30d" | "full" | null>("full");

  const [ventureSeries, setVentureSeries] = useState<VentureTimeseriesResponse | null>(null);
  const [ventureSeriesLoading, setVentureSeriesLoading] = useState(false);
  const [userSeries, setUserSeries] = useState<UserTimeseriesResponse | null>(null);
  const [userSeriesLoading, setUserSeriesLoading] = useState(false);

  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditData, setAuditData] = useState<IncentiveAuditResponse | null>(null);

  // Seed initial date range
  useEffect(() => {
    const now = new Date();
    const toDay = now.toISOString().slice(0, 10);
    const fromDate = new Date(now);
    fromDate.setDate(fromDate.getDate() - 29);
    const fromDay = fromDate.toISOString().slice(0, 10);
    setFrom(fromDay);
    setTo(toDay);
  }, []);

  // Load ventures
  useEffect(() => {
    let cancelled = false;

    async function loadVentures() {
      try {
        const res = await fetch("/api/ventures");
        if (!res.ok) throw new Error("Failed to load ventures");
        const json = await res.json();
        const opts: VentureOption[] = (json || []).map((v: any) => ({
          id: v.id,
          name: v.name,
        }));
        if (!cancelled) setVentures(opts);
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Failed to load ventures");
      }
    }

    loadVentures();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyQuickRange = (preset: "7d" | "30d") => {
    const now = new Date();
    const toDay = now.toISOString().slice(0, 10);
    const fromDate = new Date(now);
    fromDate.setDate(fromDate.getDate() - (preset === "7d" ? 6 : 29));
    const fromDay = fromDate.toISOString().slice(0, 10);
    setQuickRange(preset);
    setFrom(fromDay);
    setTo(toDay);
  };

  const clearFilters = () => {
    setQuickRange(null);
    setFrom("");
    setTo("");
    setData(null);
    setSelectedUser(null);
    setUserDaily(null);
    setVentureSeries(null);
    setUserSeries(null);
  };

  const canRun = !!selectedVentureId && !!from && !!to && !loading;

  const loadVentureTimeseries = async (ventureId: number, fromDate: string, toDate: string) => {
    setVentureSeriesLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("ventureId", String(ventureId));
      params.set("from", fromDate);
      params.set("to", toDate);
      const res = await fetch(`/api/incentives/venture-timeseries?${params.toString()}`);
      const json: VentureTimeseriesResponse = await res.json();
      if (!res.ok) {
        throw new Error((json as any).error || "Failed to load venture chart data");
      }
      setVentureSeries(json);
    } catch (e) {
      console.error("Venture timeseries load failed", e);
    } finally {
      setVentureSeriesLoading(false);
    }
  };

  const handleRun = async () => {
    if (!selectedVentureId || typeof selectedVentureId !== "number") return;

    setLoading(true);
    setError(null);
    setData(null);
    setSelectedUser(null);
    setUserDaily(null);
    setVentureSeries(null);
    setUserSeries(null);

    try {
      const params = new URLSearchParams();
      params.set("ventureId", String(selectedVentureId));
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await fetch(`/api/incentives/venture-summary?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to load venture incentives");
      }
      setData(json);
      const v = ventures.find((x) => x.id === json.ventureId);
      setVentureName(v?.name ?? null);

      await loadVentureTimeseries(json.ventureId, json.from, json.to);
    } catch (e: any) {
      setError(e?.message || "Failed to load venture incentives");
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = data?.totalAmount ?? 0;
  const items = data?.items ?? [];

  const summaryRange = useMemo(() => {
    if (!data) return "";
    return `${data.from} → ${data.to}`;
  }, [data]);

  const loadUserDaily = async (
    user: VentureUserSummary,
    rangePreset: "7d" | "30d" | "full" | null,
  ) => {
    if (!data || !selectedVentureId || typeof selectedVentureId !== "number") return;

    setUserDailyLoading(true);
    setUserDailyError(null);
    setUserDaily(null);
    setUserQuickRange(rangePreset ?? "full");
    setUserSeries(null);

    try {
      let fromDate = data.from;
      let toDate = data.to;

      const now = new Date();
      if (rangePreset === "7d") {
        const toDay = now.toISOString().slice(0, 10);
        const fromD = new Date(now);
        fromD.setDate(fromD.getDate() - 6);
        fromDate = fromD.toISOString().slice(0, 10);
        toDate = toDay;
      } else if (rangePreset === "30d") {
        const toDay = now.toISOString().slice(0, 10);
        const fromD = new Date(now);
        fromD.setDate(fromD.getDate() - 29);
        fromDate = fromD.toISOString().slice(0, 10);
        toDate = toDay;
      }

      const params = new URLSearchParams();
      params.set("ventureId", String(selectedVentureId));
      params.set("userId", String(user.userId));
      params.set("from", fromDate);
      params.set("to", toDate);

      const res = await fetch(`/api/incentives/user-daily?${params.toString()}`);
      const json: UserDailyResponse = await res.json();
      if (!res.ok) {
        throw new Error((json as any).error || "Failed to load user incentives");
      }
      setUserDaily(json);

      try {
        const tsRes = await fetch(`/api/incentives/user-timeseries?${params.toString()}`);
        const tsJson: UserTimeseriesResponse = await tsRes.json();
        if (tsRes.ok) {
          setUserSeries(tsJson);
        } else {
          console.error("User timeseries load failed", tsJson);
        }
      } catch (e) {
        console.error("User timeseries request failed", e);
      }
    } catch (e: any) {
      setUserDailyError(e?.message || "Failed to load user incentives");
    } finally {
      setUserDailyLoading(false);
    }
  };

  const handleSelectUser = (u: VentureUserSummary) => {
    setSelectedUser(u);
    loadUserDaily(u, "full");
  };

  const userDailyNonZeroDays = useMemo(
    () =>
      userDaily?.items.filter((d) => (d.amount ?? 0) > 0).length ?? 0,
    [userDaily],
  );

  const ventureChartData: TimeSeriesPoint[] = useMemo(() => {
    if (!ventureSeries) return [];
    return ventureSeries.points.map((p) => ({ date: p.date, value: p.amount }));
  }, [ventureSeries]);

  const userChartData: TimeSeriesPoint[] = useMemo(() => {
    if (!userSeries) return [];
    return userSeries.points.map((p) => ({ date: p.date, value: p.amount }));
  }, [userSeries]);

  const currencyFormat: MetricFormat = "currency";

  const openAudit = async (item: UserDailyItem) => {
    if (!selectedUser || !selectedVentureId || typeof selectedVentureId !== "number") return;

    setAuditLoading(true);
    setAuditError(null);
    setAuditData(null);

    try {
      const params = new URLSearchParams();
      params.set("userId", String(selectedUser.userId));
      params.set("ventureId", String(selectedVentureId));
      params.set("date", item.date);
      const res = await fetch(`/api/incentives/audit-daily?${params.toString()}`);
      const json: IncentiveAuditResponse = await res.json();
      if (!res.ok) {
        throw new Error((json as any).error || "Failed to load audit info");
      }
      setAuditData(json);
    } catch (e: any) {
      setAuditError(e?.message || "Failed to load audit info");
    } finally {
      setAuditLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Venture Incentive Summary</h1>
          <p className="text-xs text-gray-500 mt-1">
            View per-user incentive totals for a venture over a selected period, with venture and user-level charts and daily details.
          </p>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-600 border border-red-300 rounded px-3 py-2 bg-red-50">
          {error}
        </div>
      )}

      <div className="rounded border border-gray-200 bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="space-y-1">
              <div className="text-xs text-gray-600">Venture</div>
              <select
                value={selectedVentureId}
                onChange={(e) => {
                  const v = e.target.value;
                  setSelectedVentureId(v ? Number(v) : "");
                }}
                className="rounded border border-gray-300 px-2 py-1 text-xs min-w-[200px]"
              >
                <option value="">Select venture…</option>
                {ventures.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Quick range:</span>
              <button
                type="button"
                onClick={() => applyQuickRange("7d")}
                className={`px-2 py-0.5 rounded-full border text-xs ${
                  quickRange === "7d"
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-300 text-gray-700 bg-white"
                }`}
              >
                Last 7 days
              </button>
              <button
                type="button"
                onClick={() => applyQuickRange("30d")}
                className={`px-2 py-0.5 rounded-full border text-xs ${
                  quickRange === "30d"
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-300 text-gray-700 bg-white"
                }`}
              >
                Last 30 days
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-gray-500">From</span>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="rounded border border-gray-300 px-2 py-1 text-xs"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500">To</span>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="rounded border border-gray-300 px-2 py-1 text-xs"
                />
              </div>
              <button
                type="button"
                onClick={handleRun}
                disabled={!canRun}
                className="px-3 py-1.5 rounded bg-black text-white text-xs disabled:opacity-60"
              >
                {loading ? "Loading…" : "View summary"}
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="px-2 py-1 rounded border border-gray-200 text-xs text-gray-500 bg-gray-50"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {data && (
          <div className="flex flex-wrap gap-6 text-sm pt-2">
            <div>
              <div className="text-xs text-gray-500">Venture</div>
              <div className="text-sm font-semibold">
                {ventureName || `Venture #${data.ventureId}`}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Period</div>
              <div className="text-sm font-semibold">{summaryRange}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Total incentives</div>
              <div className="text-sm font-semibold">{totalAmount.toFixed(2)}</div>
            </div>
          </div>
        )}

        <div className="mt-4">
          <div className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
            Daily incentives – venture
          </div>
          {ventureSeriesLoading ? (
            <div className="text-xs text-gray-500">Loading chart…</div>
          ) : ventureChartData.length === 0 ? (
            <div className="text-xs text-gray-500">
              No incentive data available for this period.
            </div>
          ) : (
            <BaseTimeSeriesChart
              data={ventureChartData}
              format={currencyFormat}
              chartType="line"
              yAxisLabel="Incentives"
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr,1.4fr] gap-4">
        <div className="rounded border border-gray-200 bg-white p-4">
          <div className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
            Users in venture
          </div>
          {loading ? (
            <div className="text-xs text-gray-500">Loading…</div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-[11px] text-left">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    <th className="py-1.5 px-2 border-b">User</th>
                    <th className="py-1.5 px-2 border-b">Role</th>
                    <th className="py-1.5 px-2 border-b text-right">Total incentives</th>
                    <th className="py-1.5 px-2 border-b text-right">Days with incentives</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((u) => (
                    <tr
                      key={u.userId}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleSelectUser(u)}
                    >
                      <td className="py-1.5 px-2">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800">{u.userName}</span>
                          {u.email && (
                            <span className="text-[10px] text-gray-500">{u.email}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-1.5 px-2">
                        <span className="uppercase text-[10px] text-gray-500">{u.role || ""}</span>
                      </td>
                      <td className="py-1.5 px-2 text-right font-semibold">
                        {u.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-1.5 px-2 text-right">
                        {u.daysWithIncentives}
                      </td>
                    </tr>
                  ))}
                  {!loading && items.length === 0 && data && (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-3 text-center text-xs text-gray-500"
                      >
                        No incentives recorded for this venture in the selected period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded border border-gray-200 bg-white p-4 min-h-[260px] flex flex-col gap-3">
          <div className="text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
            User daily breakdown
          </div>
          {!selectedUser ? (
            <div className="text-xs text-gray-500">
              Select a user from the table to view their daily incentives.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs">
                <div>
                  <div className="text-gray-500">User</div>
                  <div className="text-sm font-semibold">{selectedUser.userName}</div>
                  {selectedUser.email && (
                    <div className="text-[10px] text-gray-500">{selectedUser.email}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-gray-500">Role</div>
                  <div className="text-sm font-semibold uppercase">
                    {selectedUser.role || ""}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] mt-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-gray-500">Range:</span>
                  <button
                    type="button"
                    onClick={() => loadUserDaily(selectedUser, "7d")}
                    className={`px-2 py-0.5 rounded-full border ${
                      userQuickRange === "7d"
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-300 text-gray-700 bg-white"
                    }`}
                  >
                    Last 7 days
                  </button>
                  <button
                    type="button"
                    onClick={() => loadUserDaily(selectedUser, "30d")}
                    className={`px-2 py-0.5 rounded-full border ${
                      userQuickRange === "30d"
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-300 text-gray-700 bg-white"
                    }`}
                  >
                    Last 30 days
                  </button>
                  <button
                    type="button"
                    onClick={() => loadUserDaily(selectedUser, "full")}
                    className={`px-2 py-0.5 rounded-full border ${
                      userQuickRange === "full"
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-300 text-gray-700 bg-white"
                    }`}
                  >
                    Full window
                  </button>
                </div>
                {userDaily && (
                  <div className="flex gap-4 text-[11px] text-gray-600">
                    <div>
                      <span className="text-gray-500 mr-1">Total:</span>
                      <span className="font-semibold">{userDaily.totalAmount.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 mr-1">Days with incentives:</span>
                      <span className="font-semibold">{userDailyNonZeroDays}</span>
                    </div>
                  </div>
                )}
              </div>

              {userSeriesLoading ? (
                <div className="text-xs text-gray-500 mt-2">Loading user chart…</div>
              ) : userChartData.length > 0 ? (
                <div className="mt-2">
                  <BaseTimeSeriesChart
                    data={userChartData}
                    format={currencyFormat}
                    chartType="line"
                    yAxisLabel="Incentives"
                  />
                </div>
              ) : (
                <div className="text-xs text-gray-500 mt-2">
                  No chart data for this window.
                </div>
              )}

              <div className="flex-1 mt-2 border border-gray-100 rounded bg-gray-50 p-2 overflow-auto">
                {userDailyLoading ? (
                  <div className="text-xs text-gray-500">Loading daily incentives…</div>
                ) : userDailyError ? (
                  <div className="text-xs text-red-600">{userDailyError}</div>
                ) : userDaily && userDaily.items.length > 0 ? (
                  <table className="min-w-full text-[11px] text-left">
                    <thead>
                      <tr className="bg-gray-100 text-gray-600">
                        <th className="py-1 px-2 border-b">Date</th>
                        <th className="py-1 px-2 border-b text-right">Amount</th>
                        <th className="py-1 px-2 border-b">Note</th>
                        <th className="py-1 px-2 border-b text-right">Audit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userDaily.items.map((d) => (
                        <tr key={d.date} className="border-b border-gray-200">
                          <td className="py-1 px-2">{d.date}</td>
                          <td className="py-1 px-2 text-right font-semibold">
                            {d.amount.toFixed(2)}
                          </td>
                          <td className="py-1 px-2 text-[10px] text-gray-500">
                            {d.note || "—"}
                          </td>
                          <td className="py-1 px-2 text-right">
                            <button
                              type="button"
                              onClick={() => openAudit(d)}
                              className="text-[10px] text-blue-600 hover:underline"
                            >
                              View audit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-xs text-gray-500">
                    No daily incentives for this user in the selected window.
                  </div>
                )}
              </div>

              {auditData && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg shadow-lg w-full max-w-xl p-4 text-sm max-h-[80vh] flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-xs text-gray-500">Audit for</div>
                        <div className="text-sm font-semibold">
                          {auditData.date} · User #{auditData.userId}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAuditData(null)}
                        className="px-3 py-1.5 rounded border border-gray-300 text-gray-700 bg-white text-xs"
                      >
                        Close
                      </button>
                    </div>
                    <div className="mb-2 text-xs text-gray-500">
                      Amount: <span className="font-semibold text-gray-800">{auditData.amount.toFixed(2)}</span>
                    </div>
                    <div className="mb-2 text-[11px] text-gray-600">
                      This read-only view shows how this day&apos;s incentive amount was constructed. Use it for
                      dispute handling and rule debugging.
                    </div>
                    {auditLoading ? (
                      <div className="text-xs text-gray-500">Loading audit info…</div>
                    ) : auditError ? (
                      <div className="text-xs text-red-600">{auditError}</div>
                    ) : auditData.breakdown ? (
                      <>
                        {Array.isArray((auditData.breakdown as any)?.rules) && (
                          <div className="mb-2">
                            <div className="text-[11px] font-semibold text-gray-700 mb-1">
                              Rule-level breakdown
                            </div>
                            <div className="border border-gray-200 rounded bg-white max-h-40 overflow-auto">
                              <table className="min-w-full text-[11px] text-left">
                                <thead>
                                  <tr className="bg-gray-50 text-gray-600">
                                    <th className="py-1 px-2 border-b">Rule</th>
                                    <th className="py-1 px-2 border-b text-right">Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {((auditData.breakdown as any).rules as any[]).map((r, idx) => (
                                    <tr key={`${r.ruleId ?? idx}`} className="border-b border-gray-100">
                                      <td className="py-1 px-2 text-gray-700">
                                        Rule #{r.ruleId ?? idx + 1}
                                      </td>
                                      <td className="py-1 px-2 text-right font-semibold">
                                        {Number(r.amount ?? 0).toFixed(2)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                        <div className="flex-1 overflow-auto bg-gray-50 border border-gray-200 rounded p-2 text-[11px] mt-1">
                          <div className="text-[10px] font-semibold text-gray-600 mb-1">
                            Technical details (raw JSON)
                          </div>
                          <pre className="whitespace-pre-wrap break-words">
                            {JSON.stringify(auditData.breakdown, null, 2)}
                          </pre>
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-gray-500">
                        No audit info found for this record.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

AdminVentureIncentivesPage.title = "Venture Incentive Summary";

export default AdminVentureIncentivesPage;
