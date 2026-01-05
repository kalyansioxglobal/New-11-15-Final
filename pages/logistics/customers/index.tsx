import { useState, useEffect } from "react";
import Link from "next/link";
import { GetServerSideProps } from "next";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { isLeadership } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";
import { Skeleton } from "@/components/ui/Skeleton";

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};

type Customer = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  vertical: string | null;
  isActive: boolean;
  venture: { id: number; name: string } | null;
  salesRep: { id: number; name: string | null } | null;
  csr: { id: number; name: string | null } | null;
  dispatcher: { id: number; name: string | null } | null;
  _count: { loads: number };
};

type Venture = { id: number; name: string };

function AssignmentBadge({ name }: { name: string | null | undefined }) {
  if (name) {
    return <span className="text-gray-700 dark:text-slate-200">{name}</span>;
  }
  return (
    <span className="text-gray-400 dark:text-slate-500 italic">Unassigned</span>
  );
}

function VerticalBadge({ vertical }: { vertical: string | null }) {
  if (!vertical) return null;
  return (
    <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-gray-100 dark:bg-slate-700/50 text-gray-700 dark:text-slate-300 rounded">
      {vertical}
    </span>
  );
}

export default function CustomersListPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [ventures, setVentures] = useState<Venture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [ventureFilter, setVentureFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [total, setTotal] = useState(0);

  const { effectiveUser } = useEffectiveUser();
  const role = (effectiveUser?.role || "EMPLOYEE") as UserRole;
  const allowCreate = isLeadership({ role });

  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  useEffect(() => {
    fetch("/api/ventures?limit=100")
      .then((r) => r.json())
      .then((data) => setVentures(data || []));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", String(pageSize));

        const res = await fetch(`/api/logistics/customers?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load customers");

        const json = await res.json();
        if (!cancelled) {
          setCustomers(json.items || []);
          setTotal(json.total || 0);
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const timer = setTimeout(load, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [page, pageSize]);

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      !searchQuery ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesVenture =
      !ventureFilter || c.venture?.id === parseInt(ventureFilter, 10);
    return matchesSearch && matchesVenture;
  });

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Shippers (Accounts)</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            CRM shipper accounts (sales/CSR/dispatcher assignments).
          </p>
        </div>
        {allowCreate && (
          <Link
            href="/logistics/customers/new"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition-colors whitespace-nowrap"
          >
            + New Shipper Account
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 sm:max-w-xs px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
        <select
          value={ventureFilter}
          onChange={(e) => setVentureFilter(e.target.value)}
          className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        >
          <option value="">All Ventures</option>
          {ventures.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-300 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center p-12">
          <Skeleton className="w-full h-[85vh]" />
        </div>
      ) : filteredCustomers.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800/50">
          <div className="text-gray-400 dark:text-slate-500 text-4xl mb-4">👥</div>
          <h3 className="text-gray-900 dark:text-slate-200 font-semibold text-lg mb-2">No Shipper Accounts Found</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
            {searchQuery || ventureFilter
              ? "No shipper accounts match your current filters."
              : "No shipper accounts are assigned to you yet."}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {filteredCustomers.map((c) => (
              <div
                key={c.id}
                className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/logistics/customers/${c.id}`}
                      className="font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                    >
                      {c.name}
                    </Link>
                    <VerticalBadge vertical={c.vertical} />
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xl font-bold text-gray-900 dark:text-slate-100">{c._count?.loads || 0}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-500">loads</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-slate-500 uppercase tracking-wide mb-1">Contact</div>
                    <div className="text-gray-700 dark:text-slate-300">{c.email || "-"}</div>
                    {c.phone && <div className="text-gray-500 dark:text-slate-400 text-xs">{c.phone}</div>}
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-slate-500 uppercase tracking-wide mb-1">Venture</div>
                    <div className="text-gray-700 dark:text-slate-300">{c.venture?.name || "-"}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-200 dark:border-slate-700 text-sm">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-slate-500 uppercase tracking-wide mb-1">Sales Rep</div>
                    <AssignmentBadge name={c.salesRep?.name} />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-slate-500 uppercase tracking-wide mb-1">CSR</div>
                    <AssignmentBadge name={c.csr?.name} />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-slate-500 uppercase tracking-wide mb-1">Dispatcher</div>
                    <AssignmentBadge name={c.dispatcher?.name} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                    <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Shipper Account
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Sales Rep
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      CSR
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Dispatcher
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Venture
                    </th>
                    <th className="px-5 py-4 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Loads
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {filteredCustomers.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-5 py-4">
                        <Link
                          href={`/logistics/customers/${c.id}`}
                          className="font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                        >
                          {c.name}
                        </Link>
                        <VerticalBadge vertical={c.vertical} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-gray-700 dark:text-slate-300">{c.email || "-"}</div>
                        {c.phone && (
                          <div className="text-xs text-gray-500 dark:text-slate-500">{c.phone}</div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm">
                        <AssignmentBadge name={c.salesRep?.name} />
                      </td>
                      <td className="px-5 py-4 text-sm">
                        <AssignmentBadge name={c.csr?.name} />
                      </td>
                      <td className="px-5 py-4 text-sm">
                        <AssignmentBadge name={c.dispatcher?.name} />
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700 dark:text-slate-300">
                        {c.venture?.name || "-"}
                      </td>
                      <td className="px-5 py-4 text-sm text-right">
                        <span className="font-semibold text-gray-900 dark:text-slate-100">{c._count?.loads || 0}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Showing <span className="font-medium text-gray-700 dark:text-slate-200">{filteredCustomers.length}</span> of{" "}
              <span className="font-medium text-gray-700 dark:text-slate-200">{total}</span> accounts
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="px-3 py-2 text-sm text-gray-500 dark:text-slate-400">
                Page <span className="font-medium text-gray-700 dark:text-slate-200">{page}</span> of{" "}
                <span className="font-medium text-gray-700 dark:text-slate-200">{totalPages}</span>
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
