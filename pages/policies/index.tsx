import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { canEditPolicies } from '@/lib/permissions';
import type { UserRole } from '@prisma/client';
import PolicyDetailModal from './PolicyDetailModal';
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

function PoliciesPage() {
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPolicyId, setSelectedPolicyId] = useState<number | null>(null);
  const [viewDeleted, setViewDeleted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<{ total: number; totalPages: number; page: number; pageSize: number } | null>(null);
  const [deletePolicyId, setDeletePolicyId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { effectiveUser } = useEffectiveUser();
  const role = (effectiveUser?.role || 'EMPLOYEE') as UserRole;
  const allowCreate = canEditPolicies(role);
  const allowDelete = canEditPolicies(role);

  const loadPolicies = useCallback(async () => {
    setLoading(true);
    setError(null);
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
      setError(errorMessage);
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
    setDeleteError(null);
    
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

      // Set loading state immediately before closing modal
      setLoading(true);
      
      // Close modal
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
      setDeleteError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
    }
  }

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    EXPIRED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
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
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Policies</h1>
          <p className="text-sm text-gray-500">
            Manage insurance policies, leases, contracts, and licenses
          </p>
        </div>
        {allowCreate && !viewDeleted && (
          <Link
            href="/policies/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Policy
          </Link>
        )}
      </div>

      {/* View Toggle Tabs */}
      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => handleViewToggle(false)}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
            !viewDeleted
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Active Policies
        </button>
        <button
          onClick={() => handleViewToggle(true)}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
            viewDeleted
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Deleted Policies
        </button>
      </div>

      {loading && <Skeleton className="w-full h-[85vh]" />}
      {error && <div className="text-sm text-red-500 mb-2">{error}</div>}

      {!loading && policies.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl bg-gradient-to-br from-gray-50 to-white">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Policies Found</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
            {viewDeleted
              ? 'No deleted policies found.'
              : 'Get started by creating your first policy document.'}
          </p>
          {allowCreate && !viewDeleted && (
            <Link
              href="/policies/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Your First Policy
            </Link>
          )}
        </div>
      )}

      {!loading && policies.length > 0 && (
        <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Provider</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Venture</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">End Date</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {policies.map((p) => (
                <tr
                  key={p.id}
                  className={`hover:bg-blue-50/50 transition-colors ${
                    p.isExpired
                      ? 'bg-red-50/30'
                      : p.isExpiringSoon
                      ? 'bg-amber-50/30'
                      : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getTypeIcon(p.type)}</span>
                      <span className="font-semibold text-gray-900">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.type}</td>
                  <td className="px-4 py-3 text-gray-600">{p.provider || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{p.ventureName || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                        statusColors[p.status] || 'bg-gray-100 text-gray-800'
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
                            className={`w-4 h-4 flex-shrink-0 ${
                              p.isExpired ? 'text-red-500' : 'text-amber-500'
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
                          className={`text-sm ${
                            p.isExpired
                              ? 'text-red-700 font-semibold'
                              : p.isExpiringSoon
                              ? 'text-amber-700 font-medium'
                              : 'text-gray-600'
                          }`}
                        >
                          {new Date(p.endDate).toLocaleDateString()}
                          {p.daysToExpiry !== null && p.daysToExpiry > 0 && (
                            <span className="text-gray-400 ml-1">({p.daysToExpiry}d)</span>
                          )}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedPolicyId(p.id)}
                        className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        View
                      </button>
                      {!viewDeleted && allowDelete && (
                        <button
                          onClick={() => setDeletePolicyId(p.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
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
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-900">{(pagination.page - 1) * pagination.pageSize + 1}</span> to{' '}
            <span className="font-semibold text-gray-900">{Math.min(pagination.page * pagination.pageSize, pagination.total)}</span> of{' '}
            <span className="font-semibold text-gray-900">{pagination.total}</span> policies
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
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
                      {showEllipsis && <span className="px-2 text-gray-400">...</span>}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-all ${
                          currentPage === page
                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                            : 'border border-gray-300 hover:bg-gray-50 text-gray-700'
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
              className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
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

      {/* Delete Confirmation Modal */}
      {deletePolicyId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30"
          onClick={() => !deleting && setDeletePolicyId(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full m-4 transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center ring-4 ring-red-100">
                    <svg
                      className="w-7 h-7 text-red-600"
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
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Delete Policy?
                  </h3>
                  <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                    Are you sure you want to delete this policy? This action cannot be undone.
                  </p>
                  {deleteError && (
                    <div className="mb-4 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                      <svg
                        className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>{deleteError}</span>
                    </div>
                  )}
                  <div className="flex gap-3 justify-end pt-2">
                    <button
                      onClick={() => {
                        setDeletePolicyId(null);
                        setDeleteError(null);
                      }}
                      disabled={deleting}
                      className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="px-5 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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

PoliciesPage.title = 'Policies';

export default PoliciesPage;
