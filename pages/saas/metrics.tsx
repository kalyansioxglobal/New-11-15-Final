import { GetServerSideProps } from 'next';
import { useState, useEffect } from 'react';
import { getEffectiveUser } from '@/lib/effectiveUser';
import type { PageWithLayout } from '@/types/page';

type MetricsData = {
  summary: {
    currentMrr: number;
    currentArr: number;
    lastMonthMrr: number;
    mrrGrowth: number;
    netNewMrr: number;
    newMrrThisMonth: number;
    churnedMrrThisMonth: number;
    revenueChurnRate: number;
    activeSubscriptions: number;
    activeCustomers: number;
    churnedThisMonth: number;
    arpu: number;
    totalCustomers: number;
  };
  monthlyTrend: { month: string; mrr: number; arr: number; customers: number }[];
  planBreakdown: { plan: string; count: number; mrr: number }[];
  cancelReasons: { reason: string; count: number; mrr: number }[];
};

type CohortData = {
  cohorts: {
    cohort: string;
    cohortDate: string;
    initialCustomers: number;
    initialMrr: number;
    retention: number[];
    mrrRetention: number[];
  }[];
  summary: {
    totalCohorts: number;
    avgRetentionByMonth: number[];
    estimatedLtvMonths: number;
  };
};

type Venture = { id: number; name: string; type: string };

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const user = await getEffectiveUser(ctx.req, ctx.res);
  if (!user) {
    return { redirect: { destination: '/login', permanent: false } };
  }
  const allowedRoles = ['CEO', 'ADMIN', 'COO', 'VENTURE_HEAD', 'OFFICE_MANAGER', 'FINANCE', 'AUDITOR'];
  if (!allowedRoles.includes(user.role)) {
    return { redirect: { destination: '/overview', permanent: false } };
  }
  return { props: {} };
};

function SaasMetricsPage() {
  const [ventures, setVentures] = useState<Venture[]>([]);
  const [selectedVentureId, setSelectedVentureId] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [cohorts, setCohorts] = useState<CohortData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'cohorts'>('overview');

  useEffect(() => {
    fetch('/api/ventures?types=SAAS')
      .then((r) => r.json())
      .then((v) => {
        setVentures(v);
        if (v.length > 0) {
          setSelectedVentureId(v[0].id);
        }
      });
  }, []);

  useEffect(() => {
    if (!selectedVentureId) return;
    setLoading(true);
    
    const params = `ventureId=${selectedVentureId}`;
    Promise.all([
      fetch(`/api/saas/metrics?${params}`).then((r) => r.json()),
      fetch(`/api/saas/cohorts?${params}`).then((r) => r.json()),
    ])
      .then(([m, c]) => {
        setMetrics(m);
        setCohorts(c);
      })
      .finally(() => setLoading(false));
  }, [selectedVentureId]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  const formatPercent = (val: number) => `${val > 0 ? '+' : ''}${val}%`;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">SaaS Metrics Dashboard</h1>
        <select
          value={selectedVentureId || ''}
          onChange={(e) => setSelectedVentureId(Number(e.target.value))}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          {ventures.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
          }`}
        >
          MRR/ARR Overview
        </button>
        <button
          onClick={() => setActiveTab('cohorts')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'cohorts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
          }`}
        >
          Cohort Analysis
        </button>
      </div>

      {loading && <div className="text-center py-12 text-gray-500">Loading metrics...</div>}

      {!loading && metrics && activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-3xl font-bold text-blue-600">{formatCurrency(metrics.summary.currentMrr)}</div>
              <div className="text-sm text-gray-500">Monthly Recurring Revenue</div>
              <div className={`text-xs mt-1 ${metrics.summary.mrrGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercent(metrics.summary.mrrGrowth)} vs last month
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-3xl font-bold text-purple-600">{formatCurrency(metrics.summary.currentArr)}</div>
              <div className="text-sm text-gray-500">Annual Recurring Revenue</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-3xl font-bold text-green-600">{formatCurrency(metrics.summary.netNewMrr)}</div>
              <div className="text-sm text-gray-500">Net New MRR</div>
              <div className="text-xs text-gray-400 mt-1">
                +{formatCurrency(metrics.summary.newMrrThisMonth)} new, -{formatCurrency(metrics.summary.churnedMrrThisMonth)} churned
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-3xl font-bold text-amber-600">{formatCurrency(metrics.summary.arpu)}</div>
              <div className="text-sm text-gray-500">ARPU</div>
              <div className="text-xs text-gray-400 mt-1">{metrics.summary.activeCustomers} active customers</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-2xl font-bold">{metrics.summary.activeSubscriptions}</div>
              <div className="text-sm text-gray-500">Active Subscriptions</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-2xl font-bold text-red-600">{metrics.summary.churnedThisMonth}</div>
              <div className="text-sm text-gray-500">Churned This Month</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-2xl font-bold text-red-600">{metrics.summary.revenueChurnRate}%</div>
              <div className="text-sm text-gray-500">Revenue Churn Rate</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-2xl font-bold">{metrics.summary.totalCustomers}</div>
              <div className="text-sm text-gray-500">Total Customers</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50">
                <h2 className="font-semibold">MRR Trend (12 Months)</h2>
              </div>
              <div className="p-4">
                <div className="flex items-end gap-1 h-48">
                  {metrics.monthlyTrend.map((m, i) => {
                    const maxMrr = Math.max(...metrics.monthlyTrend.map((x) => x.mrr));
                    const height = maxMrr > 0 ? (m.mrr / maxMrr) * 100 : 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-blue-500 rounded-t"
                          style={{ height: `${height}%` }}
                          title={formatCurrency(m.mrr)}
                        />
                        <div className="text-xs text-gray-500 mt-1 rotate-45 origin-left">{m.month}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50">
                <h2 className="font-semibold">Plan Breakdown</h2>
              </div>
              <div className="divide-y">
                {metrics.planBreakdown.map((p, i) => (
                  <div key={i} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{p.plan}</div>
                      <div className="text-sm text-gray-500">{p.count} subscriptions</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(p.mrr)}</div>
                      <div className="text-xs text-gray-500">MRR</div>
                    </div>
                  </div>
                ))}
                {metrics.planBreakdown.length === 0 && (
                  <div className="px-4 py-8 text-center text-gray-500">No plans found</div>
                )}
              </div>
            </div>
          </div>

          {metrics.cancelReasons.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50">
                <h2 className="font-semibold">Cancellation Reasons (This Month)</h2>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {metrics.cancelReasons.map((r, i) => (
                    <div key={i} className="p-3 bg-red-50 rounded-lg">
                      <div className="font-medium text-red-800">{r.reason}</div>
                      <div className="text-sm text-red-600">{r.count} cancellations</div>
                      <div className="text-xs text-red-500">{formatCurrency(r.mrr)} lost MRR</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {!loading && cohorts && activeTab === 'cohorts' && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-2xl font-bold">{cohorts.summary.totalCohorts}</div>
              <div className="text-sm text-gray-500">Cohorts Analyzed</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-2xl font-bold text-blue-600">{cohorts.summary.estimatedLtvMonths} months</div>
              <div className="text-sm text-gray-500">Estimated LTV</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-2xl font-bold text-green-600">
                {cohorts.summary.avgRetentionByMonth[11] || 0}%
              </div>
              <div className="text-sm text-gray-500">12-Month Retention</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h2 className="font-semibold">Cohort Retention Table</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Cohort</th>
                    <th className="px-3 py-2 text-right">Customers</th>
                    <th className="px-3 py-2 text-right">Initial MRR</th>
                    {[...Array(12)].map((_, i) => (
                      <th key={i} className="px-2 py-2 text-center text-xs">M{i + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {cohorts.cohorts.map((c, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-medium">{c.cohort}</td>
                      <td className="px-3 py-2 text-right">{c.initialCustomers}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(c.initialMrr)}</td>
                      {[...Array(12)].map((_, m) => {
                        const retention = c.retention[m];
                        const color = retention === undefined
                          ? 'bg-gray-100'
                          : retention >= 80
                          ? 'bg-green-100 text-green-800'
                          : retention >= 50
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800';
                        return (
                          <td key={m} className={`px-2 py-2 text-center text-xs ${color}`}>
                            {retention !== undefined ? `${retention}%` : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

(SaasMetricsPage as PageWithLayout).title = 'SaaS Metrics';
export default SaasMetricsPage;
