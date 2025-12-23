import { useState, useEffect } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useTestMode } from '@/contexts/TestModeContext';
import MissedEodAlert from '@/components/MissedEodAlert';

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

  const { data: existingReport } = useSWR(
    myStatus?.todayReportId ? `/api/eod-reports/${myStatus.todayReportId}` : null,
    fetcher
  );

  useEffect(() => {
    if (existingReport && !summary) {
      setSummary(existingReport.summary || '');
      setAccomplishments(existingReport.accomplishments || '');
      setBlockers(existingReport.blockers || '');
      setTomorrowPlan(existingReport.tomorrowPlan || '');
      setHoursWorked(existingReport.hoursWorked?.toString() || '');
      setTasksCompleted(existingReport.tasksCompleted?.toString() || '');
      setSelectedVentureId(existingReport.ventureId);
      setSelectedOfficeId(existingReport.officeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingReport]);

  useEffect(() => {
    if (ventures && ventures.length > 0 && !selectedVentureId) {
      setSelectedVentureId(ventures[0].id);
    }
  }, [ventures, selectedVentureId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVentureId || !summary.trim()) {
      setMessage({ type: 'error', text: 'Please select a venture and provide a summary.' });
      return;
    }

    if (missedExplanationRequired) {
      setMessage({ type: 'error', text: 'Please provide an explanation for your missed EOD reports before submitting.' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
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
        throw new Error(data.error || 'Failed to submit report');
      }

      setMessage({ 
        type: 'success', 
        text: data.updated ? 'Report updated successfully!' : 'Report submitted successfully!' 
      });
      mutateStatus();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to submit report' });
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">End of Day Report</h1>
          <p className="text-sm text-gray-500">{today}</p>
        </div>
        <Link href="/eod-reports" className="text-sm text-blue-600 hover:underline">
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
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${myStatus.submittedToday ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span>{myStatus.submittedToday ? 'Submitted today' : 'Not submitted yet'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-orange-500 text-lg">🔥</span>
              <span>{myStatus.streak} day streak</span>
            </div>
            <div className="flex gap-1 ml-auto">
              {myStatus.recentDays.slice().reverse().map((day) => (
                <div
                  key={day.date}
                  className={`w-6 h-6 rounded ${day.submitted ? 'bg-green-500' : 'bg-gray-200'}`}
                  title={`${day.date}: ${day.submitted ? 'Submitted' : 'Missing'}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        {message && (
          <div className={`p-3 rounded-lg text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Venture *</label>
            <select
              value={selectedVentureId ?? ''}
              onChange={(e) => {
                setSelectedVentureId(Number(e.target.value));
                setSelectedOfficeId(null);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select a venture</option>
              {ventures?.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Office (optional)</label>
            <select
              value={selectedOfficeId ?? ''}
              onChange={(e) => setSelectedOfficeId(e.target.value ? Number(e.target.value) : null)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Summary of Today *</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            placeholder="Brief summary of what you worked on today..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Key Accomplishments</label>
          <textarea
            value={accomplishments}
            onChange={(e) => setAccomplishments(e.target.value)}
            rows={3}
            placeholder="What did you accomplish today? (one per line)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Blockers / Challenges</label>
          <textarea
            value={blockers}
            onChange={(e) => setBlockers(e.target.value)}
            rows={2}
            placeholder="Any blockers or challenges you faced today?"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Plan for Tomorrow</label>
          <textarea
            value={tomorrowPlan}
            onChange={(e) => setTomorrowPlan(e.target.value)}
            rows={2}
            placeholder="What do you plan to work on tomorrow?"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hours Worked</label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="24"
              value={hoursWorked}
              onChange={(e) => setHoursWorked(e.target.value)}
              placeholder="e.g., 8"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tasks Completed</label>
            <input
              type="number"
              min="0"
              value={tasksCompleted}
              onChange={(e) => setTasksCompleted(e.target.value)}
              placeholder="e.g., 5"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting || !summary.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {submitting ? 'Submitting...' : (myStatus?.submittedToday ? 'Update Report' : 'Submit Report')}
          </button>
        </div>
      </form>
    </div>
  );
}

EodReportSubmitPage.title = 'Submit EOD Report';

export default EodReportSubmitPage;
