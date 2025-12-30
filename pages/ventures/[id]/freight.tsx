import { Skeleton } from "@/components/ui/Skeleton";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

function FreightKpiPage() {
  const router = useRouter();
  const { id } = router.query;
  const [summary, setSummary] = useState<any | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  useEffect(() => {
    if (!id) return;
    const params = new URLSearchParams({ ventureId: String(id) });
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    fetch(`/api/freight-kpi?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setSummary(d.summary || null);
        setRows(d.rows || []);
      })
      .catch(() => {
        setSummary(null);
        setRows([]);
      });
  }, [id, from, to]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold mb-2">Freight KPIs</h1>

      <div className="flex gap-4 items-end">
        <div>
          <label className="block text-xs font-medium mb-1">From</label>
          <input
            type="date"
            className="border rounded px-2 py-1 text-sm"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">To</label>
          <input
            type="date"
            className="border rounded px-2 py-1 text-sm"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="border rounded p-3">
            <div className="text-xs text-gray-500">Loads In</div>
            <div className="text-xl font-semibold">
              {summary.totalLoadsInbound}
            </div>
          </div>
          <div className="border rounded p-3">
            <div className="text-xs text-gray-500">Loads Covered</div>
            <div className="text-xl font-semibold">
              {summary.totalLoadsCovered}
            </div>
          </div>
          <div className="border rounded p-3">
            <div className="text-xs text-gray-500">Coverage %</div>
            <div
              className={`text-xl font-semibold ${
                summary.lowCoverage ? "text-red-500" : ""
              }`}
            >
              {summary.coverageRate?.toFixed(1)}%
            </div>
          </div>
          <div className="border rounded p-3">
            <div className="text-xs text-gray-500">Margin %</div>
            <div
              className={`text-xl font-semibold ${
                summary.lowMargin ? "text-red-500" : ""
              }`}
            >
              {summary.overallMarginPct?.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <table className="w-full text-sm mt-4 border">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-2 text-left">Date</th>
              <th className="p-2">Loads In</th>
              <th className="p-2">Quoted</th>
              <th className="p-2">Covered</th>
              <th className="p-2">Coverage %</th>
              <th className="p-2">Revenue</th>
              <th className="p-2">Profit</th>
              <th className="p-2">Margin %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const coverage =
                r.loadsInbound > 0
                  ? (r.loadsCovered / r.loadsInbound) * 100
                  : 0;
              return (
                <tr key={r.id} className="border-b">
                  <td className="p-2 text-left">
                    {new Date(r.date).toLocaleDateString()}
                  </td>
                  <td className="p-2">{r.loadsInbound}</td>
                  <td className="p-2">{r.loadsQuoted}</td>
                  <td className="p-2">{r.loadsCovered}</td>
                  <td className="p-2">{coverage.toFixed(1)}%</td>
                  <td className="p-2">${r.totalRevenue?.toFixed(0)}</td>
                  <td className="p-2">${r.totalProfit?.toFixed(0)}</td>
                  <td className="p-2">
                    {r.avgMarginPct ? r.avgMarginPct.toFixed(1) : "0.0"}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {rows.length === 0 && summary === null && (
       <Skeleton className="w-full h-[85vh]" />
       )}

      {rows.length === 0 && summary && (
        <p className="text-gray-500 text-sm">No KPI data found for this date range.</p>
      )}
    </div>
  );
}

FreightKpiPage.title = "Freight KPIs";

export default FreightKpiPage;
