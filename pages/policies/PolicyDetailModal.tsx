import { useEffect, useState } from 'react';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { canEditPolicies } from '@/lib/permissions';
import type { UserRole } from '@prisma/client';

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
  isDeleted?: boolean;
};

const POLICY_TYPES = ['INSURANCE', 'LEASE', 'CONTRACT', 'LICENSE', 'PERMIT', 'OTHER'];
const POLICY_STATUSES = ['ACTIVE', 'PENDING', 'EXPIRED', 'CANCELLED'];

type PolicyDetailModalProps = {
  policyId: number | null;
  onClose: () => void;
  onSave?: () => void;
};

export default function PolicyDetailModal({ policyId, onClose, onSave }: PolicyDetailModalProps) {
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

  useEffect(() => {
    if (!policyId) return;
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/policies/${policyId}`);
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
  }, [policyId]);

  async function handleSave() {
    if (!canEdit || !policyId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/policies/${policyId}`, {
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
      
      // Call onSave callback if provided (to refresh the list)
      if (onSave) {
        onSave();
      }
      
      // Close modal immediately after successful save
      onClose();
    } catch (e: any) {
      setError(e.message || 'Save failed');
      setSaving(false);
    }
  }

  // Calculate expiry status
  const calculateExpiryStatus = () => {
    if (!policy?.endDate) return null;
    
    const now = new Date();
    const endDate = new Date(policy.endDate);
    const in30Days = new Date();
    in30Days.setDate(now.getDate() + 30);
    
    const daysToExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isExpired = endDate < now;
    const isExpiringSoon = !isExpired && endDate > now && endDate <= in30Days;
    
    return { isExpired, isExpiringSoon, daysToExpiry };
  };

  const expiryStatus = policy ? calculateExpiryStatus() : null;

  if (!policyId) return null;

  return (
    <>
      <style jsx>{`
        .modal-scroll::-webkit-scrollbar {
          display: none;
        }
        .modal-scroll {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/20"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto m-4 modal-scroll"
          onClick={(e) => e.stopPropagation()}
        >
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              {loading ? (
                <h2 className="text-xl font-semibold">Loading policy...</h2>
              ) : policy ? (
                <>
                  <h2 className="text-xl font-semibold mb-2">{policy.name}</h2>
                  <div className="text-xs text-gray-500 flex gap-2 flex-wrap">
                    {policy.ventureName && <span>{policy.ventureName}</span>}
                    {policy.officeName && <span>- {policy.officeName}</span>}
                    {policy.createdByName && <span>- Created by {policy.createdByName}</span>}
                  </div>
                </>
              ) : (
                <h2 className="text-xl font-semibold">Policy Details</h2>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition ml-4"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {loading && (
            <div className="text-sm text-gray-400 py-8 text-center">Loading policy details...</div>
          )}

          {error && !policy && (
            <div className="text-sm text-red-500 py-4">{error}</div>
          )}

          {!loading && policy && (
            <div className="space-y-4 text-sm bg-white p-4 rounded ">
              {/* Expiry Warning Banner */}
              {expiryStatus && (expiryStatus.isExpired || expiryStatus.isExpiringSoon) && (
                <div
                  className={`px-4 py-3 rounded-lg border-l-4 ${
                    expiryStatus.isExpired
                      ? 'bg-red-50 border-red-500 text-red-800'
                      : 'bg-amber-50 border-amber-500 text-amber-800'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <svg
                      className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        expiryStatus.isExpired ? 'text-red-600' : 'text-amber-600'
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="flex-1">
                      <p className="font-semibold text-sm mb-1">
                        {expiryStatus.isExpired
                          ? '⚠️ Policy Expired'
                          : '⚠️ Policy Expiring Soon'}
                      </p>
                      <p className="text-xs">
                        {expiryStatus.isExpired
                          ? `This policy expired on ${new Date(policy.endDate).toLocaleDateString()}. Please renew or update the policy status.`
                          : `This policy will expire in ${expiryStatus.daysToExpiry} day${expiryStatus.daysToExpiry !== 1 ? 's' : ''} on ${new Date(policy.endDate).toLocaleDateString()}. Please take action to renew.`}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs mb-1 text-gray-500">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!canEdit || policy.isDeleted}
                  readOnly={policy.isDeleted}
                  className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs mb-1 text-gray-500">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    disabled={!canEdit || policy.isDeleted}
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
                    disabled={!canEdit || policy.isDeleted}
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
                    disabled={!canEdit || policy.isDeleted}
                    readOnly={policy.isDeleted}
                    className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs mb-1 text-gray-500">Policy No.</label>
                  <input
                    value={policyNo}
                    onChange={(e) => setPolicyNo(e.target.value)}
                    disabled={!canEdit || policy.isDeleted}
                    readOnly={policy.isDeleted}
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
                    disabled={!canEdit || policy.isDeleted}
                    readOnly={policy.isDeleted}
                    className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs mb-1 text-gray-500">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={!canEdit || policy.isDeleted}
                    readOnly={policy.isDeleted}
                    className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs mb-1 text-gray-500">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={!canEdit || policy.isDeleted}
                  readOnly={policy.isDeleted}
                  className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 min-h-[80px] disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>

              {policy.fileUrl && (
                <div>
                  <label className="block text-xs mb-1 text-gray-500">File</label>
                  <div className="px-3 py-2">
                    <a
                      href={policy.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-xs"
                    >
                      View File →
                    </a>
                  </div>
                </div>
              )}

              {error && <div className="text-xs text-red-500">{error}</div>}

              {policy.isDeleted && (
                <div className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded border-l-4 border-amber-500">
                  This policy has been deleted.
                </div>
              )}

              {!canEdit && (
                <div className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded">
                  You don&apos;t have permission to edit this policy.
                </div>
              )}

              {canEdit && !policy.isDeleted && (
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
          )}
        </div>
      </div>
    </div>
    </>
  );
}

