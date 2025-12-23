import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { canCreateTasks } from '@/lib/permissions';
import type { UserRole } from '@prisma/client';

type TaskRow = {
  id: number;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  ventureName: string | null;
  officeName: string | null;
  assignedToName: string | null;
};

function TasksPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const { effectiveUser } = useEffectiveUser();
  const role = (effectiveUser?.role || 'EMPLOYEE') as UserRole;
  const allowCreate = canCreateTasks(role);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch('/api/tasks');
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to load tasks');
        }
        const json = await res.json();
        if (!cancelled) setTasks(json);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load tasks');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredTasks = filter === 'all'
    ? tasks
    : tasks.filter((t) => t.status === filter);

  const statusColors: Record<string, string> = {
    OPEN: 'bg-blue-100 text-blue-800',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
    BLOCKED: 'bg-red-100 text-red-800',
    DONE: 'bg-green-100 text-green-800',
    OVERDUE: 'bg-orange-100 text-orange-800',
  };

  const priorityColors: Record<string, string> = {
    LOW: 'text-gray-500',
    MEDIUM: 'text-yellow-600',
    HIGH: 'text-orange-600',
    URGENT: 'text-red-600 font-semibold',
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Tasks</h1>
        {allowCreate && (
          <Link
            href="/tasks/new"
            className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            + New Task
          </Link>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        {['all', 'OPEN', 'IN_PROGRESS', 'BLOCKED', 'DONE'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 text-sm rounded ${
              filter === s
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {s === 'all' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading && <div className="text-sm text-gray-400">Loading tasks...</div>}
      {error && <div className="text-sm text-red-500 mb-2">{error}</div>}

      {!loading && filteredTasks.length === 0 && (
        <div className="text-center py-12 border rounded-xl bg-gray-50">
          <div className="text-gray-400 text-3xl mb-3">✅</div>
          <h3 className="text-gray-700 font-medium mb-1">No tasks found</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            {filter === 'all' 
              ? "No tasks have been created yet for your assigned ventures."
              : `No tasks with status "${filter.replace('_', ' ')}" found.`}
          </p>
          {allowCreate && filter === 'all' && (
            <Link
              href="/tasks/new"
              className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              + New Task
            </Link>
          )}
        </div>
      )}

      {!loading && filteredTasks.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 bg-white rounded">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Title</th>
                <th className="px-3 py-2 text-left font-medium">Venture</th>
                <th className="px-3 py-2 text-left font-medium">Office</th>
                <th className="px-3 py-2 text-center font-medium">Status</th>
                <th className="px-3 py-2 text-center font-medium">Priority</th>
                <th className="px-3 py-2 text-center font-medium">Due</th>
                <th className="px-3 py-2 text-center font-medium">Assigned</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((t) => (
                <tr
                  key={t.id}
                  className="border-t border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-3 py-2 font-medium">{t.title}</td>
                  <td className="px-3 py-2 text-gray-600">
                    {t.ventureName ?? '-'}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {t.officeName ?? '-'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        statusColors[t.status] || 'bg-gray-100'
                      }`}
                    >
                      {t.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td
                    className={`px-3 py-2 text-center text-xs ${
                      priorityColors[t.priority] || ''
                    }`}
                  >
                    {t.priority}
                  </td>
                  <td className="px-3 py-2 text-center text-gray-600 text-xs">
                    {t.dueDate
                      ? new Date(t.dueDate).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="px-3 py-2 text-center text-gray-600 text-xs">
                    {t.assignedToName || '-'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/tasks/${t.id}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

TasksPage.title = 'Tasks';

export default TasksPage;
