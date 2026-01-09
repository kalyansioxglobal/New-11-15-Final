import { useEffect, useState } from 'react';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { canEditPolicies } from '@/lib/permissions';
import type { UserRole } from '@prisma/client';
import { Skeleton } from '@/components/ui/Skeleton';
import toast from 'react-hot-toast';

type PolicyFile = {
  id: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url: string | null;
  error?: string;
  createdAt: string;
  uploadedBy: {
    id: number;
    fullName: string | null;
    email: string | null;
  } | null;
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
  files: PolicyFile[];
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
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!policyId) return;
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setLoadError(null);
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
        if (!cancelled) {
          const errorMsg = e.message || 'Failed to load policy';
          setLoadError(errorMsg);
          toast.error(errorMsg);
        }
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

      toast.success('Policy updated successfully');

      if (onSave) {
        onSave();
      }

      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update policy');
    } finally {
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
        className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/20 dark:bg-black/40"
        onClick={onClose}
      >
        <div
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4 modal-scroll border border-gray-200 dark:border-slate-700"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="text-white p-6 rounded-t-2xl">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                {loading ? (
                  <h2 className="text-2xl font-bold">Loading policy...</h2>
                ) : policy ? (
                  <>
                    <h2 className="text-2xl font-bold mb-2">{policy.name}</h2>
                    <div className="text-sm text-blue-100 flex gap-3 flex-wrap">
                      {policy.ventureName && (
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          {policy.ventureName}
                        </span>
                      )}
                      {policy.officeName && (
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {policy.officeName}
                        </span>
                      )}
                      {policy.createdByName && (
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {policy.createdByName}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <h2 className="text-2xl font-bold">Policy Details</h2>
                )}
              </div>
              <button
                onClick={onClose}
                className="ml-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6">

            {loading && (
              <Skeleton className="w-full h-[85vh]" />
            )}

            {loadError && !policy && (
              <div className="text-sm text-red-600 dark:text-red-400 py-4">{loadError}</div>
            )}

            {!loading && policy && (
              <div className="space-y-6">
                {/* Expiry Warning Banner */}
                {expiryStatus && (expiryStatus.isExpired || expiryStatus.isExpiringSoon) && (
                  <div
                    className={`px-5 py-4 rounded-xl border-l-4 shadow-sm ${
                      expiryStatus.isExpired
                        ? 'bg-gradient-to-r from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/20 border-red-500 dark:border-red-600 text-red-900 dark:text-red-300'
                        : 'bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-500 dark:border-amber-600 text-amber-900 dark:text-amber-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        expiryStatus.isExpired ? 'bg-red-200 dark:bg-red-900/40' : 'bg-amber-200 dark:bg-amber-900/40'
                      }`}>
                        <svg
                          className={`w-6 h-6 ${
                            expiryStatus.isExpired ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-base mb-1">
                          {expiryStatus.isExpired
                            ? 'Policy Expired'
                            : 'Policy Expiring Soon'}
                        </p>
                        <p className="text-sm">
                          {expiryStatus.isExpired
                            ? `This policy expired on ${new Date(policy.endDate).toLocaleDateString()}. Please renew or update the policy status.`
                            : `This policy will expire in ${expiryStatus.daysToExpiry} day${expiryStatus.daysToExpiry !== 1 ? 's' : ''} on ${new Date(policy.endDate).toLocaleDateString()}. Please take action to renew.`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Form Fields Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Name</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={!canEdit || policy.isDeleted}
                      readOnly={policy.isDeleted}
                      className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:text-gray-500 dark:disabled:text-gray-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Type</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      disabled={!canEdit || policy.isDeleted}
                      className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:text-gray-500 dark:disabled:text-gray-400"
                    >
                      {POLICY_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      disabled={!canEdit || policy.isDeleted}
                      className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:text-gray-500 dark:disabled:text-gray-400"
                    >
                      {POLICY_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Provider</label>
                    <input
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                      disabled={!canEdit || policy.isDeleted}
                      readOnly={policy.isDeleted}
                      className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:text-gray-500 dark:disabled:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Policy No.</label>
                    <input
                      value={policyNo}
                      onChange={(e) => setPolicyNo(e.target.value)}
                      disabled={!canEdit || policy.isDeleted}
                      readOnly={policy.isDeleted}
                      className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:text-gray-500 dark:disabled:text-gray-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      disabled={!canEdit || policy.isDeleted}
                      readOnly={policy.isDeleted}
                      className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:text-gray-500 dark:disabled:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      disabled={!canEdit || policy.isDeleted}
                      readOnly={policy.isDeleted}
                      className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:text-gray-500 dark:disabled:text-gray-400"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      disabled={!canEdit || policy.isDeleted}
                      readOnly={policy.isDeleted}
                      className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white min-h-[100px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:text-gray-500 dark:disabled:text-gray-400"
                    />
                  </div>
                </div>

                {/* Display files array */}
                {policy.files && policy.files.length > 0 && (
                  <div className="bg-gradient-to-br from-gray-50 to-white dark:from-slate-800 dark:to-slate-700 rounded-xl p-5 border border-gray-200 dark:border-slate-600">
                    <div className="flex items-center gap-2 mb-4">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <label className="block text-sm font-bold text-gray-900 dark:text-white">
                        Documents ({policy.files.length})
                      </label>
                    </div>
                    <div className="space-y-3">
                      {policy.files.map((file) => (
                        <div
                          key={file.id}
                          className="px-4 py-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`p-2 rounded-lg ${
                              file.mimeType === 'application/pdf' 
                                ? 'bg-red-100 dark:bg-red-900/30' 
                                : 'bg-blue-100 dark:bg-blue-900/30'
                            }`}>
                              {file.mimeType === 'application/pdf' ? (
                                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {file.fileName}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-2">
                                <span>{(file.sizeBytes / 1024 / 1024).toFixed(2)} MB</span>
                                {file.uploadedBy?.fullName && (
                                  <>
                                    <span>•</span>
                                    <span>Uploaded by {file.uploadedBy.fullName}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          {file.url ? (
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View
                            </a>
                          ) : (
                            <span className="ml-3 px-3 py-2 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
                              Error
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fallback to legacy fileUrl for backward compatibility */}
                {(!policy.files || policy.files.length === 0) && policy.fileUrl && (
                  <div className="bg-gradient-to-br from-gray-50 to-white dark:from-slate-800 dark:to-slate-700 rounded-xl p-5 border border-gray-200 dark:border-slate-600">
                    <label className="block text-sm font-bold text-gray-900 dark:text-white mb-3">File</label>
                    <a
                      href={policy.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-800 dark:hover:to-blue-900 transition-all shadow-sm hover:shadow-md"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View File
                    </a>
                  </div>
                )}

                {policy.isDeleted && (
                  <div className="px-5 py-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 dark:border-amber-600 text-amber-900 dark:text-amber-300 flex items-start gap-3">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold text-sm">This policy has been deleted.</span>
                  </div>
                )}

                {!canEdit && (
                  <div className="px-5 py-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 dark:border-amber-600 text-amber-900 dark:text-amber-300 flex items-start gap-3">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold text-sm">You don&apos;t have permission to edit this policy.</span>
                  </div>
                )}

                {canEdit && !policy.isDeleted && (
                  <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-slate-700">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="btn"
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
            )}
          </div>
        </div>
      </div>
    </>
  );
}

