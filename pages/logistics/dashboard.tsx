import { useEffect, useState, useCallback } from 'react';
import { useTestMode } from '@/contexts/TestModeContext';
import { useRoleGuard } from '@/hooks/useRoleGuard';

type Venture = { id: number; name: string; type: string };

interface OfficeStat {
  officeId: number | null;
  officeName: string;
  total: number;
  open: number;
  covered: number;
  lost: number;
  dormant: number;
  working: number;
  coveragePct: number;
  lostPct: number;
}

interface LostReasonCategoryRow {
  category: string;
  count: number;
}

interface LostReasonRow {
  reason: string;
  count: number;
}

interface LossCategoryInsight {
  id: string;
  label: string;
  description: string;
  kpiImpact: string;
  count: number;
  share: number;
  sopSteps: string[];
  coachingQuestions: string[];
}

interface LossInsights {
  windowDays: number;
  totalLost: number;
  categories: LossCategoryInsight[];
  topReasons: { reason: string; count: number }[];
}

interface DashboardData {
  today: {
    totalToday: number;
    coveredToday: number;
    openToday: number;
    coverageToday: number;
  };
  last7: {
    margin7: number;
    avgMargin7: number;
  };
  statusCounts: Record<string, number>;
  leaderboard: {
    userId: number | null;
    name: string;
    loadsCreated: number;
  }[];
  officeStats: OfficeStat[];
  lostReasons: {
    byCategory: LostReasonCategoryRow[];
    byReason: LostReasonRow[];
  };
}

export default function LogisticsDashboard() {
  const { loading: roleLoading, authorized } = useRoleGuard();
  const { testMode, setTestMode } = useTestMode();
  const [ventures, setVentures] = useState<Venture[]>([]);
  const [selectedVentureId, setSelectedVentureId] = useState<number | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [lossInsights, setLossInsights] = useState<LossInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authorized) return;
    fetch('/api/ventures?limit=100')
      .then(r => r.json())
      .then((list: Venture[]) => {
        const logisticsVentures = list.filter(v => v.type === 'LOGISTICS');
        setVentures(logisticsVentures);
        if (logisticsVentures.length > 0) {
          setSelectedVentureId(prev => prev || logisticsVentures[0].id);
        }
      })
      .catch(() => {});
  }, [authorized]);

  const loadData = useCallback(async () => {
    if (!selectedVentureId || !authorized) return;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('ventureId', String(selectedVentureId));
      params.set('includeTest', testMode ? 'true' : 'false');

      const [dashRes, lossRes] = await Promise.all([
        fetch(`/api/logistics/dashboard?${params.toString()}`),
        fetch(`/api/logistics/loss-insights?${params.toString()}`),
      ]);

      if (!dashRes.ok) {
        const err = await dashRes.json();
        throw new Error(err.error || 'Failed to load dashboard');
      }
      const dashJson = await dashRes.json();
      setData(dashJson);

      if (lossRes.ok) {
        const lossJson = await lossRes.json();
        setLossInsights(lossJson);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedVentureId, testMode, authorized]);

  useEffect(() => {
    if (selectedVentureId && authorized) {
      loadData();
    }
  }, [selectedVentureId, loadData, authorized]);

  if (roleLoading) {
    return <div className="p-6 text-gray-500">Loading...</div>;
  }
  if (!authorized) {
    return null;
  }

  const statusOrder = ['OPEN', 'WORKING', 'COVERED', 'DELIVERED', 'LOST', 'DORMANT'];

  const totalAllStatuses = data
    ? Object.values(data.statusCounts || {}).reduce((sum, v) => sum + v, 0)
    : 0;

  const selectedVenture = ventures.find(v => v.id === selectedVentureId);

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold">Logistics Dashboard</h1>
            <p className="text-sm text-gray-600">
              {selectedVenture?.name || 'Select a venture'} - Loads, coverage, margin, office performance & lost reasons.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={selectedVentureId || ''}
              onChange={(e) => setSelectedVentureId(Number(e.target.value) || null)}
              className="px-3 py-1.5 border rounded text-sm"
            >
              {ventures.length === 0 && <option value="">No logistics ventures</option>}
              {ventures.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
            <button
              onClick={() => setTestMode(!testMode)}
              className={`px-3 py-1 rounded text-sm border ${
                testMode ? 'bg-yellow-200 border-yellow-400' : 'bg-gray-100'
              }`}
            >
              Test Mode: {testMode ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={loadData}
              disabled={loading || !selectedVentureId}
              className="px-3 py-1 rounded border text-sm bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="border rounded-xl p-4 bg-white shadow-sm">
            <div className="text-xs text-gray-500 mb-1">Loads Today</div>
            <div className="text-2xl font-semibold">
              {data ? data.today.totalToday : '--'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Open: {data ? data.today.openToday : '--'} · Covered: {data ? data.today.coveredToday : '--'}
            </div>
          </div>

          <div className="border rounded-xl p-4 bg-white shadow-sm">
            <div className="text-xs text-gray-500 mb-1">Coverage Today</div>
            <div className="text-2xl font-semibold">
              {data ? (data.today.coverageToday * 100).toFixed(1) + '%' : '--'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Covered / total loads created today
            </div>
          </div>

          <div className="border rounded-xl p-4 bg-white shadow-sm">
            <div className="text-xs text-gray-500 mb-1">Margin - Last 7 Days</div>
            <div className="text-2xl font-semibold">
              ${data ? data.last7.margin7.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '--'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Total (sell - buy) across loads with rates
            </div>
          </div>

          <div className="border rounded-xl p-4 bg-white shadow-sm">
            <div className="text-xs text-gray-500 mb-1">Avg Margin / Load (7d)</div>
            <div className="text-2xl font-semibold">
              ${data ? data.last7.avgMargin7.toFixed(2) : '--'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Uses only loads where both rates are set
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border rounded-xl bg-white p-4 col-span-1 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">Status Breakdown (All)</h2>
              {loading && <span className="text-xs text-gray-500">Updating...</span>}
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {statusOrder.map(s => {
                const value = data?.statusCounts?.[s] ?? 0;
                const pct = totalAllStatuses > 0 ? ((value / totalAllStatuses) * 100).toFixed(1) : '0.0';

                return (
                  <div key={s} className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-xs">{s}</span>
                        <span className="text-xs text-gray-500">
                          {value} · {pct}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded mt-1">
                        <div
                          className="h-1.5 rounded"
                          style={{
                            width: `${totalAllStatuses > 0 ? (value / totalAllStatuses) * 100 : 0}%`,
                            background:
                              s === 'COVERED' || s === 'DELIVERED'
                                ? '#16a34a'
                                : s === 'OPEN'
                                ? '#f97316'
                                : s === 'WORKING'
                                ? '#3b82f6'
                                : s === 'LOST'
                                ? '#dc2626'
                                : '#6b7280',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              {!data && !loading && (
                <div className="text-xs text-gray-500 mt-2">
                  No data yet. Create some loads first.
                </div>
              )}
            </div>
          </div>

          <div className="border rounded-xl bg-white p-4 col-span-1 md:col-span-2 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">Dispatcher Leaderboard (Last 7 Days)</h2>
              <span className="text-xs text-gray-500">Based on loads created</span>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Rank</th>
                    <th className="px-3 py-2 text-left">Dispatcher</th>
                    <th className="px-3 py-2 text-right">Loads Created</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.leaderboard?.length ? (
                    data.leaderboard.map((row, index) => (
                      <tr key={row.userId || index} className="border-t">
                        <td className="px-3 py-2">{index + 1}</td>
                        <td className="px-3 py-2">{row.name}</td>
                        <td className="px-3 py-2 text-right">{row.loadsCreated}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-3 py-4 text-center text-gray-500">
                        {loading ? 'Loading...' : 'No data yet for last 7 days.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="border rounded-xl bg-white p-4 lg:col-span-2 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">Office Performance (Last 7 Days)</h2>
              <span className="text-xs text-gray-500">By office - loads created</span>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Office</th>
                    <th className="px-3 py-2 text-right">Loads</th>
                    <th className="px-3 py-2 text-right">Open</th>
                    <th className="px-3 py-2 text-right">Covered</th>
                    <th className="px-3 py-2 text-right">Lost</th>
                    <th className="px-3 py-2 text-right">Coverage %</th>
                    <th className="px-3 py-2 text-right">Lost %</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.officeStats?.length ? (
                    data.officeStats.map(o => (
                      <tr key={o.officeId ?? 'UNASSIGNED'} className="border-t">
                        <td className="px-3 py-2">{o.officeName}</td>
                        <td className="px-3 py-2 text-right">{o.total}</td>
                        <td className="px-3 py-2 text-right">{o.open}</td>
                        <td className="px-3 py-2 text-right">{o.covered}</td>
                        <td className="px-3 py-2 text-right">{o.lost}</td>
                        <td className="px-3 py-2 text-right">
                          <span className={o.coveragePct >= 50 ? 'text-green-600' : o.coveragePct >= 25 ? 'text-yellow-600' : 'text-red-600'}>
                            {o.coveragePct.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className={o.lostPct <= 10 ? 'text-green-600' : o.lostPct <= 25 ? 'text-yellow-600' : 'text-red-600'}>
                            {o.lostPct.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-3 py-4 text-center text-gray-500">
                        {loading ? 'Loading...' : 'No office-level data yet.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border rounded-xl bg-white p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">Lost Load Reasons (Last 30 Days)</h2>
              <span className="text-xs text-gray-500">Only loads with status LOST</span>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-700 mb-1">By Category</h3>
              <div className="space-y-1.5 text-xs">
                {data?.lostReasons?.byCategory?.length ? (
                  data.lostReasons.byCategory.map(row => (
                    <div key={row.category} className="flex items-center justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span>{row.category}</span>
                          <span className="text-gray-500">{row.count}</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded mt-1">
                          <div
                            className="h-1.5 rounded"
                            style={{
                              width: `${
                                data.lostReasons.byCategory[0]
                                  ? (row.count / data.lostReasons.byCategory[0].count) * 100
                                  : 0
                              }%`,
                              background: '#dc2626',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 mt-1">
                    {loading ? 'Loading...' : 'No lost loads with reasons tracked yet.'}
                  </p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-700 mb-1">Top Specific Reasons</h3>
              <ul className="space-y-1 text-xs">
                {data?.lostReasons?.byReason?.length ? (
                  data.lostReasons.byReason.map(row => (
                    <li key={row.reason} className="flex items-center justify-between gap-2">
                      <span className="truncate max-w-[140px]" title={row.reason}>
                        {row.reason}
                      </span>
                      <span className="text-gray-500">{row.count}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-gray-500">
                    {loading ? 'Loading...' : 'No detailed lost reasons recorded yet.'}
                  </li>
                )}
              </ul>
            </div>

            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-semibold text-gray-700">
                  Loss Playbooks (Top 3)
                </h3>
                {lossInsights && (
                  <span className="text-[10px] text-gray-400">
                    Window: last {lossInsights.windowDays} days | Lost: {lossInsights.totalLost}
                  </span>
                )}
              </div>

              {lossInsights && lossInsights.categories.length ? (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {lossInsights.categories.slice(0, 3).map(cat => (
                    <div key={cat.id} className="rounded-md bg-gray-50 p-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold">{cat.label}</span>
                        <span className="text-gray-500">
                          {cat.count} loads | {(cat.share * 100).toFixed(1)}%
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-gray-600">
                        {cat.kpiImpact}
                      </p>
                      <ul className="mt-1 list-disc pl-4 space-y-0.5 text-[11px] text-gray-700">
                        {cat.sopSteps.slice(0, 2).map(step => (
                          <li key={step}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  {loading ? 'Loading...' : 'Not enough lost loads with categories to generate playbooks yet.'}
                </p>
              )}
            </div>
          </div>
        </div>

      <p className="text-xs text-gray-400">
        Test Mode {testMode ? 'ON' : 'OFF'} - when OFF, test loads are excluded from all dashboard metrics.
      </p>
    </div>
  );
}

LogisticsDashboard.title = "Logistics Dashboard";
