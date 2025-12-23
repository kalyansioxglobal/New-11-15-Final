import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useTestMode } from '@/contexts/TestModeContext';

type Venture = { id: number; name: string; type: string };

const HOTEL_STATUS = ['ACTIVE', 'CLOSED', 'RENOVATION', 'SOLD'];

export default function NewHotelPage() {
  const router = useRouter();
  const { testMode } = useTestMode();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ventures, setVentures] = useState<Venture[]>([]);

  const [form, setForm] = useState({
    name: '',
    brand: '',
    code: '',
    city: '',
    state: '',
    country: '',
    rooms: '',
    status: 'ACTIVE',
    ventureId: '',
  });

  useEffect(() => {
    fetch(`/api/ventures?types=HOSPITALITY&includeTest=${testMode}`)
      .then((r) => r.json())
      .then((d) => {
        setVentures(d as Venture[]);
      })
      .catch(() => {});
  }, [testMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.ventureId) {
      setError('Name and Venture are required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/hospitality/hotels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          brand: form.brand || null,
          code: form.code || null,
          city: form.city || null,
          state: form.state || null,
          country: form.country || null,
          rooms: form.rooms ? Number(form.rooms) : null,
          status: form.status,
          ventureId: Number(form.ventureId),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create hotel');
      }

      router.push('/hospitality/hotels');
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">New Hotel</h1>
        <p className="text-sm text-gray-500 mt-1">
          Add a new hotel property to your portfolio
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hotel Name *
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            placeholder="e.g., Grand Hotel Downtown"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Brand
            </label>
            <input
              type="text"
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g., Hilton, Marriott"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hotel Code
            </label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g., GHD001"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g., New York"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <input
              type="text"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g., NY"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <input
              type="text"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g., USA"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rooms
            </label>
            <input
              type="number"
              value={form.rooms}
              onChange={(e) => setForm({ ...form, rooms: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g., 150"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {HOTEL_STATUS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Venture *
            </label>
            <select
              value={form.ventureId}
              onChange={(e) => setForm({ ...form, ventureId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select venture...</option>
              {ventures.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Link
            href="/hospitality/hotels"
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Hotel'}
          </button>
        </div>
      </form>
    </div>
  );
}

NewHotelPage.title = 'New Hotel';
