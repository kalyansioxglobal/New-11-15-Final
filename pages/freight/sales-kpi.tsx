import { useEffect, useState } from "react";
import Link from "next/link";
import { useTestMode } from "@/contexts/TestModeContext";

type Venture = { id: number; name: string; type: string };

type SalesUserKpi = {
  userId: number;
  name: string | null;
  email: string | null;
  officeName: string | null;
  totalCalls: number;
  totalHours: number;
  totalMinutes: number;
  avgCallMinutes: number;
  callsPerDay: number;
  days: number;
  revenueGenerated: number;
  monthlyCost?: number;
  roiPercent?: number | null;
  quotesGiven?: number;
  quotesWon?: number;
  totalQuotesGiven?: number;
  totalQuotesWon?: number;
  quoteWinRate?: number | null;
  customerApprovalsSubmitted?: number;
  customerApprovalsApproved?: number;
  customerApprovalsPending?: number;
};

type RecentApproval = {
  id: number;
  customerName: string;
  status: string;
  createdAt: string;
  decidedAt: string | null;
  requestedBy: string;
  ventureName: string | null;
};

type SalesKpiResponse = {
  summary: {
    totalCalls: number;
    totalHours: number;
    totalRevenue: number;
    userCount: number;
    totalQuotesGiven?: number;
    totalQuotesWon?: number;
    customerApprovals?: {
      submitted: number;
      approved: number;
      pending: number;
    };
  };
  users: SalesUserKpi[];
  recentApprovals?: RecentApproval[];
};

type Range = "today" | "7d" | "mtd";

function computeRange(range: Range): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);

  if (range === "today") {
    return { from: to, to };
  }

  if (range === "7d") {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return { from: d.toISOString().slice(0, 10), to };
  }

  const d = new Date();
  d.setDate(1);
  return { from: d.toISOString().slice(0, 10), to };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function FreightSalesKpiPage() {
  const { testMode } = useTestMode();
  const [ventures, setVentures] = useState<Venture[]>([]);
  const [selectedVentureId, setSelectedVentureId] = useState<number | null>(
    null,
  );
  const [range, setRange] = useState<Range>("today");
  const [data, setData] = useState<SalesKpiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingKpi, setLoadingKpi] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editingCost, setEditingCost] = useState<string>("");
  const [savingCost, setSavingCost] = useState(false);

  const [quoteUserId, setQuoteUserId] = useState<number | "">("");
  const [quoteDate, setQuoteDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [quotesGivenInput, setQuotesGivenInput] = useState<string>("");
  const [quotesWonInput, setQuotesWonInput] = useState<string>("");
  const [quotesRevenueInput, setQuotesRevenueInput] = useState<string>("");
  const [savingQuotes, setSavingQuotes] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteSuccess, setQuoteSuccess] = useState<string | null>(null);

  const [minCallsPerDay, setMinCallsPerDay] = useState<string>("");
  const [showOnlyUnderperformers, setShowOnlyUnderperformers] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/ventures?types=LOGISTICS,TRANSPORT&includeTest=${testMode}`)
      .then((r) => r.json())
      .then((data) => {
        const freightVentures = data as Venture[];
        setVentures(freightVentures);
        if (freightVentures.length && !selectedVentureId) {
          setSelectedVentureId(freightVentures[0].id);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load ventures");
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testMode]);

  useEffect(() => {
    if (!selectedVentureId) return;
    const { from, to } = computeRange(range);

    setLoadingKpi(true);
    setError(null);

    fetch(
      `/api/freight-kpi/sales?ventureId=${selectedVentureId}&from=${from}&to=${to}`,
    )
      .then((r) => r.json())
      .then((payload) => {
        setData(payload);
        setLoadingKpi(false);
      })
      .catch(() => {
        setError("Failed to load sales KPIs");
        setLoadingKpi(false);
      });
  }, [selectedVentureId, range]);

  function startEditCost(user: SalesUserKpi) {
    setEditingUserId(user.userId);
    setEditingCost(
      user.monthlyCost && user.monthlyCost > 0
        ? String(Math.round(user.monthlyCost))
        : "",
    );
  }

  async function saveCostForUser(userId: number) {
    if (!editingCost) {
      setEditingUserId(null);
      return;
    }

    const value = Number(editingCost);
    if (isNaN(value) || value < 0) {
      alert("Monthly cost must be a positive number.");
      return;
    }

    setSavingCost(true);
    try {
      await fetch("/api/freight-kpi/sales-cost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, monthlyCost: value }),
      });

      if (selectedVentureId) {
        const { from, to } = computeRange(range);
        const resp = await fetch(
          `/api/freight-kpi/sales?ventureId=${selectedVentureId}&from=${from}&to=${to}`,
        );
        const payload = await resp.json();
        setData(payload);
      }

      setEditingUserId(null);
    } catch (err) {
      console.error(err);
      alert("Failed to save cost. Check console.");
    } finally {
      setSavingCost(false);
    }
  }

  async function submitQuotes() {
    setQuoteError(null);
    setQuoteSuccess(null);

    if (!selectedVentureId) {
      setQuoteError("Select a venture first.");
      return;
    }
    if (quoteUserId === "" || !quoteUserId) {
      setQuoteError("Select a salesperson.");
      return;
    }
    if (!quoteDate) {
      setQuoteError("Select a date.");
      return;
    }

    const quotesGiven = quotesGivenInput ? Number(quotesGivenInput) : null;
    const quotesWon = quotesWonInput ? Number(quotesWonInput) : null;
    const revenueGenerated = quotesRevenueInput
      ? Number(quotesRevenueInput)
      : null;

    if (
      (quotesGiven != null && (isNaN(quotesGiven) || quotesGiven < 0)) ||
      (quotesWon != null && (isNaN(quotesWon) || quotesWon < 0)) ||
      (revenueGenerated != null &&
        (isNaN(revenueGenerated) || revenueGenerated < 0))
    ) {
      setQuoteError("Quotes and revenue must be non-negative numbers.");
      return;
    }

    setSavingQuotes(true);
    try {
      const resp = await fetch("/api/freight-kpi/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: quoteUserId,
          ventureId: selectedVentureId,
          officeId: null,
          date: quoteDate,
          quotesGiven,
          quotesWon,
          revenueGenerated,
        }),
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save quotes");
      }

      setQuoteSuccess("Saved. KPI recalculated.");
      const { from, to } = computeRange(range);
      const kpiResp = await fetch(
        `/api/freight-kpi/sales?ventureId=${selectedVentureId}&from=${from}&to=${to}`,
      );
      const payload = await kpiResp.json();
      setData(payload);

      setQuotesGivenInput("");
      setQuotesWonInput("");
      setQuotesRevenueInput("");
    } catch (err: any) {
      console.error(err);
      setQuoteError(err.message || "Failed to save quotes.");
    } finally {
      setSavingQuotes(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4">Loading ventures...</div>
    );
  }

  if (!ventures.length) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-2">Freight Sales KPIs</h1>
        <p className="text-gray-600">
          No logistics or transport ventures found.
        </p>
      </div>
    );
  }

  const users = data?.users ?? [];
  const recentApprovals = data?.recentApprovals ?? [];

  const filteredUsers = users.filter((u) => {
    let pass = true;

    if (minCallsPerDay) {
      const threshold = Number(minCallsPerDay);
      if (!isNaN(threshold)) {
        pass = pass && u.callsPerDay >= threshold;
      }
    }

    if (showOnlyUnderperformers) {
      const lowCalls = u.callsPerDay < 100;
      const badRoi =
        typeof u.roiPercent === "number" && u.roiPercent < 0;
      pass = pass && (lowCalls || badRoi);
    }

    return pass;
  });

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Freight Sales KPIs</h1>
          <p className="text-sm text-gray-600 mt-1">
            Sales performance tracking. Customer approvals automatically count as quotes.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <select
            className="border rounded-lg px-3 py-2 text-sm"
            value={selectedVentureId ?? ""}
            onChange={(e) => setSelectedVentureId(Number(e.target.value))}
          >
            {ventures.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>

          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 h-fit">
            {(["today", "7d", "mtd"] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 text-xs font-medium rounded-md ${
                  range === r
                    ? "bg-white shadow border"
                    : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                {r === "today" ? "Today" : r === "7d" ? "Last 7 Days" : "MTD"}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="number"
              className="border rounded px-2 py-1 text-xs w-28"
              placeholder="Min calls/day"
              value={minCallsPerDay}
              onChange={(e) => setMinCallsPerDay(e.target.value)}
            />
            <label className="flex items-center gap-1 text-xs text-gray-700">
              <input
                type="checkbox"
                className="rounded border-gray-300"
                checked={showOnlyUnderperformers}
                onChange={(e) => setShowOnlyUnderperformers(e.target.checked)}
              />
              Underperformers only
            </label>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {loadingKpi && <div className="text-sm text-gray-500">Loading KPIs...</div>}

      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="bg-white border rounded-xl p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wide">
                Total Calls
              </div>
              <div className="text-xl font-semibold mt-1">
                {data.summary.totalCalls.toLocaleString()}
              </div>
            </div>
            <div className="bg-white border rounded-xl p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wide">
                Hours on Phone
              </div>
              <div className="text-xl font-semibold mt-1">
                {data.summary.totalHours.toFixed(1)}
              </div>
            </div>
            <div className="bg-white border rounded-xl p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wide">
                Active Reps
              </div>
              <div className="text-xl font-semibold mt-1">
                {data.summary.userCount}
              </div>
            </div>
            <div className="bg-white border rounded-xl p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wide">
                Total Quotes
              </div>
              <div className="text-xl font-semibold mt-1">
                {data.summary.totalQuotesGiven ?? 0}
              </div>
            </div>
            <div className="bg-white border rounded-xl p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wide">
                Quotes Won
              </div>
              <div className="text-xl font-semibold mt-1 text-green-600">
                {data.summary.totalQuotesWon ?? 0}
              </div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="text-xs text-emerald-700 uppercase tracking-wide">
                Customer Approvals
              </div>
              <div className="text-xl font-semibold mt-1 text-emerald-700">
                {data.summary.customerApprovals?.approved ?? 0}
                <span className="text-sm font-normal text-emerald-600"> approved</span>
              </div>
              <div className="text-xs text-emerald-600 mt-1">
                {data.summary.customerApprovals?.pending ?? 0} pending
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="text-xs text-blue-700 uppercase tracking-wide">
                New Customers
              </div>
              <div className="text-xl font-semibold mt-1 text-blue-700">
                {data.summary.customerApprovals?.submitted ?? 0}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                requests submitted
              </div>
            </div>
          </div>

          {recentApprovals.length > 0 && (
            <div className="bg-white border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Recent Customer Approvals</h3>
                <Link 
                  href="/logistics/customer-approval-request"
                  className="text-xs text-indigo-600 hover:text-indigo-800"
                >
                  Submit New Request
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Customer</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Requested By</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {recentApprovals.map((approval) => (
                      <tr key={approval.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">{approval.customerName}</td>
                        <td className="px-3 py-2 text-gray-600">{approval.requestedBy}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            approval.status === "APPROVED" 
                              ? "bg-green-100 text-green-800"
                              : approval.status === "REJECTED"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {approval.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-500 text-xs">
                          {formatDate(approval.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">
                    Salesperson
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">
                    Office
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">
                    Total Calls
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">
                    Calls / Day
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">
                    Hours
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">
                    Avg Call (min)
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">Quotes</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">Won</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">Win %</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">Cust. Approvals</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">Revenue</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">Cost / Month</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">ROI %</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-200"></th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={14}
                      className="px-3 py-4 text-center text-gray-500 dark:text-gray-400"
                    >
                      No KPI records found for this range.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u, idx) => {
                    let rowClass = "";
                    if (u.callsPerDay >= 150) {
                      rowClass = "bg-green-50";
                    } else if (u.callsPerDay >= 100) {
                      rowClass = "bg-yellow-50";
                    } else {
                      rowClass = "bg-red-50";
                    }

                    if (idx === 0 && u.totalCalls > 0) {
                      rowClass += " font-semibold";
                    }

                    return (
                      <tr key={u.userId} className={rowClass}>
                        <td className="px-3 py-2">
                          <div className="flex flex-col">
                            <span>{u.name || "Unknown"}</span>
                            {u.email && (
                              <span className="text-xs text-gray-500">
                                {u.email}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {u.officeName || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {u.totalCalls.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {u.callsPerDay.toFixed(1)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {u.totalHours.toFixed(1)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {u.avgCallMinutes.toFixed(1)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {u.totalQuotesGiven ?? u.quotesGiven ?? 0}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {u.totalQuotesWon ?? u.quotesWon ?? 0}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {typeof u.quoteWinRate === "number"
                            ? `${u.quoteWinRate.toFixed(0)}%`
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {(u.customerApprovalsApproved ?? 0) > 0 ? (
                            <span className="text-green-600 font-medium">
                              {u.customerApprovalsApproved}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                          {(u.customerApprovalsPending ?? 0) > 0 && (
                            <span className="text-xs text-yellow-600 ml-1">
                              (+{u.customerApprovalsPending})
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {u.revenueGenerated ? `$${u.revenueGenerated.toFixed(0)}` : "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {editingUserId === u.userId ? (
                            <input
                              type="number"
                              className="border rounded px-2 py-1 text-xs w-24 text-right"
                              value={editingCost}
                              onChange={(e) => setEditingCost(e.target.value)}
                              placeholder="3000"
                              autoFocus
                            />
                          ) : u.monthlyCost && u.monthlyCost > 0 ? (
                            `$${u.monthlyCost.toFixed(0)}`
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {typeof u.roiPercent === "number"
                            ? `${u.roiPercent.toFixed(0)}%`
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {editingUserId === u.userId ? (
                            <button
                              className="text-xs px-2 py-1 rounded bg-emerald-600 text-white disabled:opacity-50"
                              disabled={savingCost}
                              onClick={() => saveCostForUser(u.userId)}
                            >
                              {savingCost ? "Saving..." : "Save"}
                            </button>
                          ) : (
                            <button
                              className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                              onClick={() => startEditCost(u)}
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {users.length > 0 && (
        <div className="bg-white border rounded-xl p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="font-semibold text-sm">
                Update Daily Quotes & Revenue
              </div>
              <div className="text-xs text-gray-500">
                Fast entry: pick a rep, date, and their quotes/wins for that
                day. This updates EmployeeKpiDaily behind the scenes.
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <select
                className="border rounded px-2 py-1 text-xs"
                value={quoteUserId}
                onChange={(e) =>
                  setQuoteUserId(
                    e.target.value ? Number(e.target.value) : "",
                  )
                }
              >
                <option value="">Salesperson…</option>
                {users.map((u) => (
                  <option key={u.userId} value={u.userId}>
                    {u.name || u.email || `User ${u.userId}`}
                  </option>
                ))}
              </select>
              <input
                type="date"
                className="border rounded px-2 py-1 text-xs"
                value={quoteDate}
                onChange={(e) => setQuoteDate(e.target.value)}
              />
              <input
                type="number"
                min={0}
                className="border rounded px-2 py-1 text-xs w-20"
                placeholder="Quotes"
                value={quotesGivenInput}
                onChange={(e) => setQuotesGivenInput(e.target.value)}
              />
              <input
                type="number"
                min={0}
                className="border rounded px-2 py-1 text-xs w-20"
                placeholder="Won"
                value={quotesWonInput}
                onChange={(e) => setQuotesWonInput(e.target.value)}
              />
              <input
                type="number"
                min={0}
                className="border rounded px-2 py-1 text-xs w-24"
                placeholder="Revenue"
                value={quotesRevenueInput}
                onChange={(e) => setQuotesRevenueInput(e.target.value)}
              />
              <button
                className="text-xs px-3 py-1 rounded bg-indigo-600 text-white disabled:opacity-50"
                disabled={savingQuotes}
                onClick={submitQuotes}
              >
                {savingQuotes ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
          {quoteError && (
            <div className="text-xs text-red-600">{quoteError}</div>
          )}
          {quoteSuccess && (
            <div className="text-xs text-emerald-600">{quoteSuccess}</div>
          )}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-semibold text-sm text-blue-800 mb-2">How Customer Approvals Link to KPIs</h3>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Submitted customer approval requests count as <strong>Quotes Given</strong></li>
          <li>• Approved customers count as <strong>Quotes Won</strong></li>
          <li>• Stats are tied to the person who submitted the approval request</li>
        </ul>
        <Link 
          href="/logistics/customer-approval-request"
          className="inline-block mt-3 text-xs px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          Submit Customer Approval Request
        </Link>
      </div>
    </div>
  );
}

FreightSalesKpiPage.title = "Freight Sales KPIs";

export default FreightSalesKpiPage;
