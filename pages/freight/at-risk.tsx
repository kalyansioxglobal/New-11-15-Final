import { Skeleton } from "@/components/ui/Skeleton";
import { useEffect, useState } from "react";

type LoadRow = {
  id: number;
  reference: string | null;
  pickupCity: string | null;
  pickupState: string | null;
  dropCity: string | null;
  dropState: string | null;
  billAmount: number | null;
  costAmount: number | null;
  marginAmount: number | null;
  marginPercentage: number | null;
  shipper: { id: number; name: string } | null;
  carrier: { id: number; name: string } | null;
  venture: { id: number; name: string } | null;
  pickupDate: string | null;
};

function AtRiskLoadsPage() {
  const [loads, setLoads] = useState<LoadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLoads() {
      try {
        setLoading(true);
        const res = await fetch("/api/freight/loads/list?atRisk=true&limit=100");
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setLoads(data.items);
      } catch (err: any) {
        setError(err.message ?? "Failed to load at-risk loads");
      } finally {
        setLoading(false);
      }
    }
    fetchLoads();
  }, []);

  const formatCurrency = (val: number | null) => {
    if (val == null) return "-";
    return `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercent = (val: number | null) => {
    if (val == null) return "-";
    return `${val.toFixed(1)}%`;
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">At-Risk Loads</h1>
      <p className="text-gray-600 mb-4">
        Loads flagged as at-risk requiring immediate attention.
      </p>

      {loading && <Skeleton className="w-full h-[85vh]" />}
      {error && <div className="text-red-500 mb-2">{error}</div>}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border border-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 border text-left">Reference</th>
                <th className="px-3 py-2 border text-left">Shipper</th>
                <th className="px-3 py-2 border text-left">Carrier</th>
                <th className="px-3 py-2 border text-left">Lane</th>
                <th className="px-3 py-2 border text-left">Pickup</th>
                <th className="px-3 py-2 border text-right">Bill</th>
                <th className="px-3 py-2 border text-right">Cost</th>
                <th className="px-3 py-2 border text-right">Margin</th>
                <th className="px-3 py-2 border text-right">Margin %</th>
                <th className="px-3 py-2 border text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loads.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 border font-medium">
                    {l.reference ?? `#${l.id}`}
                  </td>
                  <td className="px-3 py-2 border">{l.shipper?.name ?? "-"}</td>
                  <td className="px-3 py-2 border">{l.carrier?.name ?? "-"}</td>
                  <td className="px-3 py-2 border">
                    {l.pickupCity && l.dropCity
                      ? `${l.pickupCity}, ${l.pickupState} → ${l.dropCity}, ${l.dropState}`
                      : "-"}
                  </td>
                  <td className="px-3 py-2 border">
                    {l.pickupDate
                      ? new Date(l.pickupDate).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-3 py-2 border text-right">
                    {formatCurrency(l.billAmount)}
                  </td>
                  <td className="px-3 py-2 border text-right">
                    {formatCurrency(l.costAmount)}
                  </td>
                  <td className="px-3 py-2 border text-right">
                    {formatCurrency(l.marginAmount)}
                  </td>
                  <td
                    className={`px-3 py-2 border text-right ${
                      l.marginPercentage != null && l.marginPercentage < 8
                        ? "text-red-600 font-semibold"
                        : ""
                    }`}
                  >
                    {formatPercent(l.marginPercentage)}
                  </td>
                  <td className="px-3 py-2 border text-center">
                    <a
                      href={`/freight/load/${l.id}`}
                      className="text-blue-600 hover:underline mr-2"
                    >
                      View
                    </a>
                  </td>
                </tr>
              ))}
              {loads.length === 0 && (
                <tr>
                  <td className="px-3 py-4 border text-center text-gray-500" colSpan={10}>
                    No at-risk loads found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

AtRiskLoadsPage.title = "At-Risk Loads";

export default AtRiskLoadsPage;
