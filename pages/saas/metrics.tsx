import { GetServerSideProps } from 'next';
import { useState, useEffect } from 'react';
import { getEffectiveUser } from '@/lib/effectiveUser';
import type { PageWithLayout } from '@/types/page';
import { Skeleton } from '@/components/ui/Skeleton';
import toast from 'react-hot-toast';

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
  const [loading, setLoading] = useState(false);
  const [loadingVentures, setLoadingVentures] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'cohorts'>('overview');
  const [cancelReasonsPage, setCancelReasonsPage] = useState(1);
  const cancelReasonsPerPage = 10;

  useEffect(() => {
    setLoadingVentures(true);
    fetch('/api/ventures?types=SAAS')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load ventures');
        return r.json();
      })
      .then((v) => {
        setVentures(v || []);
      })
      .catch((err) => {
        toast.error('Failed to load ventures');
        console.error('Error loading ventures:', err);
      })
      .finally(() => {
        setLoadingVentures(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedVentureId) {
      setMetrics(null);
      setCohorts(null);
      return;
    }
    
    setLoading(true);
    const params = `ventureId=${selectedVentureId}`;
    Promise.all([
      fetch(`/api/saas/metrics?${params}`)
        .then((r) => {
          if (!r.ok) throw new Error('Failed to load metrics');
          return r.json();
        }),
      fetch(`/api/saas/cohorts?${params}`)
        .then((r) => {
          if (!r.ok) throw new Error('Failed to load cohorts');
          return r.json();
        }),
    ])
      .then(([m, c]) => {
        setMetrics(m);
        setCohorts(c);
        setCancelReasonsPage(1); // Reset pagination when metrics change
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to load metrics');
        setMetrics(null);
        setCohorts(null);
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
          onChange={(e) => setSelectedVentureId(Number(e.target.value) || null)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
        >
          <option value="">Select a venture...</option>
          {ventures.length === 0 && <option value="" disabled>No SaaS ventures available</option>}
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

      {loadingVentures ? (
        <div className="flex justify-center py-8">
          <Skeleton className="w-full h-32" />
        </div>
      ) : (
        <>
          {loading && selectedVentureId && (
            <div className="flex justify-center py-8">
              <Skeleton className="w-full h-[85vh]" />
            </div>
          )}

          {!loading && !selectedVentureId && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-8 text-center">
              <div className="text-blue-400 dark:text-blue-500 text-4xl mb-4">📊</div>
              <h2 className="text-lg font-medium text-blue-700 dark:text-blue-300 mb-2">Please Select a Venture</h2>
              <p className="text-sm text-blue-600 dark:text-blue-400 max-w-md mx-auto">
                Choose a venture from the dropdown above to view its metrics and analytics.
              </p>
            </div>
          )}
        </>
      )}

      {!loading && selectedVentureId && metrics && activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(metrics.summary.currentMrr)}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Monthly Recurring Revenue</div>
              <div className={`text-xs mt-1 ${metrics.summary.mrrGrowth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatPercent(metrics.summary.mrrGrowth)} vs last month
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(metrics.summary.currentArr)}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Annual Recurring Revenue</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className={`text-3xl font-bold ${metrics.summary.netNewMrr >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(metrics.summary.netNewMrr)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Net New MRR</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                +{formatCurrency(metrics.summary.newMrrThisMonth)} new, -{formatCurrency(metrics.summary.churnedMrrThisMonth)} churned
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(metrics.summary.arpu)}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">ARPU</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{metrics.summary.activeCustomers} active customers</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.summary.activeSubscriptions}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Active Subscriptions</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{metrics.summary.churnedThisMonth}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Churned This Month</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{metrics.summary.revenueChurnRate}%</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Revenue Churn Rate</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.summary.totalCustomers}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Total Customers</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <h2 className="font-semibold text-gray-900 dark:text-white">MRR Trend (12 Months)</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Monthly Recurring Revenue over time</p>
              </div>
              <div className="p-4">
                {metrics.monthlyTrend && metrics.monthlyTrend.length > 0 ? (
                  <div className="relative">
                    {(() => {
                      const mrrValues = metrics.monthlyTrend.map((x) => x.mrr);
                      const maxMrr = mrrValues.length > 0 ? Math.max(...mrrValues, 0) : 0;
                      const chartHeight = 280;
                      const yAxisSteps = 5;
                      const yAxisValues: number[] = [];
                      for (let i = 0; i <= yAxisSteps; i++) {
                        yAxisValues.push((maxMrr / yAxisSteps) * i);
                      }
                      
                      return (
                        <div className="relative">
                          {/* Y-Axis Labels */}
                          <div className="absolute left-0 top-0 bottom-12 w-16 flex flex-col justify-between pr-2">
                            {yAxisValues.reverse().map((val, idx) => (
                              <div key={idx} className="text-xs text-gray-500 dark:text-gray-400 text-right">
                                {formatCurrency(val)}
                              </div>
                            ))}
                          </div>
                          
                          {/* Chart Area */}
                          <div className="ml-16 relative" style={{ height: `${chartHeight}px` }}>
                            {/* Grid Lines */}
                            <div className="absolute inset-0 flex flex-col justify-between">
                              {yAxisValues.map((_, idx) => (
                                <div
                                  key={idx}
                                  className="border-t border-gray-200 dark:border-gray-700"
                                />
                              ))}
                            </div>
                            
                            {/* Bars */}
                            <div className="absolute bottom-0 left-0 right-0 flex items-end gap-1.5 h-full">
                              {metrics.monthlyTrend.map((m, i) => {
                                const height = maxMrr > 0 ? (m.mrr / maxMrr) * 100 : 0;
                                const barHeight = (height / 100) * chartHeight;
                                const isCurrentMonth = i === metrics.monthlyTrend.length - 1;
                                const prevMrr = i > 0 ? metrics.monthlyTrend[i - 1].mrr : 0;
                                const growth = prevMrr > 0 ? ((m.mrr - prevMrr) / prevMrr) * 100 : (m.mrr > 0 ? 100 : 0);
                                
                                return (
                                  <div
                                    key={i}
                                    className="flex-1 flex flex-col items-center group relative min-w-0"
                                    style={{ height: '100%' }}
                                  >
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                                      <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                                        <div className="font-semibold mb-1">{m.month}</div>
                                        <div>MRR: {formatCurrency(m.mrr)}</div>
                                        <div>ARR: {formatCurrency(m.arr)}</div>
                                        <div>Customers: {m.customers}</div>
                                        {i > 0 && (
                                          <div className={`mt-1 ${growth >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                                            {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
                                          </div>
                                        )}
                                      </div>
                                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                                        <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                                      </div>
                                    </div>
                                    
                                    {/* Bar */}
                                    <div
                                      className={`w-full rounded-t transition-all relative ${
                                        isCurrentMonth
                                          ? 'bg-blue-600 dark:bg-blue-500 ring-2 ring-blue-300 dark:ring-blue-600'
                                          : 'bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-500'
                                      }`}
                                      style={{
                                        height: `${barHeight}px`,
                                        minHeight: barHeight > 0 ? '2px' : '0',
                                      }}
                                    >
                                      {/* Value Label on Bar */}
                                      {barHeight > 30 && (
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                          {formatCurrency(m.mrr)}
                                        </div>
                                      )}
                                      
                                      {/* Growth Indicator */}
                                      {i > 0 && barHeight > 20 && (
                                        <div className={`absolute -top-4 left-1/2 -translate-x-1/2 text-xs ${
                                          growth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                        }`}>
                                          {growth >= 0 ? '↑' : '↓'}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          
                          {/* X-Axis Labels */}
                          <div className="ml-16 mt-2 flex gap-1.5">
                            {metrics.monthlyTrend.map((m, i) => {
                              // Split "Feb 25" into month and year
                              const parts = m.month.split(' ');
                              const month = parts[0] || '';
                              const year = parts[1] || '';
                              
                              return (
                                <div
                                  key={i}
                                  className="flex-1 text-center min-w-0"
                                >
                                  <div className="flex flex-col items-center">
                                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                      {month}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      {year}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    No trend data available
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <h2 className="font-semibold text-gray-900 dark:text-white">Plan Breakdown</h2>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {metrics.planBreakdown.map((p, i) => (
                  <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{p.plan}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{p.count} subscriptions</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900 dark:text-white">{formatCurrency(p.mrr)}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">MRR</div>
                    </div>
                  </div>
                ))}
                {metrics.planBreakdown.length === 0 && (
                  <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">No plans found</div>
                )}
              </div>
            </div>
          </div>

          {metrics.cancelReasons.length > 0 && (() => {
            const startIndex = (cancelReasonsPage - 1) * cancelReasonsPerPage;
            const endIndex = startIndex + cancelReasonsPerPage;
            const paginatedReasons = metrics.cancelReasons.slice(startIndex, endIndex);
            const totalPages = Math.ceil(metrics.cancelReasons.length / cancelReasonsPerPage);

            return (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <h2 className="font-semibold text-gray-900 dark:text-white">Cancellation Reasons (This Month)</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {metrics.cancelReasons.length} reason{metrics.cancelReasons.length !== 1 ? 's' : ''} found
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Reason
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Cancellations
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Lost MRR
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          % of Total Churn
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {paginatedReasons.map((r, i) => {
                        const totalChurnedMrr = metrics.cancelReasons.reduce((sum, reason) => sum + reason.mrr, 0);
                        const percentage = totalChurnedMrr > 0 ? (r.mrr / totalChurnedMrr) * 100 : 0;
                        return (
                          <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                              {r.reason}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                              {r.count}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-red-600 dark:text-red-400">
                              {formatCurrency(r.mrr)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                              {percentage.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      Showing {startIndex + 1} to {Math.min(endIndex, metrics.cancelReasons.length)} of {metrics.cancelReasons.length} reasons
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCancelReasonsPage(p => Math.max(1, p - 1))}
                        disabled={cancelReasonsPage === 1}
                        className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCancelReasonsPage(p => Math.min(totalPages, p + 1))}
                        disabled={cancelReasonsPage === totalPages}
                        className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </>
      )}

      {!loading && selectedVentureId && cohorts && activeTab === 'cohorts' && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{cohorts.summary.totalCohorts}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Cohorts Analyzed</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{cohorts.summary.estimatedLtvMonths} months</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Estimated LTV</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {cohorts.summary.avgRetentionByMonth[11] || 0}%
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">12-Month Retention</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <h2 className="font-semibold text-gray-900 dark:text-white">Cohort Retention Table</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Customer retention percentage by cohort and month</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Cohort
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Customers
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Initial MRR
                    </th>
                    {[...Array(12)].map((_, i) => (
                      <th key={i} className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                        M{i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {cohorts.cohorts.map((c, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{c.cohort}</td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{c.initialCustomers}</td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{formatCurrency(c.initialMrr)}</td>
                      {[...Array(12)].map((_, m) => {
                        const retention = c.retention[m];
                        const color = retention === undefined
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          : retention >= 80
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          : retention >= 50
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
                        return (
                          <td key={m} className={`px-2 py-2 text-center text-xs font-medium ${color}`}>
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
