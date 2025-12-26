import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { canEditPolicies } from '@/lib/permissions';
import type { UserRole } from '@prisma/client';
import PolicyDetailModal from './PolicyDetailModal';

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
      setError(e.message || 'Failed to load policies');
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
      setDeleteError(e.message || 'Failed to delete policy');
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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Policies</h1>
        {allowCreate && !viewDeleted && (
          <Link
            href="/policies/new"
            className="px-3 py-1.5 rounded bg-blue-600 !text-white text-sm font-medium hover:bg-blue-700"
          >
            + New Policy
          </Link>
        )}
      </div>

      {/* View Toggle Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-200">
        <button
          onClick={() => handleViewToggle(false)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            !viewDeleted
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Active Policies
        </button>
        <button
          onClick={() => handleViewToggle(true)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            viewDeleted
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          View Deleted Policies
        </button>
      </div>

      {loading && <div className="text-sm text-gray-400">Loading policies...</div>}
      {error && <div className="text-sm text-red-500 mb-2">{error}</div>}

      {!loading && policies.length === 0 && (
        <div className="text-center py-12 border rounded-xl bg-gray-50">
          <div className="text-gray-400 text-3xl mb-3">📄</div>
          <h3 className="text-gray-700 font-medium mb-1">No Policies Found</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            {viewDeleted
              ? 'No deleted policies found.'
              : 'No insurance policies, leases, or contracts have been added yet.'}
          </p>
          {allowCreate && !viewDeleted && (
            <Link
              href="/policies/new"
              className="inline-block mt-4 px-4 py-2 bg-blue-600 !text-white rounded text-sm hover:bg-blue-700"
            >
              + New Policy
            </Link>
          )}
        </div>
      )}

      {!loading && policies.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 bg-white rounded">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Name</th>
                <th className="px-3 py-2 text-left font-medium">Type</th>
                <th className="px-3 py-2 text-left font-medium">Provider</th>
                <th className="px-3 py-2 text-left font-medium">Venture</th>
                <th className="px-3 py-2 text-center font-medium">Status</th>
                <th className="px-3 py-2 text-center font-medium">End Date</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => (
                <tr
                  key={p.id}
                  className={`border-t border-gray-100 hover:bg-gray-50 ${
                    p.isExpired ? 'bg-red-50' : p.isExpiringSoon ? 'bg-amber-50' : ''
                  }`}
                >
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2 text-gray-600">{p.type}</td>
                  <td className="px-3 py-2 text-gray-600">{p.provider || '-'}</td>
                  <td className="px-3 py-2 text-gray-600">{p.ventureName || '-'}</td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        statusColors[p.status] || 'bg-gray-100'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center text-gray-600 text-xs">
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
                        <span className={p.isExpired ? 'text-red-600 font-medium' : p.isExpiringSoon ? 'text-amber-600' : ''}>
                          {new Date(p.endDate).toLocaleDateString()}
                          {p.daysToExpiry !== null && p.daysToExpiry > 0 && (
                            <span className="text-gray-400 ml-1">({p.daysToExpiry}d)</span>
                          )}
                        </span>
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedPolicyId(p.id)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View
                      </button>
                      {!viewDeleted && allowDelete && (
                        <button
                          onClick={() => setDeletePolicyId(p.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
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
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total} policies
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  // Show first page, last page, current page, and pages around current
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
                        className={`px-3 py-1.5 text-sm border rounded ${
                          currentPage === page
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 hover:bg-gray-50'
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
              className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
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
