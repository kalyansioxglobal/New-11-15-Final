import React, { useState } from 'react';
import { z } from 'zod';
export { getServerSideProps } from './preferred-lanes.server';

type Lane = {
  id: number;
  origin: string;
  destination: string;
  bonus?: number;
  createdAt: string;
};

function Toast({ message, type }: { message: string; type?: 'success' | 'error' }) {
  if (!message) return null;
  return (
    <div className={`p-3 rounded text-sm ${type === 'error' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
      {message}
    </div>
  );
}

export default function ShipperPreferredLanesPage({ shipper, lanes: initialLanes }: { shipper: any; lanes: Lane[] }) {
  const [lanes, setLanes] = useState<Lane[]>(initialLanes || []);
  const [showModal, setShowModal] = useState(false);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [bonus, setBonus] = useState<number>(0);
  const [toast, setToast] = useState<{ msg: string; type?: 'success'|'error' } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const ShipperLaneSchema = z.object({ origin: z.string().min(1), destination: z.string().min(1), bonus: z.number().int().optional() });

  const refreshList = async () => {
    const res = await fetch(`/api/freight/shippers/${shipper.id}/preferred-lanes`);
    if (!res.ok) return;
    const json = await res.json();
    setLanes(json.lanes || []);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setToast(null);
    try {
      const parsed = ShipperLaneSchema.parse({ origin, destination, bonus });
      setSubmitting(true);
      const res = await fetch(`/api/freight/shippers/${shipper.id}/preferred-lanes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Create failed');
      setToast({ msg: 'Preferred lane created', type: 'success' });
      setShowModal(false);
      setOrigin(''); setDestination(''); setBonus(0);
      await refreshList();
    } catch (err: any) {
      setToast({ msg: err.message || 'Create failed', type: 'error' });
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (laneId: number) => {
    setToast(null);
    try {
      const res = await fetch(`/api/freight/shippers/${shipper.id}/preferred-lanes/${laneId}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Delete failed');
      setToast({ msg: 'Preferred lane deleted', type: 'success' });
      await refreshList();
    } catch (err: any) {
      setToast({ msg: err.message || 'Delete failed', type: 'error' });
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Preferred Lanes for {shipper.name}</h1>
        <div>
          <button onClick={() => setShowModal(true)} className="px-3 py-2 bg-blue-600 text-white rounded">Create Lane</button>
        </div>
      </div>

      {toast && <div className="mb-4"><Toast message={toast.msg} type={toast.type} /></div>}

      <div className="bg-white rounded border">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="p-3 border-b">Origin</th>
              <th className="p-3 border-b">Destination</th>
              <th className="p-3 border-b">Bonus</th>
              <th className="p-3 border-b">Created</th>
              <th className="p-3 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {lanes.map((l) => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="p-3 border-b">{l.origin}</td>
                <td className="p-3 border-b">{l.destination}</td>
                <td className="p-3 border-b">{l.bonus ?? 0}</td>
                <td className="p-3 border-b">{new Date(l.createdAt).toLocaleString()}</td>
                <td className="p-3 border-b">
                  <button onClick={() => handleDelete(l.id)} className="px-2 py-1 rounded bg-red-600 text-white text-sm">Delete</button>
                </td>
              </tr>
            ))}
            {lanes.length === 0 && (
              <tr><td colSpan={5} className="p-4 text-sm text-gray-500">No preferred lanes yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded w-full max-w-md">
            <h3 className="text-lg font-semibold mb-3">Create Preferred Lane</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Origin</label>
                <input value={origin} onChange={(e) => setOrigin(e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-sm" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Destination</label>
                <input value={destination} onChange={(e) => setDestination(e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-sm" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Bonus</label>
                <input type="number" value={bonus} onChange={(e) => setBonus(Number(e.target.value))} className="border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-2 pt-3">
                <button type="submit" disabled={submitting} className="px-3 py-2 bg-blue-600 text-white rounded">{submitting ? 'Saving...' : 'Save'}</button>
                <button type="button" onClick={() => setShowModal(false)} className="px-3 py-2 bg-gray-200 rounded">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
