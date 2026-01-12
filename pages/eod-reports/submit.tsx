import { useState, useEffect } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useTestMode } from '@/contexts/TestModeContext';
import MissedEodAlert from '@/components/MissedEodAlert';
import toast from 'react-hot-toast';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Venture = { id: number; name: string };
type Office = { id: number; name: string };

type MyStatus = {
  submittedToday: boolean;
  todayReportId: number | null;
  streak: number;
  recentDays: { date: string; submitted: boolean; status: string | null }[];
};

function EodReportSubmitPage() {
  const { testMode } = useTestMode();
  const [selectedVentureId, setSelectedVentureId] = useState<number | null>(null);
  const [selectedOfficeId, setSelectedOfficeId] = useState<number | null>(null);
  const [summary, setSummary] = useState('');
  const [accomplishments, setAccomplishments] = useState('');
  const [blockers, setBlockers] = useState('');
  const [tomorrowPlan, setTomorrowPlan] = useState('');
  const [hoursWorked, setHoursWorked] = useState('');
  const [tasksCompleted, setTasksCompleted] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [missedExplanationRequired, setMissedExplanationRequired] = useState(false);

  const { data: ventures } = useSWR<Venture[]>(
    `/api/ventures?includeTest=${testMode}`,
    fetcher
  );

  const { data: offices } = useSWR<Office[]>(
    selectedVentureId ? `/api/offices?ventureId=${selectedVentureId}` : null,
    fetcher
  );

  const { data: myStatus, mutate: mutateStatus } = useSWR<MyStatus>(
    `/api/eod-reports/my-status`,
    fetcher
  );

  // Fetch all reports for today (not just one)
  const today = new Date().toISOString().split('T')[0];
  const { data: todayReports, mutate: mutateTodayReports } = useSWR(
    `/api/eod-reports?date=${today}`,
    fetcher
  );

  const [editingReportId, setEditingReportId] = useState<number | null>(null);

  useEffect(() => {
    if (editingReportId && todayReports) {
      const reportToEdit = todayReports.find((r: any) => r.id === editingReportId);
      if (reportToEdit) {
        setSummary(reportToEdit.summary || '');
        setAccomplishments(reportToEdit.accomplishments || '');
        setBlockers(reportToEdit.blockers || '');
        setTomorrowPlan(reportToEdit.tomorrowPlan || '');
        setHoursWorked(reportToEdit.hoursWorked?.toString() || '');
        setTasksCompleted(reportToEdit.tasksCompleted?.toString() || '');
        setSelectedVentureId(reportToEdit.ventureId);
        setSelectedOfficeId(reportToEdit.officeId);
      }
    }
  }, [editingReportId, todayReports]);

  useEffect(() => {
    if (ventures && ventures.length > 0 && !selectedVentureId) {
      setSelectedVentureId(ventures[0].id);
    }
  }, [ventures, selectedVentureId]);

  // Reset missed explanation requirement when venture changes
  useEffect(() => {
    setMissedExplanationRequired(false);
  }, [selectedVentureId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVentureId || !summary.trim()) {
      toast.error('Please select a venture and provide a summary.');
      return;
    }

    if (missedExplanationRequired) {
      toast.error('Please provide an explanation for your missed EOD reports before submitting.');
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      // If editing, use PATCH to update the specific report
      if (editingReportId) {
        const res = await fetch(`/api/eod-reports/${editingReportId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            summary: summary.trim(),
            accomplishments: accomplishments.trim() || null,
            blockers: blockers.trim() || null,
            tomorrowPlan: tomorrowPlan.trim() || null,
            hoursWorked: hoursWorked ? parseFloat(hoursWorked) : null,
            tasksCompleted: tasksCompleted ? parseInt(tasksCompleted, 10) : null,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          toast.error(data.error || 'Failed to update report');
          throw new Error(data.error || 'Failed to update report');
        }

        toast.success('Report updated successfully!');
        setEditingReportId(null);
      } else {
        // Creating new report
        const res = await fetch('/api/eod-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ventureId: selectedVentureId,
            officeId: selectedOfficeId,
            summary: summary.trim(),
            accomplishments: accomplishments.trim() || null,
            blockers: blockers.trim() || null,
            tomorrowPlan: tomorrowPlan.trim() || null,
            hoursWorked: hoursWorked ? parseFloat(hoursWorked) : null,
            tasksCompleted: tasksCompleted ? parseInt(tasksCompleted, 10) : null,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          toast.error(data.error || 'Failed to submit report');
          throw new Error(data.error || 'Failed to submit report');
        }

        toast.success('Report submitted successfully!');
      }

      // Clear form if not editing
      if (!editingReportId) {
        setSummary('');
        setAccomplishments('');
        setBlockers('');
        setTomorrowPlan('');
        setHoursWorked('');
        setTasksCompleted('');
        setSelectedOfficeId(null);
      }

      // Clear missed explanation requirement after successful submission/update
      setMissedExplanationRequired(false);
      
      mutateStatus();
      mutateTodayReports();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (report: any) => {
    setEditingReportId(report.id);
    setSelectedVentureId(report.ventureId);
    setSelectedOfficeId(report.officeId);
    setSummary(report.summary || '');
    setAccomplishments(report.accomplishments || '');
    setBlockers(report.blockers || '');
    setTomorrowPlan(report.tomorrowPlan || '');
    setHoursWorked(report.hoursWorked?.toString() || '');
    setTasksCompleted(report.tasksCompleted?.toString() || '');
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingReportId(null);
    setSummary('');
    setAccomplishments('');
    setBlockers('');
    setTomorrowPlan('');
    setHoursWorked('');
    setTasksCompleted('');
    setSelectedOfficeId(null);
    // Reset missed explanation requirement when canceling edit
    setMissedExplanationRequired(false);
  };

  const todayFormatted = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold dark:text-white">End of Day Report</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{todayFormatted}</p>
          {editingReportId && (
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">Editing existing report</p>
          )}
        </div>
        <Link href="/eod-reports" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          View All Reports
        </Link>
      </div>

      {selectedVentureId && (
        <MissedEodAlert 
          ventureId={selectedVentureId}
          onExplanationRequired={() => setMissedExplanationRequired(true)}
          onExplanationProvided={() => setMissedExplanationRequired(false)}
        />
      )}

      {myStatus && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${myStatus.submittedToday ? 'bg-green-500 dark:bg-green-400' : 'bg-gray-300 dark:bg-gray-600'}`} />
              <span className="text-gray-900 dark:text-gray-100">{myStatus.submittedToday ? 'Submitted today' : 'Not submitted yet'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-orange-500 dark:text-orange-400 text-lg">🔥</span>
              <span className="text-gray-900 dark:text-gray-100">{myStatus.streak} day streak</span>
            </div>
            <div className="flex gap-1 ml-auto">
              {myStatus.recentDays.slice().reverse().map((day) => (
                <div
                  key={day.date}
                  className={`w-6 h-6 rounded ${day.submitted ? 'bg-green-500 dark:bg-green-400' : 'bg-gray-200 dark:bg-gray-700'}`}
                  title={`${day.date}: ${day.submitted ? 'Submitted' : 'Missing'}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
        {/* {message && (
          <div className={`p-3 rounded-lg text-sm ${
            message.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}>
            {message.text}
          </div>
        )} */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Venture *</label>
            <select
              value={selectedVentureId ?? ''}
              onChange={(e) => {
                setSelectedVentureId(Number(e.target.value));
                setSelectedOfficeId(null);
              }}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              required
              disabled={!!editingReportId}
            >
              <option value="">Select a venture</option>
              {ventures?.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
            {editingReportId && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Venture cannot be changed when editing. Cancel to create a new report for a different venture.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Office (optional)</label>
            <select
              value={selectedOfficeId ?? ''}
              onChange={(e) => setSelectedOfficeId(e.target.value ? Number(e.target.value) : null)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!offices?.length}
            >
              <option value="">All offices</option>
              {offices?.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Summary of Today *</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            placeholder="Brief summary of what you worked on today..."
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all resize-y"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Key Accomplishments</label>
          <textarea
            value={accomplishments}
            onChange={(e) => setAccomplishments(e.target.value)}
            rows={3}
            placeholder="What did you accomplish today? (one per line)"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all resize-y"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Blockers / Challenges</label>
          <textarea
            value={blockers}
            onChange={(e) => setBlockers(e.target.value)}
            rows={2}
            placeholder="Any blockers or challenges you faced today?"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all resize-y"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plan for Tomorrow</label>
          <textarea
            value={tomorrowPlan}
            onChange={(e) => setTomorrowPlan(e.target.value)}
            rows={2}
            placeholder="What do you plan to work on tomorrow?"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all resize-y"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hours Worked</label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="24"
              value={hoursWorked}
              onChange={(e) => setHoursWorked(e.target.value)}
              placeholder="e.g., 8"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tasks Completed</label>
            <input
              type="number"
              min="0"
              value={tasksCompleted}
              onChange={(e) => setTasksCompleted(e.target.value)}
              placeholder="e.g., 5"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          {editingReportId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-all"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={submitting || !summary.trim()}
            className='btn'
          >
            {submitting ? (editingReportId ? 'Updating...' : 'Submitting...') : (editingReportId ? 'Update Report' : 'Submit Report')}
          </button>
        </div>
      </form>

      {/* Today's Submitted Reports */}
      {todayReports && todayReports.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Today's Submitted Reports ({todayReports.length})
          </h2>
          <div className="space-y-3">
            {todayReports.map((report: any) => (
              <div
                key={report.id}
                className={`p-4 rounded-lg border ${
                  editingReportId === report.id
                    ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {report.ventureName}
                      </h3>
                      {report.officeName && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          - {report.officeName}
                        </span>
                      )}
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          report.status === 'REVIEWED'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : report.status === 'NEEDS_ATTENTION'
                            ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                        }`}
                      >
                        {report.status || 'SUBMITTED'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                      {report.summary}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                      {report.hoursWorked && (
                        <span>⏱️ {report.hoursWorked} hours</span>
                      )}
                      {report.tasksCompleted && (
                        <span>✓ {report.tasksCompleted} tasks</span>
                      )}
                      <span>
                        📅 {new Date(report.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Link
                      href={`/eod-reports/${report.id}`}
                      className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleEdit(report)}
                      className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-all"
                    >
                      {editingReportId === report.id ? 'Editing...' : 'Update'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

EodReportSubmitPage.title = 'Submit EOD Report';

export default EodReportSubmitPage;
