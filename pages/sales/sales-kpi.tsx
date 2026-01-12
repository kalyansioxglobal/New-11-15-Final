import { useEffect, useState } from "react";
import Link from "next/link";
import { GetServerSideProps } from "next";
import { useTestMode } from "@/contexts/TestModeContext";
import { Skeleton } from "@/components/ui/Skeleton";
import toast from "react-hot-toast";

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};

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
  demosBooked: number;
  clientsOnboarded: number;
  onboardingsPending: number;
  onboardingsActive: number;
  onboardingMrr: number;
  monthlyCost?: number;
  roiPercent?: number | null;
  demoToClientRate?: number | null;
};

type RecentOnboarding = {
  id: number;
  clientName: string;
  clientCompany: string | null;
  status: string;
  onboardedAt: string;
  salesPerson: string;
  subscriptionPlan: string | null;
  mrr: number | null;
};

type SalesKpiResponse = {
  summary: {
    totalCalls: number;
    totalHours: number;
    totalDemos: number;
    totalClientsOnboarded: number;
    userCount: number;
    onboardings: {
      pending: number;
      active: number;
      totalMrr: number;
    };
  };
  users: SalesUserKpi[];
  recentOnboardings: RecentOnboarding[];
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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function SaasSalesKpiPage() {
  const { testMode } = useTestMode();
  const [ventures, setVentures] = useState<Venture[]>([]);
  const [selectedVentureId, setSelectedVentureId] = useState<number | null>(null);
  const [range, setRange] = useState<Range>("mtd");
  const [data, setData] = useState<SalesKpiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingKpi, setLoadingKpi] = useState<boolean>(false);
  
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editingCost, setEditingCost] = useState<string>("");
  const [savingCost, setSavingCost] = useState(false);

  const [kpiUserId, setKpiUserId] = useState<number | "">("");
  const [kpiDate, setKpiDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [demosInput, setDemosInput] = useState<string>("");
  const [clientsInput, setClientsInput] = useState<string>("");
  const [callsInput, setCallsInput] = useState<string>("");
  const [hoursInput, setHoursInput] = useState<string>("");
  const [savingKpi, setSavingKpi] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/ventures?types=SAAS&includeTest=${testMode}`)
      .then((r) => r.json())
      .then((data) => {
        const saasVentures = data as Venture[];
        setVentures(saasVentures);
        if (saasVentures.length && !selectedVentureId) {
          setSelectedVentureId(saasVentures[0].id);
        }
        setLoading(false);
      })
      .catch((err) => {
        toast.error("Failed to load ventures");
        setLoading(false);
      });
  }, [testMode, selectedVentureId]);

  useEffect(() => {
    if (!selectedVentureId) return;
    const { from, to } = computeRange(range);

    setLoadingKpi(true);

    fetch(`/api/sales-kpi?ventureId=${selectedVentureId}&from=${from}&to=${to}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load sales KPIs");
        return r.json();
      })
      .then((payload) => {
        setData(payload);
        setLoadingKpi(false);
      })
      .catch((err) => {
        toast.error(err.message || "Failed to load sales KPIs");
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
      toast.error("Monthly cost must be a positive number.");
      return;
    }

    setSavingCost(true);
    try {
      const resp = await fetch("/api/freight-kpi/sales-cost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, monthlyCost: value }),
      });

      if (!resp.ok) {
        throw new Error("Failed to save cost");
      }

      if (selectedVentureId) {
        const { from, to } = computeRange(range);
        const kpiResp = await fetch(
          `/api/sales-kpi?ventureId=${selectedVentureId}&from=${from}&to=${to}`,
        );
        if (kpiResp.ok) {
          const payload = await kpiResp.json();
          setData(payload);
        }
      }

      toast.success("Cost saved successfully");
      setEditingUserId(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to save cost");
    } finally {
      setSavingCost(false);
    }
  }

  async function submitKpi() {
    if (!selectedVentureId) {
      toast.error("Select a venture first.");
      return;
    }
    if (kpiUserId === "" || !kpiUserId) {
      toast.error("Select a salesperson.");
      return;
    }
    if (!kpiDate) {
      toast.error("Select a date.");
      return;
    }

    const demos = demosInput ? Number(demosInput) : null;
    const clients = clientsInput ? Number(clientsInput) : null;
    const calls = callsInput ? Number(callsInput) : null;
    const hours = hoursInput ? Number(hoursInput) : null;

    if (
      (demos != null && (isNaN(demos) || demos < 0)) ||
      (clients != null && (isNaN(clients) || clients < 0)) ||
      (calls != null && (isNaN(calls) || calls < 0)) ||
      (hours != null && (isNaN(hours) || hours < 0))
    ) {
      toast.error("All values must be non-negative numbers.");
      return;
    }

    setSavingKpi(true);
    try {
      const resp = await fetch("/api/sales-kpi/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: kpiUserId,
          ventureId: selectedVentureId,
          officeId: null,
          date: kpiDate,
          demosBooked: demos,
          clientsOnboarded: clients,
          callsMade: calls,
          hoursWorked: hours,
        }),
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save KPI");
      }

      toast.success("KPI saved successfully");
      const { from, to } = computeRange(range);
      const kpiResp = await fetch(
        `/api/sales-kpi?ventureId=${selectedVentureId}&from=${from}&to=${to}`,
      );
      if (kpiResp.ok) {
        const payload = await kpiResp.json();
        setData(payload);
      }

      setDemosInput("");
      setClientsInput("");
      setCallsInput("");
      setHoursInput("");
    } catch (err: any) {
      toast.error(err.message || "Failed to save KPI");
    } finally {
      setSavingKpi(false);
    }
  }

  if (loading) {
    return <Skeleton className="w-full h-[85vh]" />;
  }

  if (!ventures.length) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">SaaS Sales KPIs</h1>
        <p className="text-gray-600 dark:text-gray-400">No SaaS ventures found.</p>
      </div>
    );
  }

  const users = data?.users ?? [];
  const recentOnboardings = data?.recentOnboardings ?? [];

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SaaS Sales KPIs</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Sales performance tracking for demos, client onboarding, and subscription conversions.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <select
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
            value={selectedVentureId ?? ""}
            onChange={(e) => setSelectedVentureId(Number(e.target.value))}
          >
            {ventures.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>

          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 h-fit">
            {(["today", "7d", "mtd"] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  range === r
                    ? "bg-white dark:bg-gray-600 shadow border border-gray-200 dark:border-gray-500 text-gray-900 dark:text-white"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {r === "today" ? "Today" : r === "7d" ? "Last 7 Days" : "MTD"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loadingKpi && (
        <div className="text-sm text-gray-500 dark:text-gray-400">Loading KPIs...</div>
      )}

      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Total Calls
              </div>
              <div className="text-xl font-semibold mt-1 text-gray-900 dark:text-white">
                {data.summary.totalCalls.toLocaleString()}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Hours on Phone
              </div>
              <div className="text-xl font-semibold mt-1 text-gray-900 dark:text-white">
                {data.summary.totalHours.toFixed(1)}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Active Reps
              </div>
              <div className="text-xl font-semibold mt-1 text-gray-900 dark:text-white">
                {data.summary.userCount}
              </div>
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
              <div className="text-xs text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">
                Demos Booked
              </div>
              <div className="text-xl font-semibold mt-1 text-indigo-700 dark:text-indigo-300">
                {data.summary.totalDemos}
              </div>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
              <div className="text-xs text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                Clients Onboarded
              </div>
              <div className="text-xl font-semibold mt-1 text-emerald-700 dark:text-emerald-300">
                {data.summary.totalClientsOnboarded}
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                {data.summary.onboardings.pending} pending
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <div className="text-xs text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                Monthly MRR
              </div>
              <div className="text-xl font-semibold mt-1 text-blue-700 dark:text-blue-300">
                {formatCurrency(data.summary.onboardings.totalMrr)}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {data.summary.onboardings.active} active subscriptions
              </div>
            </div>
          </div>

          {recentOnboardings.length > 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Recent Client Onboardings</h3>
                <Link
                  href="/saas/subscriptions"
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                >
                  View All Subscriptions
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Client</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Sales Rep</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Plan</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">MRR</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Status</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {recentOnboardings.map((onboarding) => (
                      <tr key={onboarding.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-900 dark:text-white">{onboarding.clientName}</div>
                          {onboarding.clientCompany && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">{onboarding.clientCompany}</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{onboarding.salesPerson}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                          {onboarding.subscriptionPlan || <span className="text-gray-400 dark:text-gray-500">—</span>}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white">
                          {onboarding.mrr ? formatCurrency(onboarding.mrr) : <span className="text-gray-400 dark:text-gray-500">—</span>}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              onboarding.status === "ACTIVE"
                                ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800"
                                : onboarding.status === "CANCELLED"
                                ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800"
                                : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800"
                            }`}
                          >
                            {onboarding.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-500 dark:text-gray-400 text-xs">
                          {formatDate(onboarding.onboardedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-900 dark:text-gray-300">Salesperson</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-900 dark:text-gray-300">Office</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-gray-300">Total Calls</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-gray-300">Calls / Day</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-gray-300">Hours</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-gray-300">Avg Call (min)</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-gray-300">Demos</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-gray-300">Clients</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-gray-300">Demo to Client %</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-gray-300">Pending</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-gray-300">MRR</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-gray-300">Cost / Month</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-gray-300">ROI %</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-gray-300"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="px-3 py-4 text-center text-gray-500 dark:text-gray-400">
                      No KPI records found for this range.
                    </td>
                  </tr>
                ) : (
                  users.map((u, idx) => {
                    let rowClass = "";
                    if (u.clientsOnboarded >= 3) {
                      rowClass = "bg-green-50 dark:bg-green-900/10";
                    } else if (u.clientsOnboarded >= 1) {
                      rowClass = "bg-yellow-50 dark:bg-yellow-900/10";
                    } else if (u.demosBooked >= 3) {
                      rowClass = "bg-blue-50 dark:bg-blue-900/10";
                    }

                    if (idx === 0 && u.totalCalls > 0) {
                      rowClass += " font-semibold";
                    }

                    return (
                      <tr key={u.userId} className={`${rowClass} hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors`}>
                        <td className="px-3 py-2">
                          <div className="flex flex-col">
                            <span className="text-gray-900 dark:text-white">{u.name || "Unknown"}</span>
                            {u.email && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">{u.email}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-300">
                          {u.officeName || <span className="text-gray-400 dark:text-gray-500">—</span>}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-300">{u.totalCalls.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-300">{u.callsPerDay.toFixed(1)}</td>
                        <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-300">{u.totalHours.toFixed(1)}</td>
                        <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-300">{u.avgCallMinutes.toFixed(1)}</td>
                        <td className="px-3 py-2 text-right font-medium text-indigo-600 dark:text-indigo-400">
                          {u.demosBooked}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-emerald-600 dark:text-emerald-400">
                          {u.clientsOnboarded}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-300">
                          {typeof u.demoToClientRate === "number"
                            ? `${u.demoToClientRate.toFixed(0)}%`
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {u.onboardingsPending > 0 ? (
                            <span className="text-yellow-600 dark:text-yellow-400">{u.onboardingsPending}</span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white">
                          {u.onboardingMrr > 0 ? formatCurrency(u.onboardingMrr) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {editingUserId === u.userId ? (
                            <input
                              type="number"
                              className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs w-24 text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                              value={editingCost}
                              onChange={(e) => setEditingCost(e.target.value)}
                              placeholder="3000"
                              autoFocus
                            />
                          ) : u.monthlyCost && u.monthlyCost > 0 ? (
                            <span className="text-gray-900 dark:text-white">${u.monthlyCost.toFixed(0)}</span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {typeof u.roiPercent === "number" ? (
                            <span
                              className={
                                u.roiPercent >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                              }
                            >
                              {u.roiPercent > 0 ? "+" : ""}
                              {u.roiPercent.toFixed(0)}%
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {editingUserId === u.userId ? (
                            <div className="flex gap-1">
                              <button
                                className="text-xs text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                                onClick={() => saveCostForUser(u.userId)}
                                disabled={savingCost}
                              >
                                {savingCost ? "..." : "Save"}
                              </button>
                              <button
                                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                onClick={() => setEditingUserId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                              onClick={() => startEditCost(u)}
                            >
                              Edit Cost
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

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <h3 className="font-semibold text-sm mb-3 text-gray-900 dark:text-white">Record Daily KPIs</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-300">Salesperson</label>
                <select
                  className="border border-gray-300 dark:border-gray-600 rounded w-full px-2 py-1.5 text-sm mt-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                  value={kpiUserId}
                  onChange={(e) =>
                    setKpiUserId(e.target.value ? Number(e.target.value) : "")
                  }
                >
                  <option value="">Select...</option>
                  {users.map((u) => (
                    <option key={u.userId} value={u.userId}>
                      {u.name || u.email || `User ${u.userId}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-300">Date</label>
                <input
                  type="date"
                  className="border border-gray-300 dark:border-gray-600 rounded w-full px-2 py-1.5 text-sm mt-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                  value={kpiDate}
                  onChange={(e) => setKpiDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-300">Calls Made</label>
                <input
                  type="number"
                  className="border border-gray-300 dark:border-gray-600 rounded w-full px-2 py-1.5 text-sm mt-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                  placeholder="0"
                  value={callsInput}
                  onChange={(e) => setCallsInput(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-300">Hours Worked</label>
                <input
                  type="number"
                  step="0.5"
                  className="border border-gray-300 dark:border-gray-600 rounded w-full px-2 py-1.5 text-sm mt-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                  placeholder="0"
                  value={hoursInput}
                  onChange={(e) => setHoursInput(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-300">Demos Booked</label>
                <input
                  type="number"
                  className="border border-gray-300 dark:border-gray-600 rounded w-full px-2 py-1.5 text-sm mt-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                  placeholder="0"
                  value={demosInput}
                  onChange={(e) => setDemosInput(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-300">Clients Onboarded</label>
                <input
                  type="number"
                  className="border border-gray-300 dark:border-gray-600 rounded w-full px-2 py-1.5 text-sm mt-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                  placeholder="0"
                  value={clientsInput}
                  onChange={(e) => setClientsInput(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <button
                  className="text-sm rounded px-3 py-1 disabled:opacity-50 transition-colors btn"
                  onClick={submitKpi}
                  disabled={savingKpi}
                >
                  {savingKpi ? "Saving..." : "Save KPI"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SaasSalesKpiPage;
