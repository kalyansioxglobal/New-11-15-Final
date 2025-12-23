import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { canEditPolicies } from '@/lib/permissions';
import type { UserRole } from '@prisma/client';

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

function PoliciesPage() {
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { effectiveUser } = useEffectiveUser();
  const role = (effectiveUser?.role || 'EMPLOYEE') as UserRole;
  const allowCreate = canEditPolicies(role);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch('/api/policies');
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to load policies');
        }
        const json = await res.json();
        if (!cancelled) setPolicies(json);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load policies');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

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
        {allowCreate && (
          <Link
            href="/policies/new"
            className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            + New Policy
          </Link>
        )}
      </div>

      {loading && <div className="text-sm text-gray-400">Loading policies...</div>}
      {error && <div className="text-sm text-red-500 mb-2">{error}</div>}

      {!loading && policies.length === 0 && (
        <div className="text-center py-12 border rounded-xl bg-gray-50">
          <div className="text-gray-400 text-3xl mb-3">📄</div>
          <h3 className="text-gray-700 font-medium mb-1">No Policies Found</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            No insurance policies, leases, or contracts have been added yet.
          </p>
          {allowCreate && (
            <Link
              href="/policies/new"
              className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
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
                      <span className={p.isExpired ? 'text-red-600 font-medium' : p.isExpiringSoon ? 'text-amber-600' : ''}>
                        {new Date(p.endDate).toLocaleDateString()}
                        {p.daysToExpiry !== null && p.daysToExpiry > 0 && (
                          <span className="text-gray-400 ml-1">({p.daysToExpiry}d)</span>
                        )}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/policies/${p.id}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

PoliciesPage.title = 'Policies';

export default PoliciesPage;
