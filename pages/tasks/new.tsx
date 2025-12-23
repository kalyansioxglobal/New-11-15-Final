import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { canCreateTasks } from '@/lib/permissions';
import type { UserRole } from '@prisma/client';

type Venture = { id: number; name: string; type: string };
type Office = { id: number; name: string; ventureId: number };

function NewTaskPage() {
  const router = useRouter();
  const { effectiveUser, loading: userLoading } = useEffectiveUser();
  const role = (effectiveUser?.role || 'EMPLOYEE') as UserRole;
  const allowCreate = canCreateTasks(role);

  const [ventures, setVentures] = useState<Venture[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ventureId, setVentureId] = useState<number | ''>('');
  const [officeId, setOfficeId] = useState<number | ''>('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [vRes, oRes] = await Promise.all([
          fetch('/api/ventures'),
          fetch('/api/offices'),
        ]);
        if (!vRes.ok || !oRes.ok) return;
        const [vJson, oJson] = await Promise.all([vRes.json(), oRes.json()]);
        if (!cancelled) {
          setVentures(vJson);
          setOffices(oJson);
        }
      } catch (e) {
        // ignore
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!userLoading && !allowCreate) {
      router.replace('/tasks');
    }
  }, [userLoading, allowCreate, router]);

  const filteredOffices = offices.filter(
    (o) => !ventureId || o.ventureId === ventureId
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allowCreate) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          ventureId,
          officeId: officeId || null,
          dueDate: dueDate || null,
          priority,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create task');
      }

      const json = await res.json();
      router.push(`/tasks/${json.id}`);
    } catch (e: any) {
      setError(e.message || 'Failed to create task');
      setSaving(false);
    }
  }

  if (!allowCreate) {
    return null;
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-semibold mb-4">New Task</h1>

      <form onSubmit={handleSubmit} className="space-y-4 text-sm bg-white p-4 rounded border">
        <div>
          <label className="block text-xs mb-1 text-gray-500">Title *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300"
            required
          />
        </div>

        <div>
          <label className="block text-xs mb-1 text-gray-500">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 min-h-[80px]"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs mb-1 text-gray-500">Venture *</label>
            <select
              value={ventureId}
              onChange={(e) => {
                setVentureId(e.target.value ? Number(e.target.value) : '');
                setOfficeId('');
              }}
              className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300"
              required
            >
              <option value="">Select venture...</option>
              {ventures.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-xs mb-1 text-gray-500">Office</label>
            <select
              value={officeId}
              onChange={(e) =>
                setOfficeId(e.target.value ? Number(e.target.value) : '')
              }
              className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300"
            >
              <option value="">All offices</option>
              {filteredOffices.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs mb-1 text-gray-500">Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs mb-1 text-gray-500">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300"
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
            </select>
          </div>
        </div>

        {error && <div className="text-xs text-red-500">{error}</div>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => router.push('/tasks')}
            className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-100"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white font-medium disabled:opacity-60"
            disabled={saving}
          >
            {saving ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  );
}

NewTaskPage.title = 'New Task';

export default NewTaskPage;
