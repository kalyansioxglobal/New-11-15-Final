import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useTestMode } from '@/contexts/TestModeContext';

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
  status: string;
  hoursWorked: number | null;
  tasksCompleted: number | null;
  createdAt: string;
};

function EodReportsIndexPage() {
  const { testMode } = useTestMode();
  const [dateFilter, setDateFilter] = useState('');

  const { data: reports, isLoading } = useSWR<EodReport[]>(
    `/api/eod-reports?includeTest=${testMode}${dateFilter ? `&date=${dateFilter}` : ''}`,
    fetcher
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">EOD Reports</h1>
          <p className="text-sm text-gray-500">All end-of-day reports</p>
        </div>
        <div className="flex gap-3">
          <Link href="/eod-reports/team" className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">
            Team Dashboard
          </Link>
          <Link href="/eod-reports/submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            Submit Report
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Filter by Date</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="text-sm text-blue-600 hover:underline mt-5"
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Employee</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Venture</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Summary</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Hours</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Tasks</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Loading reports...
                </td>
              </tr>
            ) : !reports?.length ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No reports found.
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr key={report.id}>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(report.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{report.userName}</div>
                    <div className="text-xs text-gray-500">{report.userEmail}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
                      {report.ventureName}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                    {report.summary}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {report.hoursWorked ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {report.tasksCompleted ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      report.status === 'REVIEWED' ? 'bg-green-100 text-green-700' :
                      report.status === 'NEEDS_ATTENTION' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {report.status === 'REVIEWED' ? 'Reviewed' :
                       report.status === 'NEEDS_ATTENTION' ? 'Attention' :
                       'Submitted'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/eod-reports/${report.id}`}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

EodReportsIndexPage.title = 'EOD Reports';

export default EodReportsIndexPage;
