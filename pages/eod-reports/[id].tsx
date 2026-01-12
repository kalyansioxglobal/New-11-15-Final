import { useRouter } from 'next/router';
import useSWR from 'swr';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Skeleton } from '@/components/ui/Skeleton';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.statusText}`);
  }
  return res.json();
};

type EodReport = {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  ventureId: number;
  ventureName: string;
  officeId: number | null;
  officeName: string | null;
  date: string;
  summary: string;
  accomplishments: string | null;
  blockers: string | null;
  tomorrowPlan: string | null;
  hoursWorked: number | null;
  tasksCompleted: number | null;
  status: string;
  managerNotes: string | null;
  reviewedAt: string | null;
  reviewedByName: string | null;
  createdAt: string;
  updatedAt: string;
};

function EodReportDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [managerNotes, setManagerNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const { data: report, error, isLoading, mutate } = useSWR<EodReport>(
    id ? `/api/eod-reports/${id}` : null,
    fetcher
  );

  // Initialize manager notes from report when loaded
  useEffect(() => {
    if (report?.managerNotes) {
      setManagerNotes(report.managerNotes);
    }
  }, [report?.managerNotes]);

  // Show toast for errors
  useEffect(() => {
    if (error) {
      toast.error('Failed to load report. Please try again.');
    }
  }, [error]);

  const handleStatusUpdate = async (status: string) => {
    if (!id) return;
    setUpdating(true);

    try {
      const res = await fetch(`/api/eod-reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, managerNotes: managerNotes || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update report');
      }

      toast.success('Report updated successfully!');
      mutate();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update report');
    } finally {
      setUpdating(false);
    }
  };

  if (error && !report) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-700 dark:text-red-300 font-medium mb-2">Failed to load report</p>
          <p className="text-red-600 dark:text-red-400 text-sm mb-4">The report may not exist or you may not have permission to view it.</p>
          <Link href="/eod-reports/team" className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm">
            ← Back to Team Reports
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading || !report) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  const reportDate = new Date(report.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const statusStyles = {
    REVIEWED: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30',
    NEEDS_ATTENTION: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-500/30',
    SUBMITTED: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-500/30',
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/eod-reports/team" className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Team Reports
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mt-2">EOD Report</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{reportDate}</p>
        </div>
        <div className={`px-4 py-2 rounded-lg text-sm font-semibold border ${statusStyles[report.status as keyof typeof statusStyles] || statusStyles.SUBMITTED}`}>
          {report.status === 'REVIEWED' ? '✓ Reviewed' :
           report.status === 'NEEDS_ATTENTION' ? '⚠ Needs Attention' :
           '● Submitted'}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 md:p-6 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-gray-200 dark:border-slate-700">
          <div>
            <div className="font-bold text-lg text-gray-900 dark:text-white">{report.userName}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{report.userEmail}</div>
          </div>
          <div className="text-right text-sm">
            <div className="font-medium text-gray-700 dark:text-gray-300">{report.ventureName}</div>
            {report.officeName && <div className="text-gray-500 dark:text-gray-400 mt-1">{report.officeName}</div>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-200 dark:border-slate-700">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-700/50 dark:to-slate-700 rounded-lg p-4 border border-gray-200 dark:border-slate-600">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Hours Worked</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">{report.hoursWorked ?? '—'}</div>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-700/50 dark:to-slate-700 rounded-lg p-4 border border-gray-200 dark:border-slate-600">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Tasks Completed</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">{report.tasksCompleted ?? '—'}</div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <span className="w-1 h-5 bg-blue-500 rounded-full"></span>
            Summary
          </h3>
          <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 border border-gray-200 dark:border-slate-600">
            {report.summary}
          </div>
        </div>

        {report.accomplishments && (
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-emerald-500 rounded-full"></span>
              Key Accomplishments
            </h3>
            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-900/40 rounded-lg p-4 border border-emerald-200 dark:border-emerald-700/50">
              {report.accomplishments}
            </div>
          </div>
        )}

        {report.blockers && (
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-red-500 rounded-full"></span>
              Blockers / Challenges
            </h3>
            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-900/40 rounded-lg p-4 border border-red-200 dark:border-red-700/50">
              {report.blockers}
            </div>
          </div>
        )}

        {report.tomorrowPlan && (
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-blue-500 rounded-full"></span>
              Plan for Tomorrow
            </h3>
            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/40 rounded-lg p-4 border border-blue-200 dark:border-blue-700/50">
              {report.tomorrowPlan}
            </div>
          </div>
        )}

        {report.reviewedByName && (
          <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Reviewed by <span className="font-semibold text-gray-700 dark:text-gray-300">{report.reviewedByName}</span> on{' '}
              <span className="font-medium">{new Date(report.reviewedAt!).toLocaleString()}</span>
            </div>
            {report.managerNotes && (
              <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-900/40 rounded-lg p-4 border border-purple-200 dark:border-purple-700/50">
                <span className="font-semibold text-purple-900 dark:text-purple-300">Manager Notes:</span>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-wrap">{report.managerNotes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 md:p-6 space-y-4 shadow-sm">
        <h3 className="font-semibold text-lg text-gray-900 dark:text-white flex items-center gap-2">
          <span className="w-1 h-5 bg-purple-500 rounded-full"></span>
          Manager Actions
        </h3>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Add Notes (optional)</label>
          <textarea
            value={managerNotes}
            onChange={(e) => setManagerNotes(e.target.value)}
            rows={4}
            placeholder="Add feedback or notes for this report..."
            className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={() => handleStatusUpdate('REVIEWED')}
            disabled={updating || report.status === 'REVIEWED'}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg disabled:shadow-none"
          >
            {updating && report.status !== 'REVIEWED' ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Updating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {report.status === 'REVIEWED' ? 'Already Reviewed' : 'Mark as Reviewed'}
              </>
            )}
          </button>
          <button
            onClick={() => handleStatusUpdate('NEEDS_ATTENTION')}
            disabled={updating}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg disabled:shadow-none"
          >
            {updating ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Updating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Needs Attention
              </>
            )}
          </button>
        </div>
      </div>

      <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
        Submitted at <span className="font-medium">{new Date(report.createdAt).toLocaleString()}</span>
        {report.updatedAt !== report.createdAt && (
          <>
            {' · '}
            Last updated <span className="font-medium">{new Date(report.updatedAt).toLocaleString()}</span>
          </>
        )}
      </div>
    </div>
  );
}

EodReportDetailPage.title = 'View EOD Report';

export default EodReportDetailPage;
