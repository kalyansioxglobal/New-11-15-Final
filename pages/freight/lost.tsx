import { useEffect, useState } from "react";

type LostRow = {
  id: number;
  reference: string | null;
  pickupCity: string | null;
  pickupState: string | null;
  dropCity: string | null;
  dropState: string | null;
  marginAmount: number | null;
  lostAt: string | null;
  lostReasonRef?: { id: number; name: string; category: string | null } | null;
  shipper: { id: number; name: string } | null;
  venture: { id: number; name: string } | null;
};

function LostLoadsPage() {
  const [loads, setLoads] = useState<LostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLoads() {
      try {
        setLoading(true);
        const res = await fetch("/api/freight/loads/list?lost=true&limit=100");
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setLoads(data.items);
      } catch (err: any) {
        setError(err.message ?? "Failed to load lost loads");
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

  const totalLostMargin = loads.reduce((sum, l) => sum + (l.marginAmount ?? 0), 0);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Lost Loads</h1>
      <p className="text-gray-600 mb-4">
        Historical record of loads that were lost. Total margin lost:{" "}
        <span className="text-red-600 font-semibold">{formatCurrency(totalLostMargin)}</span>
      </p>

      {loading && <div className="text-gray-500">Loading...</div>}
      {error && <div className="text-red-500 mb-2">{error}</div>}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border border-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 border text-left">Reference</th>
                <th className="px-3 py-2 border text-left">Shipper</th>
                <th className="px-3 py-2 border text-left">Lane</th>
                <th className="px-3 py-2 border text-right">Margin Lost</th>
                <th className="px-3 py-2 border text-left">Lost Reason</th>
                <th className="px-3 py-2 border text-left">Lost At</th>
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
                  <td className="px-3 py-2 border">
                    {l.pickupCity && l.dropCity
                      ? `${l.pickupCity}, ${l.pickupState} → ${l.dropCity}, ${l.dropState}`
                      : "-"}
                  </td>
                  <td className="px-3 py-2 border text-right text-red-600">
                    {formatCurrency(l.marginAmount)}
                  </td>
                  <td className="px-3 py-2 border">
                    {l.lostReasonRef?.name ?? "-"}
                    {l.lostReasonRef?.category && (
                      <span className="text-gray-400 text-xs ml-1">
                        ({l.lostReasonRef.category})
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 border">
                    {l.lostAt ? new Date(l.lostAt).toLocaleString() : "-"}
                  </td>
                  <td className="px-3 py-2 border text-center">
                    <a
                      href={`/freight/load/${l.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      View
                    </a>
                  </td>
                </tr>
              ))}
              {loads.length === 0 && (
                <tr>
                  <td className="px-3 py-4 border text-center text-gray-500" colSpan={7}>
                    No lost loads found.
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

LostLoadsPage.title = "Lost Loads";

export default LostLoadsPage;
