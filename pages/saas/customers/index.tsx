import { useState, useEffect } from "react";
import Link from "next/link";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { canCreateTasks } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";
import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};

type Customer = {
  id: number;
  name: string;
  email: string | null;
  domain: string | null;
  notes: string | null;
  venture: { id: number; name: string };
  totalMrr: number;
  activeSubscriptions: number;
};

type Venture = { id: number; name: string };

export default function CustomersListPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [saasVentures, setSaasVentures] = useState<Venture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [ventureFilter, setVentureFilter] = useState<string>("");

  const { effectiveUser } = useEffectiveUser();
  const role = (effectiveUser?.role || "EMPLOYEE") as UserRole;
  const allowCreate = canCreateTasks(role);

  useEffect(() => {
    fetch("/api/ventures?types=SAAS")
      .then((r) => r.json())
      .then((data) => setSaasVentures(data || []));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (ventureFilter) params.set("ventureId", ventureFilter);
        if (searchQuery) params.set("q", searchQuery);
        params.set("page", "1");
        params.set("pageSize", "200");

        const res = await fetch(`/api/saas/customers?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load customers");

        const json = await res.json();
        if (!cancelled) setCustomers(json.items || []);
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const timer = setTimeout(load, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ventureFilter, searchQuery]);

  const totalMrr = customers.reduce((sum, c) => sum + c.totalMrr, 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">SaaS Customers</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage SaaS customers and subscriptions
          </p>
        </div>
        {allowCreate && (
          <Link
            href="/saas/customers/new"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            + New Customer
          </Link>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm text-gray-500">Total Customers</div>
          <div className="text-2xl font-semibold mt-1">{customers.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm text-gray-500">Total MRR</div>
          <div className="text-2xl font-semibold mt-1 text-green-600">
            ${totalMrr.toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm text-gray-500">Active Subscriptions</div>
          <div className="text-2xl font-semibold mt-1">
            {customers.reduce((sum, c) => sum + c.activeSubscriptions, 0)}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search by name, email, or domain..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm w-64"
        />
        <select
          value={ventureFilter}
          onChange={(e) => setVentureFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">All Ventures</option>
          {saasVentures.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center p-8 text-gray-500">
          No customers found
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Domain
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Venture
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  MRR
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Subscriptions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/saas/customers/${c.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {c.name}
                    </Link>
                    <div className="text-sm text-gray-400">{c.email || ""}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {c.domain || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {c.venture?.name || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                    ${c.totalMrr.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">
                    {c.activeSubscriptions}
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

CustomersListPage.title = 'SaaS Customers';
