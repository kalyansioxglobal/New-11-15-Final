import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useTestMode } from '@/contexts/TestModeContext';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedVentureId, setSelectedVentureId] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'submitted' | 'pending' | 'blockers'>('all');

  const { data: ventures } = useSWR<Venture[]>(
    `/api/ventures?includeTest=${testMode}`,
    fetcher
  );

  const { data, error, isLoading } = useSWR<TeamData>(
    `/api/eod-reports/team?date=${selectedDate}&includeTest=${testMode}${selectedVentureId ? `&ventureId=${selectedVentureId}` : ''}`,
    fetcher
  );

  const filteredTeam = data?.team.filter((m) => {
    if (filter === 'submitted') return m.submitted;
    if (filter === 'pending') return !m.submitted;
    if (filter === 'blockers') return m.hasBlockers;
    return true;
  }) ?? [];

  if (error) {
    return (
      <div className="p-4 md:p-6 text-center">
        <p className="text-red-400">Failed to load team reports. You may not have permission to view this page.</p>
        <Link href="/eod-reports/submit" className="text-emerald-400 hover:underline mt-4 inline-block">
          Go to submit your report
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-slate-100">Team EOD Reports</h1>
          <p className="text-sm text-slate-400">Monitor your team&apos;s daily report submissions</p>
        </div>
        <Link href="/eod-reports/submit" className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors text-center sm:text-left">
          Submit Your Report
        </Link>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 p-3 md:p-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 lg:items-end">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs text-slate-400 mb-1">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full border border-slate-600 bg-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs text-slate-400 mb-1">Venture</label>
              <select
                value={selectedVentureId}
                onChange={(e) => setSelectedVentureId(e.target.value)}
                className="w-full border border-slate-600 bg-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="">All Ventures</option>
                {ventures?.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:ml-auto">
            {(['all', 'submitted', 'pending', 'blockers'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
                }`}
              >
                {f === 'all' ? 'All' : f === 'blockers' ? 'With Blockers' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-3 md:p-4 text-center">
            <div className="text-xl md:text-2xl font-bold text-slate-100">{data.summary.total}</div>
            <div className="text-[10px] md:text-xs text-slate-400">Team Members</div>
          </div>
          <div className="bg-slate-800 rounded-xl border border-emerald-500/30 p-3 md:p-4 text-center">
            <div className="text-xl md:text-2xl font-bold text-emerald-400">{data.summary.submitted}</div>
            <div className="text-[10px] md:text-xs text-slate-400">Submitted</div>
          </div>
          <div className="bg-slate-800 rounded-xl border border-amber-500/30 p-3 md:p-4 text-center">
            <div className="text-xl md:text-2xl font-bold text-amber-400">{data.summary.pending}</div>
            <div className="text-[10px] md:text-xs text-slate-400">Pending</div>
          </div>
          <div className="bg-slate-800 rounded-xl border border-red-500/30 p-3 md:p-4 text-center">
            <div className="text-xl md:text-2xl font-bold text-red-400">{data.summary.needsAttention}</div>
            <div className="text-[10px] md:text-xs text-slate-400">Needs Attention</div>
          </div>
          <div className="bg-slate-800 rounded-xl border border-yellow-500/30 p-3 md:p-4 text-center col-span-2 sm:col-span-1">
            <div className="text-xl md:text-2xl font-bold text-yellow-400">{data.summary.withBlockers}</div>
            <div className="text-[10px] md:text-xs text-slate-400">With Blockers</div>
          </div>
        </div>
      )}

      <div className="hidden md:block bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider whitespace-nowrap">Employee</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider whitespace-nowrap">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider whitespace-nowrap min-w-[140px]">Venture(s)</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider whitespace-nowrap min-w-[100px]">Status</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider whitespace-nowrap">Hours</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider whitespace-nowrap">Tasks</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider whitespace-nowrap">Blockers</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-400" />
                      Loading team reports...
                    </div>
                  </td>
                </tr>
              ) : filteredTeam.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    No team members found for the selected filters.
                  </td>
                </tr>
              ) : (
                filteredTeam.map((member) => (
                  <tr key={member.userId} className={`hover:bg-slate-700/30 transition-colors ${!member.submitted ? 'bg-amber-500/5' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-100 whitespace-nowrap">{member.userName}</div>
                      <div className="text-xs text-slate-500">{member.userEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{member.role}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {member.ventures.slice(0, 2).map((v, i) => (
                          <span key={i} className="inline-block bg-slate-700 text-slate-200 px-2 py-0.5 rounded text-xs truncate max-w-[130px]">
                            {v}
                          </span>
                        ))}
                        {member.ventures.length > 2 && (
                          <span className="text-xs text-slate-500">+{member.ventures.length - 2} more</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <StatusBadge submitted={member.submitted} status={member.status} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-300">
                      {member.hoursWorked ?? <span className="text-slate-500">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-300">
                      {member.tasksCompleted ?? <span className="text-slate-500">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {member.hasBlockers ? (
                        <span className="text-red-400 text-lg" title="Has blockers">⚠</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {member.reportId ? (
                        <Link
                          href={`/eod-reports/${member.reportId}`}
                          className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors"
                        >
                          View
                        </Link>
                      ) : (
                        <span className="text-slate-600 text-sm">—</span>
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
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 text-center text-slate-400">
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-400" />
              Loading team reports...
            </div>
          </div>
        ) : filteredTeam.length === 0 ? (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 text-center text-slate-400">
            No team members found for the selected filters.
          </div>
        ) : (
          filteredTeam.map((member) => (
            <div
              key={member.userId}
              className={`bg-slate-800 rounded-xl border border-slate-700 p-4 ${!member.submitted ? 'border-l-4 border-l-amber-500/50' : ''}`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-100 truncate">{member.userName}</div>
                  <div className="text-xs text-slate-500 truncate">{member.userEmail}</div>
                  <div className="text-xs text-slate-400 mt-1">{member.role}</div>
                </div>
                <StatusBadge submitted={member.submitted} status={member.status} />
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                {member.ventures.slice(0, 3).map((v, i) => (
                  <span key={i} className="bg-slate-700 text-slate-200 px-2 py-0.5 rounded text-xs">
                    {v}
                  </span>
                ))}
                {member.ventures.length > 3 && (
                  <span className="text-xs text-slate-500 py-0.5">+{member.ventures.length - 3}</span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex gap-4 text-slate-400">
                  <span>Hours: <span className="text-slate-200">{member.hoursWorked ?? '—'}</span></span>
                  <span>Tasks: <span className="text-slate-200">{member.tasksCompleted ?? '—'}</span></span>
                  {member.hasBlockers && <span className="text-red-400">⚠ Blockers</span>}
                </div>
                {member.reportId ? (
                  <Link
                    href={`/eod-reports/${member.reportId}`}
                    className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                  >
                    View Report
                  </Link>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      {data && data.summary.pending > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 md:p-4 text-sm text-amber-300">
          <strong className="text-amber-200">{data.summary.pending}</strong> team member{data.summary.pending > 1 ? 's have' : ' has'} not submitted their EOD report for {selectedDate}.
        </div>
      )}
    </div>
  );
}

function StatusBadge({ submitted, status }: { submitted: boolean; status: string | null }) {
  if (submitted) {
    const styles = status === 'REVIEWED' 
      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
      : status === 'NEEDS_ATTENTION' 
      ? 'bg-red-500/20 text-red-300 border-red-500/30'
      : 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    
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
    <span className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-700 text-slate-400 border border-slate-600 whitespace-nowrap">
      ○ Pending
    </span>
  );
}

TeamEodReportsPage.title = 'Team EOD Reports';

export default TeamEodReportsPage;
