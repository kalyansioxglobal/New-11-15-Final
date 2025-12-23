import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { canEditPolicies } from '@/lib/permissions';
import type { UserRole } from '@prisma/client';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};

type PolicyDetail = {
  id: number;
  name: string;
  type: string;
  provider: string | null;
  policyNo: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  fileUrl: string | null;
  notes: string | null;
  ventureName: string | null;
  officeName: string | null;
  createdByName: string | null;
};

const POLICY_TYPES = ['INSURANCE', 'LEASE', 'CONTRACT', 'LICENSE', 'PERMIT', 'OTHER'];
const POLICY_STATUSES = ['ACTIVE', 'PENDING', 'EXPIRED', 'CANCELLED'];

function PolicyDetailsPage() {
  const router = useRouter();
  const { id } = router.query;

  const { effectiveUser } = useEffectiveUser();
  const role = (effectiveUser?.role || 'EMPLOYEE') as UserRole;
  const canEdit = canEditPolicies(role);

  const [policy, setPolicy] = useState<PolicyDetail | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('INSURANCE');
  const [provider, setProvider] = useState('');
  const [policyNo, setPolicyNo] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/policies/${id}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Policy not found');
        }
        const json = await res.json();
        if (!cancelled) {
          setPolicy(json);
          setName(json.name);
          setType(json.type || 'INSURANCE');
          setProvider(json.provider || '');
          setPolicyNo(json.policyNo || '');
          setStatus(json.status || 'ACTIVE');
          setStartDate(json.startDate ? json.startDate.slice(0, 10) : '');
          setEndDate(json.endDate ? json.endDate.slice(0, 10) : '');
          setNotes(json.notes || '');
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load policy');
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
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/policies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          type,
          provider: provider || null,
          policyNo: policyNo || null,
          status,
          startDate: startDate || null,
          endDate: endDate || null,
          notes: notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Save failed');
      }

      setSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (e: any) {
      setError(e.message || 'Save failed');
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-gray-400">Loading policy...</div>;
  }

  if (error && !policy) {
    return <div className="p-6 text-sm text-red-500">{error}</div>;
  }

  if (!policy) {
    return <div className="p-6 text-sm text-gray-400">Policy not found.</div>;
  }

  return (
    <div className="p-6 max-w-2xl">
      <Link
        href="/policies"
        className="text-xs text-gray-500 hover:text-gray-700 mb-3 inline-block"
      >
        Back to Policies
      </Link>

      <h1 className="text-xl font-semibold mb-2">{policy.name}</h1>
      <div className="text-xs text-gray-500 mb-4 flex gap-2 flex-wrap">
        {policy.ventureName && <span>{policy.ventureName}</span>}
        {policy.officeName && <span>- {policy.officeName}</span>}
        {policy.createdByName && <span>- Created by {policy.createdByName}</span>}
      </div>

      <div className="space-y-4 text-sm bg-white p-4 rounded border">
        <div>
          <label className="block text-xs mb-1 text-gray-500">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEdit}
            className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 disabled:bg-gray-100 disabled:text-gray-500"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs mb-1 text-gray-500">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 disabled:bg-gray-100 disabled:text-gray-500"
            >
              {POLICY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs mb-1 text-gray-500">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 disabled:bg-gray-100 disabled:text-gray-500"
            >
              {POLICY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs mb-1 text-gray-500">Provider</label>
            <input
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs mb-1 text-gray-500">Policy No.</label>
            <input
              value={policyNo}
              onChange={(e) => setPolicyNo(e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs mb-1 text-gray-500">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs mb-1 text-gray-500">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs mb-1 text-gray-500">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!canEdit}
            className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 min-h-[80px] disabled:bg-gray-100 disabled:text-gray-500"
          />
        </div>

        {error && <div className="text-xs text-red-500">{error}</div>}
        {saveSuccess && (
          <div className="text-xs text-green-600">Changes saved!</div>
        )}

        {!canEdit && (
          <div className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded">
            You don&apos;t have permission to edit this policy.
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
    </div>
  );
}

PolicyDetailsPage.title = 'Policy Details';

export default PolicyDetailsPage;
