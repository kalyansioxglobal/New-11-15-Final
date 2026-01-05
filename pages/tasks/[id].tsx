import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { canEditTasks, type UserRole } from '@/lib/permissions';
import { Attachments } from '@/components/Attachments';
import { GetServerSideProps } from 'next';
import { Skeleton } from '@/components/ui/Skeleton';

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

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
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
          throw new Error(data.error || 'Task not found');
        }
        const json = await res.json();
        if (!cancelled) {
          setTask({
            ...json,
            files: json.files || [],
          });
          setStatus(json.status);
          setPriority(json.priority);
          setDescription(json.description || '');
          setDueDate(json.dueDate ? json.dueDate.slice(0, 10) : '');
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load task');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSave() {
    if (!canEdit || !id) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          priority,
          description,
          dueDate: dueDate || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Save failed');
      }

      setSaving(false);
      router.push('/tasks');
    } catch (e: any) {
      setError(e.message || 'Save failed');
      setSaving(false);
    }
  }

  if (loading) {
    return <Skeleton className="w-full h-[85vh]" />;
  }

  if (error && !task) {
    return <div className="p-6 text-sm text-red-500">{error}</div>;
  }

  if (!task) {
    return <div className="p-6 text-sm text-gray-400">Task not found.</div>;
  }

  return (
    <div className="p-6 max-w-2xl">
      <Link
        href="/tasks"
        className="text-xs text-gray-500 hover:text-gray-700 mb-3 inline-block"
      >
        Back to Tasks
      </Link>

      <h1 className="text-xl font-semibold mb-2">{task.title}</h1>
      <div className="text-xs text-gray-500 mb-4 flex gap-2 flex-wrap">
        {task.ventureName && <span>{task.ventureName}</span>}
        {task.officeName && <span>- {task.officeName}</span>}
        {task.createdByName && <span>- Created by {task.createdByName}</span>}
        {task.assignedToName && <span>- Assigned to {task.assignedToName}</span>}
      </div>

      <div className="space-y-4 text-sm bg-white p-4 rounded border">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs mb-1 text-gray-500">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 disabled:bg-gray-100 disabled:text-gray-500"
            >
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="BLOCKED">BLOCKED</option>
              <option value="DONE">DONE</option>
              <option value="OVERDUE">OVERDUE</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-xs mb-1 text-gray-500">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 disabled:bg-gray-100 disabled:text-gray-500"
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-xs mb-1 text-gray-500">Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs mb-1 text-gray-500">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!canEdit}
            className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 min-h-[100px] disabled:bg-gray-100 disabled:text-gray-500"
          />
        </div>

        {error && <div className="text-xs text-red-500">{error}</div>}

        {!canEdit && (
          <div className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded">
            You don&apos;t have permission to edit this task.
          </div>
        )}

        {canEdit && (
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white font-medium disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        )}
      </div>

      <Attachments
        taskId={task.id}
        ventureId={task.ventureId ?? undefined}
        files={task.files}
        currentUserId={Number(effectiveUser?.id) || 0}
      />
    </div>
  );
}

TaskDetailsPage.title = 'Task Details';

export default TaskDetailsPage;
