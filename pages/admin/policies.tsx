import { useEffect, useState, useCallback } from 'react';
import { GetServerSideProps } from 'next';
import { getEffectiveUser } from '@/lib/effectiveUser';
import { canEditPolicies } from '@/lib/permissions';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import type { UserRole } from '@prisma/client';
import PolicyDetailModal from '../policies/PolicyDetailModal';
import NewPolicyModal from '../policies/NewPolicyModal';
import { Skeleton } from '@/components/ui/Skeleton';
import toast from 'react-hot-toast';

type PolicyRow = {
  id: number;
  name: string;
  type: string;
  provider: string | null;
  policyNo: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  ventureName: string | null;
  officeName: string | null;
  isExpiringSoon: boolean;
  isExpired: boolean;
  daysToExpiry: number | null;
};

type PaginatedResponse = {
  items: PolicyRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { req, res } = ctx;
  const user = await getEffectiveUser(req, res);

  if (!user || !canEditPolicies(user.role)) {
    return { redirect: { destination: '/policies', permanent: false } };
  }

  return { props: {} };
};

export default function AdminPolicies() {
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPolicyId, setSelectedPolicyId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewDeleted, setViewDeleted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<{ total: number; totalPages: number; page: number; pageSize: number } | null>(null);
  const [deletePolicyId, setDeletePolicyId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { effectiveUser } = useEffectiveUser();
  const role = (effectiveUser?.role || 'EMPLOYEE') as UserRole;
  const allowCreate = canEditPolicies(role);
  const allowDelete = canEditPolicies(role);

  const loadPolicies = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: '20',
        ...(viewDeleted && { deletedOnly: 'true' }),
      });
      const res = await fetch(`/api/policies?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load policies');
      }
      const json: PaginatedResponse = await res.json();
      setPolicies(json.items);
      setPagination({
        total: json.total,
        totalPages: json.totalPages,
        page: json.page,
        pageSize: json.pageSize,
      });
    } catch (e: any) {
      const errorMessage = e.message || 'Failed to load policies';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentPage, viewDeleted]);

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  function handleRefreshPolicies() {
    // Reload policies list after save/delete
    loadPolicies();
  }

  function handleViewToggle(isDeleted: boolean) {
    setViewDeleted(isDeleted);
    setCurrentPage(1); // Reset to first page when switching views
  }

  async function handleDelete() {
    if (!deletePolicyId || !allowDelete) return;

    setDeleting(true);

    try {
      const res = await fetch(`/api/policies/${deletePolicyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isDeleted: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete policy');
      }

      // Show success toast before closing modal
      toast.success('Policy deleted successfully');
      setDeletePolicyId(null);

      // Refresh list - check if we need to adjust page first
      const checkPageParams = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: '20',
        ...(viewDeleted && { deletedOnly: 'true' }),
      });
      const checkRes = await fetch(`/api/policies?${checkPageParams}`);

      if (checkRes.ok) {
        const checkJson: PaginatedResponse = await checkRes.json();

        // If current page is empty and we're not on page 1, go back one page
        // This will trigger useEffect to reload with the new page and show loading
        if (checkJson.items.length === 0 && currentPage > 1 && checkJson.totalPages > 0) {
          setCurrentPage(currentPage - 1);
        } else {
          // Reload using loadPolicies to show loading state
          await loadPolicies();
        }
      } else {
        // If check fails, reload using loadPolicies
        await loadPolicies();
      }
    } catch (e: any) {
      const errorMessage = e.message || 'Failed to delete policy';
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
    }
  }

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800',
    PENDING: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800',
    EXPIRED: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800',
    CANCELLED: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-600',
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      INSURANCE: '🛡️',
      LEASE: '📋',
      CONTRACT: '📄',
      LICENSE: '📜',
      PERMIT: '✅',
      WARRANTY: '🔧',
      OTHER: '📌',
    };
    return icons[type] || '📌';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">Policies (Admin)</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage insurance policies, leases, contracts, and licenses
          </p>
        </div>
        {allowCreate && !viewDeleted && (
          <button
            onClick={() => setShowCreateModal(true)}
            className='btn'
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Policy
          </button>
        )}
      </div>

      {/* View Toggle Tabs */}
      <div className="flex gap-2 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit border border-gray-200 dark:border-gray-700">
        <button
          onClick={() => handleViewToggle(false)}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${!viewDeleted
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm dark:shadow-gray-900/50'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
        >
          Active Policies
        </button>
        <button
          onClick={() => handleViewToggle(true)}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${viewDeleted
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm dark:shadow-gray-900/50'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
        >
          Deleted Policies
        </button>
      </div>

      {loading && <Skeleton className="w-full h-[85vh]" />}

      {!loading && policies.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
            <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Policies Found</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
            {viewDeleted
              ? 'No deleted policies found.'
              : 'Get started by creating your first policy document.'}
          </p>
          {allowCreate && !viewDeleted && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 text-white rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-800 dark:hover:to-blue-900 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Your First Policy
            </button>
          )}
        </div>
      )}

      {!loading && policies.length > 0 && (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Provider</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Venture</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">Status</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">End Date</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {policies.map((p) => (
                <tr
                  key={p.id}
                  className={`hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors ${p.isExpired
                      ? 'bg-red-50/30 dark:bg-red-900/20'
                      : p.isExpiringSoon
                        ? 'bg-amber-50/30 dark:bg-amber-900/20'
                        : ''
                    }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getTypeIcon(p.type)}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.type}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.provider || '-'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.ventureName || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[p.status] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                        }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.endDate ? (
                      <div className="flex items-center justify-center gap-1.5">
                        {(p.isExpired || p.isExpiringSoon) && (
                          <svg
                            className={`w-4 h-4 flex-shrink-0 ${p.isExpired ? 'text-red-500 dark:text-red-400' : 'text-amber-500 dark:text-amber-400'
                              }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-label={p.isExpired ? 'Expired' : 'Expiring soon'}
                          >
                            <path
                              fillRule="evenodd"
                              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                        <span
                          className={`text-sm ${p.isExpired
                              ? 'text-red-700 dark:text-red-400 font-semibold'
                              : p.isExpiringSoon
                                ? 'text-amber-700 dark:text-amber-400 font-medium'
                                : 'text-gray-600 dark:text-gray-300'
                            }`}
                        >
                          {new Date(p.endDate).toLocaleDateString()}
                          {p.daysToExpiry !== null && p.daysToExpiry > 0 && (
                            <span className="text-gray-400 dark:text-gray-500 ml-1">({p.daysToExpiry}d)</span>
                          )}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedPolicyId(p.id)}
                        className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                      >
                        View
                      </button>
                      {!viewDeleted && allowDelete && (
                        <button
                          onClick={() => setDeletePolicyId(p.id)}
                          className="p-1.5 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title="Delete policy"
                          aria-label="Delete policy"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing <span className="font-semibold text-gray-900 dark:text-white">{(pagination.page - 1) * pagination.pageSize + 1}</span> to{' '}
            <span className="font-semibold text-gray-900 dark:text-white">{Math.min(pagination.page * pagination.pageSize, pagination.total)}</span> of{' '}
            <span className="font-semibold text-gray-900 dark:text-white">{pagination.total}</span> policies
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  if (page === 1 || page === pagination.totalPages) return true;
                  if (Math.abs(page - currentPage) <= 1) return true;
                  return false;
                })
                .map((page, idx, arr) => {
                  const prevPage = arr[idx - 1];
                  const showEllipsis = prevPage && page - prevPage > 1;
                  return (
                    <div key={page} className="flex items-center gap-1">
                      {showEllipsis && <span className="px-2 text-gray-400 dark:text-gray-500">...</span>}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-all ${currentPage === page
                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 text-white shadow-md'
                            : 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                          }`}
                      >
                        {page}
                      </button>
                    </div>
                  );
                })}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={currentPage === pagination.totalPages}
              className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {selectedPolicyId && (
        <PolicyDetailModal
          policyId={selectedPolicyId}
          onClose={() => setSelectedPolicyId(null)}
          onSave={handleRefreshPolicies}
        />
      )}

      {showCreateModal && (
        <NewPolicyModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleRefreshPolicies}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletePolicyId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30 dark:bg-black/70"
          onClick={() => !deleting && setDeletePolicyId(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full m-4 transform transition-all border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center ring-4 ring-red-100 dark:ring-red-900/50">
                    <svg
                      className="w-7 h-7 text-red-600 dark:text-red-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Delete Policy?
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                    Are you sure you want to delete this policy? This action cannot be undone.
                  </p>
                  <div className="flex gap-3 justify-end pt-2">
                    <button
                      onClick={() => {
                        setDeletePolicyId(null);
                      }}
                      disabled={deleting}
                      className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="px-5 py-2.5 text-sm font-medium text-white bg-red-600 dark:bg-red-700 rounded-lg hover:bg-red-700 dark:hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      {deleting ? (
                        <>
                          <svg
                            className="animate-spin h-4 w-4"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Deleting...
                        </>
                      ) : (
                        'Delete Policy'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
