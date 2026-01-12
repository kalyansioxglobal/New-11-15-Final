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
    ACTIVE: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800",
    TRIAL: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
    CANCELLED: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800",
    EXPIRED: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600",
    PAUSED: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800",
  };

  const totalMrr = subscriptions.reduce((sum, s) => sum + (s.mrr || 0), 0);
  const activeCount = subscriptions.filter((s) => s.status === "ACTIVE").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">SaaS Subscriptions</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Track subscription plans, MRR, and customer billing status.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedVentureId || ""}
            onChange={(e) => setSelectedVentureId(Number(e.target.value) || null)}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
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
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Subscriptions</div>
            <div className="text-2xl font-semibold mt-1 text-gray-900 dark:text-white">{subscriptions.length}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">Active</div>
            <div className="text-2xl font-semibold mt-1 text-green-600 dark:text-green-400">{activeCount}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total MRR</div>
            <div className="text-2xl font-semibold mt-1 text-blue-600 dark:text-blue-400">
              ${totalMrr.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Skeleton className="w-full h-[85vh]" />
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center">
          <div className="text-gray-400 dark:text-gray-500 text-4xl mb-4">📋</div>
          <h2 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">No Subscriptions Yet</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-4">
            Subscriptions will appear here once customers are added and have active plans.
          </p>
          <Link
            href="/saas/customers"
            className="btn"
          >
            View Customers
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  MRR
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Start Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {subscriptions.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {s.customerName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{s.plan}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        statusColors[s.status] || "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-green-600 dark:text-green-400">
                    ${(s.mrr || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
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
