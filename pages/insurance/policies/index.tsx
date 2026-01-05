import { useEffect, useState } from 'react';
import { GetServerSideProps } from 'next';
import { Skeleton } from '@/components/ui/Skeleton';

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};

interface InsurancePolicy {
  id: number;
  ventureId: number;
  name: string;
  provider?: string | null;
  policyNumber?: string | null;
  coverageType?: string | null;
  fileUrl: string;
  startDate?: string | null;
  endDate?: string | null;
  status?: string | null;
  venture?: { id: number; name: string } | null;
}

function InsurancePoliciesPage() {
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    ventureId: '',
    name: '',
    provider: '',
    policyNumber: '',
    coverageType: '',
    fileUrl: '',
    startDate: '',
    endDate: '',
    status: 'Active',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPolicies();
  }, []);

  async function loadPolicies() {
    try {
      const res = await fetch('/api/insurance/policies');
      if (!res.ok) {
        setError('Failed to load policies');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setPolicies(data);
    } catch (err) {
      console.error(err);
      setError('Error loading policies');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      const res = await fetch('/api/insurance/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to create policy');
        return;
      }

      setForm({
        ventureId: '',
        name: '',
        provider: '',
        policyNumber: '',
        coverageType: '',
        fileUrl: '',
        startDate: '',
        endDate: '',
        status: 'Active',
      });

      await loadPolicies();
    } catch (err) {
      console.error(err);
      setError('Error creating policy');
    }
  }

  if (loading) {
    return (
     <Skeleton className="w-full h-[85vh]" />
    );
  }

  return (
    <div className="p-4 space-y-6">
        <h1 className="text-xl font-semibold">Insurance Policies</h1>
        <p className="text-sm text-gray-400">
          You only see policies for ventures you are assigned to. CEO/Admin see all.
        </p>

        {error && <div className="text-red-400 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3 border border-gray-700 rounded-lg p-4">
          <h2 className="text-lg font-medium">Add / Upload Policy</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
              placeholder="Venture ID"
              value={form.ventureId}
              onChange={(e) => setForm({ ...form, ventureId: e.target.value })}
            />
            <input
              className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
              placeholder="Policy Name (e.g. SIOX Logistics Cargo 2025)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
              placeholder="Provider (e.g. Progressive)"
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value })}
            />
            <input
              className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
              placeholder="Policy Number"
              value={form.policyNumber}
              onChange={(e) => setForm({ ...form, policyNumber: e.target.value })}
            />
            <input
              className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
              placeholder="Coverage Type (Cargo, GL, WC, etc.)"
              value={form.coverageType}
              onChange={(e) => setForm({ ...form, coverageType: e.target.value })}
            />
            <input
              className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
              placeholder="File URL (after upload to Supabase/S3)"
              value={form.fileUrl}
              onChange={(e) => setForm({ ...form, fileUrl: e.target.value })}
            />
            <input
              type="date"
              className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
            <input
              type="date"
              className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
            <select
              className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="Active">Active</option>
              <option value="Expired">Expired</option>
              <option value="Pending">Pending</option>
            </select>
          </div>

          <button
            type="submit"
            className="mt-2 px-4 py-2 rounded bg-blue-600 text-sm font-medium hover:bg-blue-700"
          >
            Save Policy
          </button>
        </form>

        <div className="border border-gray-700 rounded-lg overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-3 py-2 text-left">Venture</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Provider</th>
                <th className="px-3 py-2 text-left">Coverage</th>
                <th className="px-3 py-2 text-left">Policy #</th>
                <th className="px-3 py-2 text-left">Start</th>
                <th className="px-3 py-2 text-left">End</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">File</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => (
                <tr key={p.id} className="border-t border-gray-800">
                  <td className="px-3 py-2">{p.venture?.name || p.ventureId}</td>
                  <td className="px-3 py-2">{p.name}</td>
                  <td className="px-3 py-2">{p.provider || '-'}</td>
                  <td className="px-3 py-2">{p.coverageType || '-'}</td>
                  <td className="px-3 py-2">{p.policyNumber || '-'}</td>
                  <td className="px-3 py-2">
                    {p.startDate ? new Date(p.startDate).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-3 py-2">
                    {p.endDate ? new Date(p.endDate).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-3 py-2">{p.status || '-'}</td>
                  <td className="px-3 py-2">
                    <a
                      href={p.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline text-blue-400"
                    >
                      View
                    </a>
                  </td>
                </tr>
              ))}
              {policies.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-center text-gray-500" colSpan={9}>
                    No policies found for your venture.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
    </div>
  );
}

InsurancePoliciesPage.title = "Insurance Policies";

export default InsurancePoliciesPage;
