import { useState, useEffect } from "react";
import Link from "next/link";
import { GetServerSideProps } from "next";
import { Skeleton } from "@/components/ui/Skeleton";

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};

type Venture = { id: number; name: string; type: string };

type Subscription = {
  id: number;
  plan: string;
  status: string;
  mrr: number | null;
  startDate: string;
  endDate: string | null;
  customerName: string;
};

function SaasSubscriptionsPage() {
  const [saasVentures, setSaasVentures] = useState<Venture[]>([]);
  const [selectedVentureId, setSelectedVentureId] = useState<number | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ventures?types=SAAS")
      .then((r) => r.json())
      .then((list: Venture[]) => {
        setSaasVentures(list || []);
        if (list && list.length > 0) {
          setSelectedVentureId(list[0].id);
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedVentureId) return;

    setLoading(true);
    setError(null);

    fetch(`/api/saas/subscriptions?ventureId=${selectedVentureId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load subscriptions");
        return r.json();
      })
      .then((data) => {
        setSubscriptions(data.subscriptions || []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setSubscriptions([]);
        setLoading(false);
      });
  }, [selectedVentureId]);

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-800",
    TRIAL: "bg-blue-100 text-blue-800",
    CANCELLED: "bg-red-100 text-red-800",
    EXPIRED: "bg-gray-100 text-gray-600",
    PAUSED: "bg-yellow-100 text-yellow-800",
  };

  const totalMrr = subscriptions.reduce((sum, s) => sum + (s.mrr || 0), 0);
  const activeCount = subscriptions.filter((s) => s.status === "ACTIVE").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">SaaS Subscriptions</h1>
          <p className="text-sm text-gray-600 mt-1">
            Track subscription plans, MRR, and customer billing status.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedVentureId || ""}
            onChange={(e) => setSelectedVentureId(Number(e.target.value) || null)}
            className="px-3 py-1.5 border rounded text-sm"
          >
            {saasVentures.length === 0 && <option value="">No SaaS ventures</option>}
            {saasVentures.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {subscriptions.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-gray-500">Total Subscriptions</div>
            <div className="text-2xl font-semibold mt-1">{subscriptions.length}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-gray-500">Active</div>
            <div className="text-2xl font-semibold mt-1 text-green-600">{activeCount}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-gray-500">Total MRR</div>
            <div className="text-2xl font-semibold mt-1 text-blue-600">
              ${totalMrr.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Skeleton className="w-full h-[85vh]" />
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="bg-gray-50 border rounded-xl p-8 text-center">
          <div className="text-gray-400 text-4xl mb-4">📋</div>
          <h2 className="text-lg font-medium text-gray-700 mb-2">No Subscriptions Yet</h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-4">
            Subscriptions will appear here once customers are added and have active plans.
          </p>
          <Link
            href="/saas/customers"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            View Customers
          </Link>
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
                  Plan
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  MRR
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Start Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {subscriptions.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {s.customerName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s.plan}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        statusColors[s.status] || "bg-gray-100"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-green-600">
                    ${(s.mrr || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(s.startDate).toLocaleDateString()}
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

SaasSubscriptionsPage.title = "SaaS Subscriptions";

export default SaasSubscriptionsPage;
