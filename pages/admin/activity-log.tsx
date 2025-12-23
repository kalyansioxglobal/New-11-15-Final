import { GetServerSideProps } from 'next';
import { useState, useEffect, useCallback } from 'react';
import { getEffectiveUser } from '@/lib/effectiveUser';
import type { PageWithLayout } from '@/types/page';

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
    CREATE: 'bg-green-100 text-green-800',
    UPDATE: 'bg-blue-100 text-blue-800',
    DELETE: 'bg-red-100 text-red-800',
    LOGIN: 'bg-purple-100 text-purple-800',
    LOGOUT: 'bg-gray-100 text-gray-800',
    VIEW: 'bg-cyan-100 text-cyan-800',
    IMPORT: 'bg-amber-100 text-amber-800',
    EXPORT: 'bg-amber-100 text-amber-800',
    APPROVE: 'bg-green-100 text-green-800',
    REJECT: 'bg-red-100 text-red-800',
  };

  const getActionColor = (action: string) => {
    for (const [key, color] of Object.entries(actionColors)) {
      if (action.toUpperCase().includes(key)) return color;
    }
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Activity Log</h1>
          <p className="text-sm text-gray-500">{totalCount.toLocaleString()} total activities</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Action</label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">All actions</option>
              {filters.actions.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Module</label>
            <select
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">All modules</option>
              {filters.modules.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
            <input
              type="text"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="Search..."
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleFilter}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            Apply Filters
          </button>
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
          >
            Clear
          </button>
        </div>
      </div>

      {loading && <div className="text-center py-12 text-gray-500">Loading activity log...</div>}

      {!loading && logs.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border">
          <div className="text-gray-500">No activities found</div>
        </div>
      )}

      {!loading && logs.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Time</th>
                <th className="px-4 py-3 text-left font-medium">User</th>
                <th className="px-4 py-3 text-left font-medium">Action</th>
                <th className="px-4 py-3 text-left font-medium">Module</th>
                <th className="px-4 py-3 text-left font-medium">Description</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">
                    <div>{new Date(log.createdAt).toLocaleDateString()}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{log.userName}</div>
                    <div className="text-xs text-gray-500">{log.userRole}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{log.module}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                    {log.description || `${log.entityType} ${log.entityId || ''}`}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="text-blue-600 hover:underline text-sm"
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Activity Details</h2>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-gray-500">User</div>
                  <div className="font-medium">{selectedLog.userName}</div>
                  <div className="text-xs text-gray-400">{selectedLog.userEmail}</div>
                </div>
                <div>
                  <div className="text-gray-500">Role</div>
                  <div className="font-medium">{selectedLog.userRole}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-gray-500">Action</div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(selectedLog.action)}`}>
                    {selectedLog.action}
                  </span>
                </div>
                <div>
                  <div className="text-gray-500">Module</div>
                  <div className="font-medium">{selectedLog.module}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-gray-500">Entity Type</div>
                  <div className="font-medium">{selectedLog.entityType}</div>
                </div>
                <div>
                  <div className="text-gray-500">Entity ID</div>
                  <div className="font-medium">{selectedLog.entityId || '-'}</div>
                </div>
              </div>
              {selectedLog.description && (
                <div>
                  <div className="text-gray-500">Description</div>
                  <div className="font-medium">{selectedLog.description}</div>
                </div>
              )}
              <div>
                <div className="text-gray-500">Timestamp</div>
                <div className="font-medium">{new Date(selectedLog.createdAt).toLocaleString()}</div>
              </div>
              {selectedLog.ipAddress && (
                <div>
                  <div className="text-gray-500">IP Address</div>
                  <div className="font-medium font-mono">{selectedLog.ipAddress}</div>
                </div>
              )}
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <div className="text-gray-500 mb-1">Metadata</div>
                  <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
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
