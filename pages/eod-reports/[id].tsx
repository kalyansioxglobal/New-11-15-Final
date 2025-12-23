import { useRouter } from 'next/router';
import useSWR from 'swr';
import Link from 'next/link';
import { useState } from 'react';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: report, error, mutate } = useSWR<EodReport>(
    id ? `/api/eod-reports/${id}` : null,
    fetcher
  );

  const handleStatusUpdate = async (status: string) => {
    if (!id) return;
    setUpdating(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/eod-reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, managerNotes: managerNotes || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }

      setMessage({ type: 'success', text: 'Report updated successfully' });
      mutate();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update' });
    } finally {
      setUpdating(false);
    }
  };

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">Failed to load report.</p>
        <Link href="/eod-reports" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to reports
        </Link>
      </div>
    );
  }

  if (!report) {
    return <div className="p-6 text-center text-gray-500">Loading report...</div>;
  }

  const reportDate = new Date(report.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/eod-reports/team" className="text-sm text-blue-600 hover:underline">
            ← Back to Team Reports
          </Link>
          <h1 className="text-2xl font-semibold mt-2">EOD Report</h1>
          <p className="text-sm text-gray-500">{reportDate}</p>
        </div>
        <div className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
          report.status === 'REVIEWED' ? 'bg-green-100 text-green-700' :
          report.status === 'NEEDS_ATTENTION' ? 'bg-red-100 text-red-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          {report.status === 'REVIEWED' ? 'Reviewed' :
           report.status === 'NEEDS_ATTENTION' ? 'Needs Attention' :
           'Submitted'}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <div className="flex items-start justify-between pb-4 border-b border-gray-100">
          <div>
            <div className="font-semibold text-lg">{report.userName}</div>
            <div className="text-sm text-gray-500">{report.userEmail}</div>
          </div>
          <div className="text-right text-sm">
            <div className="text-gray-600">{report.ventureName}</div>
            {report.officeName && <div className="text-gray-400">{report.officeName}</div>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-100">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500">Hours Worked</div>
            <div className="text-lg font-semibold">{report.hoursWorked ?? '—'}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500">Tasks Completed</div>
            <div className="text-lg font-semibold">{report.tasksCompleted ?? '—'}</div>
          </div>
        </div>

        <div>
          <h3 className="font-medium text-gray-900 mb-2">Summary</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
            {report.summary}
          </p>
        </div>

        {report.accomplishments && (
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Key Accomplishments</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap bg-green-50 rounded-lg p-3">
              {report.accomplishments}
            </p>
          </div>
        )}

        {report.blockers && (
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Blockers / Challenges</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap bg-red-50 rounded-lg p-3">
              {report.blockers}
            </p>
          </div>
        )}

        {report.tomorrowPlan && (
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Plan for Tomorrow</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap bg-blue-50 rounded-lg p-3">
              {report.tomorrowPlan}
            </p>
          </div>
        )}

        {report.reviewedByName && (
          <div className="pt-4 border-t border-gray-100 text-sm text-gray-500">
            Reviewed by {report.reviewedByName} on {new Date(report.reviewedAt!).toLocaleString()}
            {report.managerNotes && (
              <div className="mt-2 bg-purple-50 rounded-lg p-3 text-gray-700">
                <span className="font-medium">Manager Notes:</span> {report.managerNotes}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="font-medium text-gray-900">Manager Actions</h3>

        {message && (
          <div className={`p-3 rounded-lg text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Add Notes (optional)</label>
          <textarea
            value={managerNotes}
            onChange={(e) => setManagerNotes(e.target.value)}
            rows={2}
            placeholder="Add feedback or notes for this report..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => handleStatusUpdate('REVIEWED')}
            disabled={updating || report.status === 'REVIEWED'}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            Mark as Reviewed
          </button>
          <button
            onClick={() => handleStatusUpdate('NEEDS_ATTENTION')}
            disabled={updating}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            Needs Attention
          </button>
        </div>
      </div>

      <div className="text-xs text-gray-400 text-center">
        Submitted at {new Date(report.createdAt).toLocaleString()}
        {report.updatedAt !== report.createdAt && ` · Last updated ${new Date(report.updatedAt).toLocaleString()}`}
      </div>
    </div>
  );
}

EodReportDetailPage.title = 'View EOD Report';

export default EodReportDetailPage;
