import { GetServerSideProps } from 'next';
import { useState, useEffect, useCallback } from 'react';
import { getEffectiveUser } from '@/lib/effectiveUser';
import type { PageWithLayout } from '@/types/page';
import { Skeleton } from '@/components/ui/Skeleton';

type LogEntry = {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  userRole: string;
  action: string;
  module: string;
  entityType: string;
  entityId: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

type Filters = {
  actions: string[];
  modules: string[];
  entityTypes: string[];
};

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const user = await getEffectiveUser(ctx.req, ctx.res);
  if (!user) {
    return { redirect: { destination: '/login', permanent: false } };
  }
  const allowedRoles = ['CEO', 'ADMIN', 'COO', 'AUDITOR'];
  if (!allowedRoles.includes(user.role)) {
    return { redirect: { destination: '/overview', permanent: false } };
  }
  return { props: {} };
};

function ActivityLogPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filters, setFilters] = useState<Filters>({ actions: [], modules: [], entityTypes: [] });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [filterAction, setFilterAction] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '50');
    if (filterAction) params.set('action', filterAction);
    if (filterModule) params.set('module', filterModule);
    if (filterSearch) params.set('search', filterSearch);
    if (filterStartDate) params.set('startDate', filterStartDate);
    if (filterEndDate) params.set('endDate', filterEndDate);

    try {
      const res = await fetch(`/api/admin/activity-log?${params}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.totalCount || 0);
      if (data.filters) setFilters(data.filters);
    } finally {
      setLoading(false);
    }
  }, [page, filterAction, filterModule, filterSearch, filterStartDate, filterEndDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilter = () => {
    setPage(1);
    fetchLogs();
  };

  const clearFilters = () => {
    setFilterAction('');
    setFilterModule('');
    setFilterSearch('');
    setFilterStartDate('');
    setFilterEndDate('');
    setPage(1);
    setTimeout(fetchLogs, 0);
  };

  const actionColors: Record<string, string> = {
    CREATE: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800',
    UPDATE: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
    DELETE: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800',
    LOGIN: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
    LOGOUT: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-600',
    VIEW: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800',
    IMPORT: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
    EXPORT: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
    APPROVE: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800',
    REJECT: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800',
  };

  const getActionColor = (action: string) => {
    for (const [key, color] of Object.entries(actionColors)) {
      if (action.toUpperCase().includes(key)) return color;
    }
    return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-600';
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Activity Log</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{totalCount.toLocaleString()} total activities</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Action</label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
            >
              <option value="" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">All actions</option>
              {filters.actions.map((a) => (
                <option key={a} value={a} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Module</label>
            <select
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
            >
              <option value="" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">All modules</option>
              {filters.modules.map((m) => (
                <option key={m} value={m} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
            <input
              type="text"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="Search..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleFilter}
            className="btn"
          >
            Apply Filters
          </button>
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {loading && <Skeleton className="w-full h-[85vh]" />}

      {!loading && logs.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="text-gray-500 dark:text-gray-400">No activities found</div>
        </div>
      )}

      {!loading && logs.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-white">Time</th>
                <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-white">User</th>
                <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-white">Action</th>
                <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-white">Module</th>
                <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-white">Description</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    <div>{new Date(log.createdAt).toLocaleDateString()}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-white">{log.userName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{log.userRole}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{log.module}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-xs truncate">
                    {log.description || `${log.entityType} ${log.entityId || ''}`}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="text-blue-600 dark:text-blue-400 hover:underline text-sm transition-colors"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && logs.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing <span className="font-medium text-gray-900 dark:text-white">{(page - 1) * 50 + 1}</span> to{' '}
            <span className="font-medium text-gray-900 dark:text-white">{Math.min(page * 50, totalCount)}</span> of{' '}
            <span className="font-medium text-gray-900 dark:text-white">{totalCount}</span> activities
          </div>
          {totalPages > 1 ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition ${
                  page === 1
                    ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Previous
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page <span className="font-medium text-gray-900 dark:text-white">{page}</span> of{' '}
                <span className="font-medium text-gray-900 dark:text-white">{totalPages}</span>
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition ${
                  page === totalPages
                    ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Next
              </button>
            </div>
          ) : (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Page <span className="font-medium text-gray-900 dark:text-white">1</span> of <span className="font-medium text-gray-900 dark:text-white">1</span>
            </div>
          )}
        </div>
      )}

      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[80vh] overflow-y-auto border border-gray-200 dark:border-gray-700 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Activity Details</h2>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-gray-500 dark:text-gray-400 mb-1">User</div>
                  <div className="font-medium text-gray-900 dark:text-white">{selectedLog.userName}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">{selectedLog.userEmail}</div>
                </div>
                <div>
                  <div className="text-gray-500 dark:text-gray-400 mb-1">Role</div>
                  <div className="font-medium text-gray-900 dark:text-white">{selectedLog.userRole}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-gray-500 dark:text-gray-400 mb-1">Action</div>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getActionColor(selectedLog.action)}`}>
                    {selectedLog.action}
                  </span>
                </div>
                <div>
                  <div className="text-gray-500 dark:text-gray-400 mb-1">Module</div>
                  <div className="font-medium text-gray-900 dark:text-white">{selectedLog.module}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-gray-500 dark:text-gray-400 mb-1">Entity Type</div>
                  <div className="font-medium text-gray-900 dark:text-white">{selectedLog.entityType}</div>
                </div>
                <div>
                  <div className="text-gray-500 dark:text-gray-400 mb-1">Entity ID</div>
                  <div className="font-medium text-gray-900 dark:text-white font-mono">{selectedLog.entityId || '-'}</div>
                </div>
              </div>
              {selectedLog.description && (
                <div>
                  <div className="text-gray-500 dark:text-gray-400 mb-1">Description</div>
                  <div className="font-medium text-gray-900 dark:text-white">{selectedLog.description}</div>
                </div>
              )}
              <div>
                <div className="text-gray-500 dark:text-gray-400 mb-1">Timestamp</div>
                <div className="font-medium text-gray-900 dark:text-white">{new Date(selectedLog.createdAt).toLocaleString()}</div>
              </div>
              {selectedLog.ipAddress && (
                <div>
                  <div className="text-gray-500 dark:text-gray-400 mb-1">IP Address</div>
                  <div className="font-medium text-gray-900 dark:text-white font-mono">{selectedLog.ipAddress}</div>
                </div>
              )}
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <div className="text-gray-500 dark:text-gray-400 mb-1">Metadata</div>
                  <pre className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded text-xs overflow-x-auto border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

(ActivityLogPage as PageWithLayout).title = 'Activity Log';
export default ActivityLogPage;
