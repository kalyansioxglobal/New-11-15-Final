import { useState, useEffect } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useTestMode } from '@/contexts/TestModeContext';
import { Skeleton } from '@/components/ui/Skeleton';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.statusText}`);
  }
  return res.json();
};

type TeamMember = {
  userId: number;
  userName: string;
  userEmail: string;
  role: string;
  ventures: string[];
  offices: string[];
  submitted: boolean;
  reportId: number | null;
  status: string | null;
  hoursWorked: number | null;
  tasksCompleted: number | null;
  hasBlockers: boolean;
  submittedAt: string | null;
};

type TeamData = {
  date: string;
  summary: {
    total: number;
    submitted: number;
    pending: number;
    needsAttention: number;
    withBlockers: number;
  };
  team: TeamMember[];
};

type Venture = { id: number; name: string };

function TeamEodReportsPage() {
  const { testMode } = useTestMode();
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [selectedVentureId, setSelectedVentureId] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'submitted' | 'pending' | 'blockers'>('all');

  const { data: ventures, error: venturesError } = useSWR<Venture[]>(
    `/api/ventures?includeTest=${testMode}`,
    fetcher
  );

  // Build API URL with date range
  const apiUrl = `/api/eod-reports/team?startDate=${startDate}&endDate=${endDate}&includeTest=${testMode}${selectedVentureId ? `&ventureId=${selectedVentureId}` : ''}`;
  
  const { data, error, isLoading } = useSWR<TeamData>(
    apiUrl,
    fetcher
  );

  // Show toast notifications for errors
  useEffect(() => {
    if (venturesError) {
      toast.error('Failed to load ventures. Please try again.');
    }
  }, [venturesError]);

  useEffect(() => {
    if (error) {
      toast.error('Failed to load team reports. You may not have permission to view this page.');
    }
  }, [error]);

  const filteredTeam = data?.team.filter((m) => {
    if (filter === 'submitted') return m.submitted;
    if (filter === 'pending') return !m.submitted;
    if (filter === 'blockers') return m.hasBlockers;
    return true;
  }) ?? [];

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-slate-100 mb-1">Team EOD Reports</h1>
          <p className="text-sm text-gray-600 dark:text-slate-400">Monitor your team&apos;s daily report submissions</p>
        </div>
        <Link 
          href="/eod-reports/submit" 
          className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl text-center sm:text-left"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Submit Your Report
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 md:p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
          <div className="flex flex-wrap gap-3 flex-1">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (e.target.value > endDate) {
                    setEndDate(e.target.value);
                  }
                }}
                max={today}
                className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              />
            </div>

            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  const newEndDate = e.target.value;
                  if (newEndDate >= startDate) {
                    setEndDate(newEndDate);
                  }
                }}
                min={startDate}
                max={today}
                className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              />
            </div>

            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-2">Venture</label>
              {ventures === undefined && !venturesError ? (
                <Skeleton className="h-10 w-full rounded-lg" />
              ) : (
                <select
                  value={selectedVentureId}
                  onChange={(e) => setSelectedVentureId(e.target.value)}
                  disabled={venturesError || !ventures}
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">All Ventures</option>
                  {ventures?.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:ml-auto">
            {(['all', 'submitted', 'pending', 'blockers'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                  filter === f
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {f === 'all' ? 'All' : f === 'blockers' ? 'With Blockers' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading && !data ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, idx) => (
            <Skeleton key={idx} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : error && !data ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-700 dark:text-red-300 font-medium mb-2">Failed to load team reports</p>
          <p className="text-red-600 dark:text-red-400 text-sm mb-4">You may not have permission to view this page.</p>
          <Link href="/eod-reports/submit" className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium text-sm">
            Go to submit your report
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 md:p-5 text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-slate-100 mb-1">{data.summary.total}</div>
            <div className="text-xs text-gray-600 dark:text-slate-400 font-medium">Team Members</div>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-xl border border-emerald-200 dark:border-emerald-500/40 p-4 md:p-5 text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="text-2xl md:text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">{data.summary.submitted}</div>
            <div className="text-xs text-emerald-700 dark:text-emerald-300/80 font-medium">Submitted</div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl border border-amber-200 dark:border-amber-500/40 p-4 md:p-5 text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="text-2xl md:text-3xl font-bold text-amber-600 dark:text-amber-400 mb-1">{data.summary.pending}</div>
            <div className="text-xs text-amber-700 dark:text-amber-300/80 font-medium">Pending</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/30 rounded-xl border border-red-200 dark:border-red-500/40 p-4 md:p-5 text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="text-2xl md:text-3xl font-bold text-red-600 dark:text-red-400 mb-1">{data.summary.needsAttention}</div>
            <div className="text-xs text-red-700 dark:text-red-300/80 font-medium">Needs Attention</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-xl border border-yellow-200 dark:border-yellow-500/40 p-4 md:p-5 text-center shadow-sm hover:shadow-md transition-shadow col-span-2 sm:col-span-1">
            <div className="text-2xl md:text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">{data.summary.withBlockers}</div>
            <div className="text-xs text-yellow-700 dark:text-yellow-300/80 font-medium">With Blockers</div>
          </div>
        </div>
      ) : null}

      <div className="hidden md:block bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600">
              <tr>
                <th className="text-left px-4 py-3 font-bold text-gray-700 dark:text-slate-300 text-xs uppercase tracking-wider whitespace-nowrap">Employee</th>
                <th className="text-left px-4 py-3 font-bold text-gray-700 dark:text-slate-300 text-xs uppercase tracking-wider whitespace-nowrap">Role</th>
                <th className="text-left px-4 py-3 font-bold text-gray-700 dark:text-slate-300 text-xs uppercase tracking-wider whitespace-nowrap min-w-[140px]">Venture(s)</th>
                <th className="text-center px-4 py-3 font-bold text-gray-700 dark:text-slate-300 text-xs uppercase tracking-wider whitespace-nowrap min-w-[100px]">Status</th>
                <th className="text-center px-4 py-3 font-bold text-gray-700 dark:text-slate-300 text-xs uppercase tracking-wider whitespace-nowrap">Hours</th>
                <th className="text-center px-4 py-3 font-bold text-gray-700 dark:text-slate-300 text-xs uppercase tracking-wider whitespace-nowrap">Tasks</th>
                <th className="text-center px-4 py-3 font-bold text-gray-700 dark:text-slate-300 text-xs uppercase tracking-wider whitespace-nowrap">Blockers</th>
                <th className="text-right px-4 py-3 font-bold text-gray-700 dark:text-slate-300 text-xs uppercase tracking-wider whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700/50">
              {isLoading && !data ? (
                <>
                  {[...Array(5)].map((_, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-32" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-24" /></td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          <Skeleton className="h-6 w-28" />
                          <Skeleton className="h-6 w-24" />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center"><Skeleton className="h-6 w-20 mx-auto rounded-full" /></td>
                      <td className="px-4 py-3 text-center"><Skeleton className="h-5 w-12 mx-auto" /></td>
                      <td className="px-4 py-3 text-center"><Skeleton className="h-5 w-12 mx-auto" /></td>
                      <td className="px-4 py-3 text-center"><Skeleton className="h-6 w-6 mx-auto rounded-full" /></td>
                      <td className="px-4 py-3 text-right"><Skeleton className="h-8 w-16 ml-auto" /></td>
                    </tr>
                  ))}
                </>
              ) : filteredTeam.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-slate-700/50 rounded-full mb-4">
                      <svg className="w-8 h-8 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <p className="text-gray-600 dark:text-slate-400 text-sm font-medium">No team members found</p>
                    <p className="text-gray-500 dark:text-slate-500 text-xs mt-1">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                filteredTeam.map((member) => (
                  <tr key={member.userId} className={`hover:bg-emerald-50 dark:hover:bg-emerald-500/5 transition-colors ${!member.submitted ? 'bg-white dark:bg-emerald-500/5' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900 dark:text-slate-100 whitespace-nowrap">{member.userName}</div>
                      <div className="text-xs text-gray-500 dark:text-slate-500">{member.userEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-slate-300 whitespace-nowrap font-medium">{member.role}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        {member.ventures.slice(0, 2).map((v, i) => (
                          <span key={i} className="inline-block bg-gray-100 dark:bg-slate-700/80 text-gray-700 dark:text-slate-200 px-2.5 py-1 rounded-md text-xs font-medium truncate max-w-[130px] border border-gray-200 dark:border-slate-600/50">
                            {v}
                          </span>
                        ))}
                        {member.ventures.length > 2 && (
                          <span className="text-xs text-gray-500 dark:text-slate-500 font-medium">+{member.ventures.length - 2} more</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <StatusBadge submitted={member.submitted} status={member.status} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-900 dark:text-slate-200 font-medium">
                      {member.hoursWorked ?? <span className="text-gray-500 dark:text-slate-500">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-900 dark:text-slate-200 font-medium">
                      {member.tasksCompleted ?? <span className="text-gray-500 dark:text-slate-500">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {member.hasBlockers ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-full text-sm" title="Has blockers">⚠</span>
                      ) : (
                        <span className="text-gray-400 dark:text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {member.reportId ? (
                        <Link
                          href={`/eod-reports/${member.reportId}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-all"
                        >
                          View
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      ) : (
                        <span className="text-gray-400 dark:text-slate-600 text-sm">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="md:hidden space-y-3">
        {isLoading ? (
          <>
            {[...Array(5)].map((_, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-5 w-2/3 mb-1" />
                    <Skeleton className="h-4 w-1/2 mb-0.5" />
                    <Skeleton className="h-3 w-1/3 mt-1" />
                  </div>
                  <Skeleton className="h-7 w-20 rounded-full" />
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-5 w-16 rounded-md" />
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex gap-4">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
            ))}
          </>
        ) : filteredTeam.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 text-center shadow-sm">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-slate-700/50 rounded-full mb-4">
              <svg className="w-8 h-8 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-gray-600 dark:text-slate-400 text-sm font-medium">No team members found</p>
            <p className="text-gray-500 dark:text-slate-500 text-xs mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          filteredTeam.map((member) => (
            <div
              key={member.userId}
              className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-all ${!member.submitted ? 'border-l-4 border-l-amber-500/50 bg-amber-50 dark:bg-amber-500/5' : ''}`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-gray-900 dark:text-slate-100 truncate">{member.userName}</div>
                  <div className="text-xs text-gray-500 dark:text-slate-500 truncate">{member.userEmail}</div>
                  <div className="text-xs text-gray-600 dark:text-slate-400 mt-1 font-medium">{member.role}</div>
                </div>
                <StatusBadge submitted={member.submitted} status={member.status} />
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {member.ventures.slice(0, 3).map((v, i) => (
                  <span key={i} className="bg-gray-100 dark:bg-slate-700/80 text-gray-700 dark:text-slate-200 px-2.5 py-1 rounded-md text-xs font-medium border border-gray-200 dark:border-slate-600/50">
                    {v}
                  </span>
                ))}
                {member.ventures.length > 3 && (
                  <span className="text-xs text-gray-500 dark:text-slate-500 py-1 font-medium">+{member.ventures.length - 3}</span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex gap-4 text-gray-600 dark:text-slate-400">
                  <span>Hours: <span className="text-gray-900 dark:text-slate-200 font-semibold">{member.hoursWorked ?? '—'}</span></span>
                  <span>Tasks: <span className="text-gray-900 dark:text-slate-200 font-semibold">{member.tasksCompleted ?? '—'}</span></span>
                  {member.hasBlockers && (
                    <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold">
                      <span>⚠</span> Blockers
                    </span>
                  )}
                </div>
                {member.reportId ? (
                  <Link
                    href={`/eod-reports/${member.reportId}`}
                    className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-semibold transition-colors"
                  >
                    View
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      {data && data.summary.pending > 0 && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border-l-4 border-amber-500 rounded-lg p-4 text-sm text-amber-800 dark:text-amber-300 flex items-start gap-3">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <strong className="text-amber-900 dark:text-amber-200 font-semibold">{data.summary.pending}</strong> team member{data.summary.pending > 1 ? 's have' : ' has'} not submitted their EOD report{startDate !== endDate ? ` for the selected date range` : ` for ${startDate}`}.
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ submitted, status }: { submitted: boolean; status: string | null }) {
  if (submitted) {
    const styles = status === 'REVIEWED' 
      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30'
      : status === 'NEEDS_ATTENTION' 
      ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border-red-300 dark:border-red-500/30'
      : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-500/30';
    
    const label = status === 'REVIEWED' 
      ? '✓ Reviewed'
      : status === 'NEEDS_ATTENTION' 
      ? '! Attention'
      : '● Submitted';

    return (
      <span className={`inline-flex items-center justify-center gap-1 px-2 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${styles}`}>
        {label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 border border-gray-300 dark:border-slate-600 whitespace-nowrap">
      ○ Pending
    </span>
  );
}

TeamEodReportsPage.title = 'Team EOD Reports';

export default TeamEodReportsPage;
