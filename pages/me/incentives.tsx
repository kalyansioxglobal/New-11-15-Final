import React, { useEffect, useState } from "react";
import { PageWithLayout } from "@/types/page";

interface IncentiveDailyItem {
  id: number;
  date: string;
  scope: string;
  metricKey: string;
  metricValue: number;
  payoutAmount: number;
}

const MeIncentivesPage: PageWithLayout = () => {
  const [items, setItems] = useState<IncentiveDailyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [totalThisMonth, setTotalThisMonth] = useState(0);
  const [totalLast30, setTotalLast30] = useState(0);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/me/incentives");
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to load incentives");
        }
        setItems(json.items || []);
        setTotalThisMonth(json.totalThisMonth || 0);
        setTotalLast30(json.totalLast30 || 0);
      } catch (e: any) {
        setError(e?.message || "Failed to load incentives");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">My Incentives</h1>
        <p className="text-xs text-gray-500 mt-1">
          Read-only view of your daily incentives over the last 30 days.
        </p>
      </div>

      {error && (
        <div className="text-xs text-red-600 border border-red-300 rounded px-3 py-2 bg-red-50">
          {error}
        </div>
      )}

      <div className="rounded border border-gray-200 bg-white p-4 flex gap-6 text-sm">
        <div>
          <div className="text-xs text-gray-500">Total incentives this month</div>
          <div className="text-lg font-semibold">${totalThisMonth.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Total last 30 days</div>
          <div className="text-lg font-semibold">${totalLast30.toFixed(2)}</div>
        </div>
      </div>

      <div className="rounded border border-gray-200 bg-white p-4">
        <div className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
          Daily Incentives (Last 30 Days)
        </div>
        {loading ? (
          <div className="text-xs text-gray-500">Loading…</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-[11px] text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="py-1.5 px-2 border-b">Date</th>
                  <th className="py-1.5 px-2 border-b">Scope</th>
                  <th className="py-1.5 px-2 border-b">Metric</th>
                  <th className="py-1.5 px-2 border-b">Metric Value</th>
                  <th className="py-1.5 px-2 border-b">Payout</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} className="border-b hover:bg-gray-50">
                    <td className="py-1.5 px-2">
                      {new Date(i.date).toLocaleDateString()}
                    </td>
                    <td className="py-1.5 px-2 capitalize">{i.scope}</td>
                    <td className="py-1.5 px-2">{i.metricKey}</td>
                    <td className="py-1.5 px-2">{i.metricValue.toFixed(2)}</td>
                    <td className="py-1.5 px-2 font-semibold">
                      ${i.payoutAmount.toFixed(2)}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-3 text-center text-xs text-gray-500"
                    >
                      No incentives found for the last 30 days.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

MeIncentivesPage.title = "My Incentives";

export default MeIncentivesPage;
