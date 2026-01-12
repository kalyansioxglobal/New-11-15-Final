import { useState, useEffect } from "react";
import Link from "next/link";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { canCreateTasks } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";
import { GetServerSideProps } from "next";
import { Skeleton } from "@/components/ui/Skeleton";
import toast from "react-hot-toast";

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
        if (!cancelled) {
          toast.error(e.message || "Failed to load customers");
        }
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
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">SaaS Customers</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage SaaS customers and subscriptions
          </p>
        </div>
        {allowCreate && (
          <Link
            href="/saas/customers/new"
            className="btn"
          >
            + New Customer
          </Link>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Customers</div>
          <div className="text-2xl font-semibold mt-1 text-gray-900 dark:text-white">{customers.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total MRR</div>
          <div className="text-2xl font-semibold mt-1 text-green-600 dark:text-green-400">
            ${totalMrr.toLocaleString()}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Active Subscriptions</div>
          <div className="text-2xl font-semibold mt-1 text-gray-900 dark:text-white">
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
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm w-64 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
        />
        <select
          value={ventureFilter}
          onChange={(e) => setVentureFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
        >
          <option value="">All Ventures</option>
          {saasVentures.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <Skeleton className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <Skeleton className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
              ))}
            </div>
          </div>
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center p-8 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <svg
            className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <p className="text-sm">No customers found</p>
          {searchQuery && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Try adjusting your search or filters
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Domain
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Venture
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  MRR
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Subscriptions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/saas/customers/${c.id}`}
                      className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors"
                    >
                      {c.name}
                    </Link>
                    {c.email && (
                      <div className="text-sm text-gray-400 dark:text-gray-500">{c.email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {c.domain || <span className="text-gray-400 dark:text-gray-500">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {c.venture?.name || <span className="text-gray-400 dark:text-gray-500">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-green-600 dark:text-green-400">
                    ${c.totalMrr.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-300">
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
