import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { canEditTasks, canAssignTasks, type UserRole } from '@/lib/permissions';
import { Attachments } from '@/components/Attachments';
import { GetServerSideProps } from 'next';
import { Skeleton } from '@/components/ui/Skeleton';
import toast from 'react-hot-toast';

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};

type FileRecord = {
  id: number;
  fileName: string;
  sizeBytes: number;
};

type TaskDetail = {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  ventureName: string | null;
  ventureId: number | null;
  officeName: string | null;
  createdByName: string | null;
  assignedToId: number | null;
  assignedToName: string | null;
  files: FileRecord[];
};

function TaskDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const { effectiveUser } = useEffectiveUser();
  const role = (effectiveUser?.role || 'EMPLOYEE') as UserRole;
  const canEdit = canEditTasks(role);
  const canAssign = canAssignTasks(role);
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignedToId, setAssignedToId] = useState<number | null>(null);
  const [users, setUsers] = useState<Array<{ id: number; fullName: string | null; email: string }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/tasks/${id}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          // throw new Error(data.error || 'Task not found');
          toast.error(data.error || 'Task not found');
          return;
        }
        const json = await res.json();
        if (!cancelled) {
          setTask({
            ...json,
            files: json.files || [],
          });
          setTitle(json.title || '');
          setStatus(json.status);
          setPriority(json.priority);
          setDescription(json.description || '');
          setDueDate(json.dueDate ? json.dueDate.slice(0, 10) : '');
          setAssignedToId(json.assignedToId || null);
        }
      } catch (e: any) {
        // if (!cancelled) setError(e.message || 'Failed to load task');
        toast.error(e.message || 'Failed to load task');
        return;
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Load users for assignment dropdown if user can assign tasks
  useEffect(() => {
    if (!canAssign) return;
    let cancelled = false;

    async function loadUsers() {
      try {
        setLoadingUsers(true);
        // Try to fetch users - if this endpoint requires leadership, it will fail gracefully
        const res = await fetch('/api/users/lookup');
        if (res.ok) {
          const userList = await res.json();
          if (!cancelled) {
            setUsers(userList || []);
          }
        }
      } catch (e) {
        // Silently fail - users list is optional
        console.log('Could not load users for assignment');
      } finally {
        if (!cancelled) setLoadingUsers(false);
      }
    }

    loadUsers();
    return () => {
      cancelled = true;
    };
  }, [canAssign]);

  async function handleSave() {
    if (!canEdit || !id) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          status,
          priority,
          dueDate: dueDate || null,
          assignedToId: canAssign && assignedToId !== undefined ? assignedToId : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Save failed');
        setSaving(false);
        return;
      }

      toast.success('Task updated successfully');
      setSaving(false);
      router.push('/tasks');
    } catch (e: any) {
      // setError(e.message || 'Save failed')
      toast.error(e.message || 'Failed to save task');
      setSaving(false);
    }
  }

  if (loading) {
    return <Skeleton className="w-full h-[85vh]" />;
  }

  // if (error && !task) {
  //   return <div className="p-6 text-sm text-red-500">{error}</div>;
  // }

  if (!task) {
    return (
      <div className="p-6">
        <div className="text-center py-12 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50">
          <p className="text-sm text-gray-600 dark:text-gray-400">Task not found.</p>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    OPEN: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
    IN_PROGRESS: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
    BLOCKED: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
    DONE: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
    OVERDUE: "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300",
  };

  const priorityColors: Record<string, string> = {
    LOW: "text-gray-500 dark:text-gray-400",
    MEDIUM: "text-yellow-600 dark:text-yellow-400",
    HIGH: "text-orange-600 dark:text-orange-400",
    CRITICAL: "text-red-600 dark:text-red-400 font-semibold",
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link
        href="/tasks"
        className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-4 inline-flex items-center gap-1 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Tasks
      </Link>

      <div className="mb-6">
        {!canEdit ? (
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{task.title}</h1>
        ) : null}
        <div className="text-sm text-gray-600 dark:text-gray-400 flex gap-3 flex-wrap items-center">
          {task.ventureName && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {task.ventureName}
            </span>
          )}
          {task.officeName && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {task.officeName}
            </span>
          )}
          {task.createdByName && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Created by {task.createdByName}
            </span>
          )}
          {task.assignedToName && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Assigned to {task.assignedToName}
            </span>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-400 text-red-700 dark:text-red-300 text-sm flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {!canEdit && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 dark:border-amber-400 text-amber-800 dark:text-amber-300 text-sm flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>You don&apos;t have permission to edit this task.</span>
            </div>
          )}

          <div className="space-y-6">
            {canEdit && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                  placeholder="Task title..."
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                {canEdit ? (
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="BLOCKED">BLOCKED</option>
                    <option value="DONE">DONE</option>
                    <option value="OVERDUE">OVERDUE</option>
                  </select>
                ) : (
                  <div className="px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600">
                    <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-medium ${statusColors[status] || "bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300"}`}>
                      {status ? status.replaceAll("_", " ") : "-"}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Priority
                </label>
                {canEdit ? (
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                ) : (
                  <div className="px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600">
                    <span className={`text-sm font-medium ${priorityColors[priority] || "text-gray-600 dark:text-gray-400"}`}>
                      {priority || "-"}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Due Date
                </label>
                {canEdit ? (
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                  />
                ) : (
                  <div className="px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                    {dueDate ? new Date(dueDate).toLocaleDateString() : <span className="text-gray-400 dark:text-gray-500">-</span>}
                  </div>
                )}
              </div>
            </div>

            {canAssign && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Assigned To
                </label>
                {loadingUsers ? (
                  <div className="px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400">
                    Loading users...
                  </div>
                ) : (
                  <select
                    value={assignedToId || ''}
                    onChange={(e) => setAssignedToId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName || u.email}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              {canEdit ? (
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 min-h-[100px] focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all resize-y"
                  placeholder="Task description..."
                />
              ) : (
                <div className="px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 min-h-[100px] whitespace-pre-wrap">
                  {description || <span className="text-gray-400 dark:text-gray-500">No description</span>}
                </div>
              )}
            </div>

            <div>
              <Attachments
                taskId={task.id}
                ventureId={task.ventureId ?? undefined}
                files={task.files}
                currentUserId={Number(effectiveUser?.id) || 0}
              />
            </div>

            {canEdit && (
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => router.push('/tasks')}
                  className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

TaskDetailsPage.title = 'Task Details';

export default TaskDetailsPage;
