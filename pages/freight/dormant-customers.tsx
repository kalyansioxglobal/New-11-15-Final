import { useEffect, useState } from "react";
import Link from "next/link";
import { useTestMode } from "@/contexts/TestModeContext";
import { Skeleton } from "@/components/ui/Skeleton";
import toast from "react-hot-toast";

type DormantCustomer = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  lastTouchAt: string | null;
  lastLoadDate: string | null;
  churnStatus: string | null;
  churnRiskScore: number | null;
  lifecycleStatus: string | null;
  salesRep: { id: number; fullName: string } | null;
  csr: { id: number; fullName: string } | null;
  lastTouchBy: { id: number; fullName: string } | null;
  daysSinceTouch: number | null;
  daysSinceLoad: number | null;
  totalLoads: number;
  totalTouches: number;
};

function DormantCustomersPage() {
  const { testMode } = useTestMode();
  const [customers, setCustomers] = useState<DormantCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dormantDays, setDormantDays] = useState(14);
  const [ventureId, setVentureId] = useState<number | null>(null);
  const [ventures, setVentures] = useState<{ id: number; name: string }[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);

  useEffect(() => {
    fetch(`/api/ventures?types=LOGISTICS,TRANSPORT&includeTest=${testMode}`)
      .then((r) => r.json())
      .then((data) => {
        setVentures(data);
        if (data.length > 0 && !ventureId) {
          setVentureId(data[0].id);
        }
      })
      .catch(() => {});
  }, [testMode]);

  useEffect(() => {
    if (!ventureId) return;

    async function fetchDormantCustomers() {
      try {
        setLoading(true);
        const offset = (page - 1) * pageSize;
        const res = await fetch(
          `/api/freight/dormant-customers?ventureId=${ventureId}&dormantDays=${dormantDays}&limit=${pageSize}&offset=${offset}`
        );
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || "Failed to load dormant customers");
        }
        const data = await res.json();
        setCustomers(data.customers);
        setTotal(data.total);
      } catch (err: any) {
        toast.error(err.message ?? "Failed to load dormant customers");
        setCustomers([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    }
    fetchDormantCustomers();
  }, [ventureId, dormantDays, page, pageSize]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [ventureId, dormantDays]);

  const getRiskBadge = (customer: DormantCustomer) => {
    if (customer.churnStatus === "CHURNED") {
      return <span className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded">Churned</span>;
    }
    if (customer.churnStatus === "AT_RISK" || (customer.churnRiskScore && customer.churnRiskScore > 0.5)) {
      return <span className="px-2 py-1 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 rounded">At Risk</span>;
    }
    if (customer.daysSinceTouch === null) {
      return <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded">Never Contacted</span>;
    }
    if (customer.daysSinceTouch > 30) {
      return <span className="px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800 rounded">Cold</span>;
    }
    return <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded">Dormant</span>;
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing <span className="font-medium text-gray-900 dark:text-white">{(page - 1) * pageSize + 1}</span> to{" "}
          <span className="font-medium text-gray-900 dark:text-white">{Math.min(page * pageSize, total)}</span> of{" "}
          <span className="font-medium text-gray-900 dark:text-white">{total}</span> dormant customers
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition ${
              page === 1
                ? "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            Previous
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page <span className="font-medium text-gray-900 dark:text-white">{page}</span> of{" "}
            <span className="font-medium text-gray-900 dark:text-white">{totalPages}</span>
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition ${
              page === totalPages
                ? "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 dark:bg-gray-900 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Dormant Customers</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Customers who haven&apos;t been contacted recently and may need follow-up.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400 mr-2">Venture:</label>
            <select
              value={ventureId ?? ""}
              onChange={(e) => setVentureId(Number(e.target.value))}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
            >
              {ventures.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400 mr-2">Days Dormant:</label>
            <select
              value={dormantDays}
              onChange={(e) => setDormantDays(Number(e.target.value))}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
            >
              <option value={7}>7+ days</option>
              <option value={14}>14+ days</option>
              <option value={30}>30+ days</option>
              <option value={60}>60+ days</option>
              <option value={90}>90+ days</option>
            </select>
          </div>
        </div>
      </div>

      {loading && <Skeleton className="w-full h-[85vh]" />}

      {!loading && (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 text-left font-semibold text-gray-700 dark:text-gray-300">Customer</th>
                    <th className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 text-left font-semibold text-gray-700 dark:text-gray-300">Status</th>
                    <th className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 text-center font-semibold text-gray-700 dark:text-gray-300">Days Since Touch</th>
                    <th className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 text-center font-semibold text-gray-700 dark:text-gray-300">Days Since Load</th>
                    <th className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 text-left font-semibold text-gray-700 dark:text-gray-300">Last Touch By</th>
                    <th className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 text-left font-semibold text-gray-700 dark:text-gray-300">Sales Rep</th>
                    <th className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 text-center font-semibold text-gray-700 dark:text-gray-300">Total Loads</th>
                    <th className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 text-center font-semibold text-gray-700 dark:text-gray-300">Total Touches</th>
                    <th className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 text-center font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-white">{c.name}</div>
                        {c.email && <div className="text-xs text-gray-500 dark:text-gray-400">{c.email}</div>}
                      </td>
                      <td className="px-4 py-3">{getRiskBadge(c)}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`font-medium ${
                            c.daysSinceTouch === null
                              ? "text-gray-400 dark:text-gray-500"
                              : c.daysSinceTouch > 30
                              ? "text-red-600 dark:text-red-400"
                              : c.daysSinceTouch > 14
                              ? "text-orange-600 dark:text-orange-400"
                              : "text-gray-900 dark:text-white"
                          }`}
                        >
                          {c.daysSinceTouch ?? "Never"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={c.daysSinceLoad && c.daysSinceLoad > 30 ? "text-red-600 dark:text-red-400 font-medium" : "text-gray-900 dark:text-white"}>
                          {c.daysSinceLoad ?? "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {c.lastTouchBy?.fullName ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {c.salesRep?.fullName ?? c.csr?.fullName ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-900 dark:text-white">{c.totalLoads}</td>
                      <td className="px-4 py-3 text-center text-gray-900 dark:text-white">{c.totalTouches}</td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/logistics/customers/${c.id}`}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline text-sm font-medium transition-colors"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {customers.length === 0 && (
                    <tr>
                      <td className="px-4 py-12 text-center text-gray-500 dark:text-gray-400" colSpan={9}>
                        No dormant customers found for the selected criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination()}
          </div>
        </>
      )}
    </div>
  );
}

DormantCustomersPage.title = "Dormant Customers";

export default DormantCustomersPage;
