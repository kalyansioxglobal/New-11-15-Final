import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { PageWithLayout } from "@/types/page";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";

interface BankSnapshot {
  total: number;
  asOf: string | null;
}

interface PortfolioBlock {
  activeVentures: number;
  activeOffices: number;
  approxUsers: number;
  bank: BankSnapshot;
}

interface VerticalLogistics {
  totalLoads: number;
  deliveredLoads: number;
  marginPct: number;
  atRiskLoads: number;
}

interface VerticalHospitality {
  properties: number;
  occupancyPct: number;
  adr: number;
  revpar: number;
  highLossNights: number;
}

interface VerticalBpo {
  agents: number;
  totalCalls: number;
  avgTalkMinutes: number;
  utilizationPct: number;
}

interface VerticalSaas {
  mrr: number;
  arr: number;
  netGrowthPct: number;
  activeCustomers: number;
  churnedCustomers: number;
}

interface VerticalIncentives {
  totalIncentives: number;
  venturesWithIncentives: number;
  employeesWithIncentives: number;
}

interface AlertRow {
  id: string;
  type: string;
  message: string;
  severity: "info" | "warning" | "critical";
  ventureId?: number | null;
  currentValue?: number | null;
  previousValue?: number | null;
  deltaPct?: number | null;
}

interface ParentDashboardResponse {
  portfolio: PortfolioBlock;
  logistics: VerticalLogistics;
  hospitality: VerticalHospitality;
  bpo: VerticalBpo;
  saas: VerticalSaas;
  incentives: VerticalIncentives;
  alerts: AlertRow[];
  aiSummary?: string | null;
  from: string;
  to: string;
}

const AdminParentDashboardPage: PageWithLayout = () => {
  const { effectiveUser, loading: userLoading } = useEffectiveUser();

  const todayIso = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState<string>(todayIso);
  const [includeTest, setIncludeTest] = useState(false);

  const [data, setData] = useState<ParentDashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("from", from);
      params.set("to", to);
      if (includeTest) params.set("includeTest", "true");

      const res = await fetch(`/api/dashboard/parent?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to load dashboard");
      }
      setData(json as ParentDashboardResponse);
    } catch (e: any) {
      setError(e.message || "Failed to load dashboard");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!effectiveUser || (effectiveUser.role !== "CEO" && effectiveUser.role !== "ADMIN")) {
      return;
    }
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveUser]);

  function setPresetDays(days: number) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    setFrom(start.toISOString().slice(0, 10));
    setTo(end.toISOString().slice(0, 10));
  }

  const severityClass = (sev: AlertRow["severity"]): string => {
    switch (sev) {
      case "critical":
        return "bg-red-100 text-red-700 border-red-300";
      case "warning":
        return "bg-amber-50 text-amber-700 border-amber-300";
      default:
        return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  // UI role guard: loading state
  if (userLoading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center text-xs text-gray-500">
        Loading user…
      </div>
    );
  }

  // UI role guard: insufficient permissions
  if (!effectiveUser || (effectiveUser.role !== "CEO" && effectiveUser.role !== "ADMIN")) {
    return (
      <div className="p-4 md:p-6 flex flex-col items-start gap-2">
        <h1 className="text-xl font-semibold">SIOX Command Center</h1>
        <div className="rounded border border-gray-200 bg-white p-4 max-w-md text-xs space-y-1">
          <div className="font-semibold text-gray-800">Insufficient permissions</div>
          <p className="text-gray-500">
            This dashboard is only available to CEO and Admin roles. If you believe you need access,
            please contact your system administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">SIOX Command Center</h1>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">
            Cross-venture overview for Logistics, Hospitality, BPO, SaaS, and Incentives. This
            dashboard is read-only and aggregates portfolio metrics across the selected date
            window.
          </p>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-600 border border-red-300 rounded px-3 py-2 bg-red-50">
        {data?.aiSummary && (
          <div className="mt-3 rounded border border-indigo-100 bg-indigo-50 p-3 text-xs max-w-3xl">
            <div className="font-semibold text-indigo-800 mb-1">AI summary (read-only)</div>
            <p className="text-[11px] text-gray-800 whitespace-pre-line">{data.aiSummary}</p>
          </div>
        )}

      {!data?.aiSummary && !error && (
        <div className="rounded border border-dashed border-gray-200 bg-white p-3 text-[11px] max-w-3xl">
          <div className="font-semibold text-gray-700 mb-1">AI summary</div>
          <p className="text-gray-500">
            No AI summary is currently available for this window. The underlying metrics and alerts
            remain fully accurate.
          </p>
        </div>
      )}

          {error}
        </div>
      )}

      {/* Filters */}
      <div className="rounded border border-gray-200 bg-white p-4 space-y-3 text-xs max-w-4xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="space-y-1">
            <div className="text-[11px] text-gray-600">Quick ranges</div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setPresetDays(7)}
                className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50"
              >
                Last 7 days
              </button>
              <button
                type="button"
                onClick={() => setPresetDays(30)}
                className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50"
              >
                Last 30 days
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] text-gray-600">From</div>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1 text-xs"
            />
          </div>

          <div className="space-y-1">
            <div className="text-[11px] text-gray-600">To</div>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1 text-xs"
            />
          </div>

          <label className="inline-flex items-center gap-1 ml-auto text-[11px] text-gray-600">
            <input
              type="checkbox"
              checked={includeTest}
              onChange={(e) => setIncludeTest(e.target.checked)}
            />
            <span>Include test ventures</span>
          </label>

          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading}
            className="px-3 py-1.5 rounded bg-black text-white text-xs disabled:opacity-60"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        {data && (
          <div className="text-[11px] text-gray-500">
            Window: {data.from} → {data.to}
          </div>
        )}
      </div>

      {/* Top snapshot strip */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs max-w-5xl">
          <div className="rounded border border-gray-200 bg-white p-3">
            <div className="text-[11px] text-gray-500">Active ventures</div>
            <div className="text-lg font-semibold mt-1">{data.portfolio.activeVentures}</div>
          </div>
          <div className="rounded border border-gray-200 bg-white p-3">
            <div className="text-[11px] text-gray-500">Active offices</div>
            <div className="text-lg font-semibold mt-1">{data.portfolio.activeOffices}</div>
          </div>
          <div className="rounded border border-gray-200 bg-white p-3">
            <div className="text-[11px] text-gray-500">Approx employees/users</div>
            <div className="text-lg font-semibold mt-1">{data.portfolio.approxUsers}</div>
          </div>
          <div className="rounded border border-gray-200 bg-white p-3">
            <div className="text-[11px] text-gray-500">Bank snapshot</div>
            <div className="text-lg font-semibold mt-1">
              {data.portfolio.bank.total.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">
              As of: {data.portfolio.bank.asOf || "n/a"}
            </div>
          </div>
        </div>
      )}

      {/* Vertical cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl text-xs">
          {/* Logistics */}
          <div className="rounded border border-gray-200 bg-white p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold">Logistics</div>
                <div className="text-[11px] text-gray-500">Loads, coverage, margin, risk</div>
              </div>
              <Link
                href="/logistics/dashboard"
                className="text-[11px] text-blue-600 hover:underline"
              >
                View logistics
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <div className="text-[11px] text-gray-500">Total loads</div>
                <div className="text-base font-semibold">{data.logistics.totalLoads}</div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500">Delivered</div>
                <div className="text-base font-semibold">{data.logistics.deliveredLoads}</div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500">Margin %</div>
                <div className="text-base font-semibold">{data.logistics.marginPct.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500">At-risk loads</div>
                <div className="text-base font-semibold">{data.logistics.atRiskLoads}</div>
              </div>
            </div>
          </div>

          {/* Hospitality */}
          <div className="rounded border border-gray-200 bg-white p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold">Hospitality</div>
                <div className="text-[11px] text-gray-500">Occ %, ADR, RevPAR, loss nights</div>
              </div>
              <Link
                href="/hospitality/dashboard"
                className="text-[11px] text-blue-600 hover:underline"
              >
                View hospitality
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <div className="text-[11px] text-gray-500">Properties</div>
                <div className="text-base font-semibold">{data.hospitality.properties}</div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500">Occ %</div>
                <div className="text-base font-semibold">
                  {data.hospitality.occupancyPct.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500">ADR</div>
                <div className="text-base font-semibold">{data.hospitality.adr.toFixed(1)}</div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500">RevPAR</div>
                <div className="text-base font-semibold">{data.hospitality.revpar.toFixed(1)}</div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500">High-loss nights</div>
                <div className="text-base font-semibold">
                  {data.hospitality.highLossNights}
                </div>
              </div>
            </div>
          </div>

          {/* BPO */}
          <div className="rounded border border-gray-200 bg-white p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold">BPO</div>
                <div className="text-[11px] text-gray-500">Agents, calls, talk time, utilization</div>
              </div>
              <Link
                href="/bpo/dashboard"
                className="text-[11px] text-blue-600 hover:underline"
              >
                View BPO
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <div className="text-[11px] text-gray-500">Agents</div>
                <div className="text-base font-semibold">{data.bpo.agents}</div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500">Total calls</div>
                <div className="text-base font-semibold">{data.bpo.totalCalls}</div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500">Avg talk (min)</div>
                <div className="text-base font-semibold">
                  {data.bpo.avgTalkMinutes.toFixed(1)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500">Utilization</div>
                <div className="text-base font-semibold">
                  {data.bpo.utilizationPct.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* SaaS + Incentives */}
          <div className="rounded border border-gray-200 bg-white p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold">SaaS & Incentives</div>
                <div className="text-[11px] text-gray-500">MRR/ARR, growth, incentives pulse</div>
              </div>
              <Link
                href="/admin/incentives/venture-summary"
                className="text-[11px] text-blue-600 hover:underline"
              >
                View incentives
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <div className="text-[11px] text-gray-500">MRR</div>
                <div className="text-base font-semibold">
                  {data.saas.mrr.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500">ARR</div>
                <div className="text-base font-semibold">
                  {data.saas.arr.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500">Net growth</div>
                <div className="text-base font-semibold">
                  {data.saas.netGrowthPct.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500">Churned customers</div>
                <div className="text-base font-semibold">
                  {data.saas.churnedCustomers}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500">Total incentives</div>
                <div className="text-base font-semibold">
                  {data.incentives.totalIncentives.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500">Employees w/ incentives</div>
                <div className="text-base font-semibold">
                  {data.incentives.employeesWithIncentives}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom section: alerts + incentive pulse CTA */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl text-xs">
          <div className="md:col-span-2 rounded border border-gray-200 bg-white p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold">Alerts</div>
                <div className="text-[11px] text-gray-500">
                  Heuristic portfolio alerts across Logistics, Hospitality, BPO, SaaS, and Incentives.
                </div>
                {data.aiSummary && (
                  <div className="mt-1 text-[11px] text-gray-700 italic">
                    Summary: {data.aiSummary}
                  </div>
                )}
              </div>
            </div>
            {data.alerts.length === 0 ? (
              <div className="text-[11px] text-gray-500 mt-1">No alerts in this window.</div>
            ) : (
              <ul className="mt-2 space-y-1">
                {data.alerts.map((a) => (
                  <li
                    key={a.id}
                    className={`border rounded px-2 py-1 flex items-center justify-between ${severityClass(
                      a.severity,
                    )}`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="uppercase text-[10px] tracking-wide">
                          {a.type}
                        </span>
                        <span>{a.message}</span>
                      </div>
                      {(a.currentValue != null || a.previousValue != null || a.deltaPct != null) && (
                        <div className="text-[10px] opacity-80">
                          {a.currentValue != null && <span>Now: {a.currentValue}</span>}
                          {a.previousValue != null && (
                            <span>{a.currentValue != null ? " · " : ""}Prev: {a.previousValue}</span>
                          )}
                          {a.deltaPct != null && (
                            <span>
                              {a.currentValue != null || a.previousValue != null ? " · " : ""}
                              Δ {a.deltaPct.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {a.ventureId && (
                      <span className="text-[10px] opacity-75">Venture #{a.ventureId}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded border border-gray-200 bg-white p-4 space-y-2">
            <div className="text-xs font-semibold">Incentive pulse</div>
            <div className="text-[11px] text-gray-500">
              Overview of incentive activity across ventures in this window.
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-500">Total incentives</span>
                <span className="text-sm font-semibold">
                  {data.incentives.totalIncentives.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-500">Ventures with incentives</span>
                <span className="text-sm font-semibold">
                  {data.incentives.venturesWithIncentives}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-500">Employees with incentives</span>
                <span className="text-sm font-semibold">
                  {data.incentives.employeesWithIncentives}
                </span>
              </div>
            </div>
            <div className="pt-3">
              <Link
                href="/admin/incentives/venture-summary"
                className="inline-flex items-center justify-center w-full px-3 py-1.5 rounded bg-black text-white text-xs hover:bg-gray-900"
              >
                View incentive summary
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

AdminParentDashboardPage.title = "Command Center";

export default AdminParentDashboardPage;
