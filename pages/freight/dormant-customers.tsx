import { useEffect, useState } from "react";
import Link from "next/link";
import { useTestMode } from "@/contexts/TestModeContext";

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
  const [error, setError] = useState<string | null>(null);
  const [dormantDays, setDormantDays] = useState(14);
  const [ventureId, setVentureId] = useState<number | null>(null);
  const [ventures, setVentures] = useState<{ id: number; name: string }[]>([]);
  const [total, setTotal] = useState(0);

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
        const res = await fetch(
          `/api/freight/dormant-customers?ventureId=${ventureId}&dormantDays=${dormantDays}&limit=100`
        );
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setCustomers(data.customers);
        setTotal(data.total);
      } catch (err: any) {
        setError(err.message ?? "Failed to load dormant customers");
      } finally {
        setLoading(false);
      }
    }
    fetchDormantCustomers();
  }, [ventureId, dormantDays]);

  const getRiskBadge = (customer: DormantCustomer) => {
    if (customer.churnStatus === "CHURNED") {
      return <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">Churned</span>;
    }
    if (customer.churnStatus === "AT_RISK" || (customer.churnRiskScore && customer.churnRiskScore > 0.5)) {
      return <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded">At Risk</span>;
    }
    if (customer.daysSinceTouch === null) {
      return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">Never Contacted</span>;
    }
    if (customer.daysSinceTouch > 30) {
      return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">Cold</span>;
    }
    return <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">Dormant</span>;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Dormant Customers</h1>
          <p className="text-gray-600 mt-1">
            Customers who haven&apos;t been contacted recently and may need follow-up.
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <div>
            <label className="text-sm text-gray-600 mr-2">Venture:</label>
            <select
              value={ventureId ?? ""}
              onChange={(e) => setVentureId(Number(e.target.value))}
              className="border rounded px-2 py-1 text-sm"
            >
              {ventures.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600 mr-2">Days Dormant:</label>
            <select
              value={dormantDays}
              onChange={(e) => setDormantDays(Number(e.target.value))}
              className="border rounded px-2 py-1 text-sm"
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

      {loading && <div className="text-gray-500">Loading...</div>}
      {error && <div className="text-red-500 mb-2">{error}</div>}

      {!loading && !error && (
        <>
          <div className="mb-4 text-sm text-gray-600">
            Showing {customers.length} of {total} dormant customers
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 border text-left">Customer</th>
                  <th className="px-3 py-2 border text-left">Status</th>
                  <th className="px-3 py-2 border text-center">Days Since Touch</th>
                  <th className="px-3 py-2 border text-center">Days Since Load</th>
                  <th className="px-3 py-2 border text-left">Last Touch By</th>
                  <th className="px-3 py-2 border text-left">Sales Rep</th>
                  <th className="px-3 py-2 border text-center">Total Loads</th>
                  <th className="px-3 py-2 border text-center">Total Touches</th>
                  <th className="px-3 py-2 border text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 border">
                      <div className="font-medium">{c.name}</div>
                      {c.email && <div className="text-xs text-gray-500">{c.email}</div>}
                    </td>
                    <td className="px-3 py-2 border">{getRiskBadge(c)}</td>
                    <td className="px-3 py-2 border text-center">
                      <span
                        className={`font-medium ${
                          c.daysSinceTouch === null
                            ? "text-gray-400"
                            : c.daysSinceTouch > 30
                            ? "text-red-600"
                            : c.daysSinceTouch > 14
                            ? "text-orange-600"
                            : ""
                        }`}
                      >
                        {c.daysSinceTouch ?? "Never"}
                      </span>
                    </td>
                    <td className="px-3 py-2 border text-center">
                      <span className={c.daysSinceLoad && c.daysSinceLoad > 30 ? "text-red-600 font-medium" : ""}>
                        {c.daysSinceLoad ?? "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2 border text-sm">
                      {c.lastTouchBy?.fullName ?? "-"}
                    </td>
                    <td className="px-3 py-2 border text-sm">
                      {c.salesRep?.fullName ?? c.csr?.fullName ?? "-"}
                    </td>
                    <td className="px-3 py-2 border text-center">{c.totalLoads}</td>
                    <td className="px-3 py-2 border text-center">{c.totalTouches}</td>
                    <td className="px-3 py-2 border text-center">
                      <Link
                        href={`/logistics/customers/${c.id}`}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr>
                    <td className="px-3 py-4 border text-center text-gray-500" colSpan={9}>
                      No dormant customers found for the selected criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

DormantCustomersPage.title = "Dormant Customers";

export default DormantCustomersPage;
