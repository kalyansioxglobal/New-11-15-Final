import { useEffect, useState } from "react";
import Head from "next/head";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useTestMode } from "@/contexts/TestModeContext";

type PnlItem = {
  id: number;
  ventureId: number;
  officeId: number | null;
  completionDate: string | null;
  revenue: number;
  cost: number;
  margin: number;
  customerId: number | null;
  isTest: boolean;
};

type FreightPnlResponse = {
  from: string;
  to: string;
  items: PnlItem[];
  totalRevenue: number;
  totalCost: number;
  totalMargin: number;
  count: number;
};

type Venture = {
  id: number;
  name: string;
};

export default function FreightPnlPage() {
  const { loading: roleLoading, authorized } = useRoleGuard();
  const { testMode } = useTestMode();
  const [from, setFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FreightPnlResponse | null>(null);
  const [ventures, setVentures] = useState<Venture[]>([]);
  const [ventureId, setVentureId] = useState<number | null>(null);
  const [venturesLoading, setVenturesLoading] = useState(true);

  useEffect(() => {
    setVenturesLoading(true);
    fetch(`/api/ventures?types=LOGISTICS,TRANSPORT&includeTest=${testMode}`)
      .then((r) => r.json())
      .then((data) => {
        setVentures(data);
        if (data.length > 0 && !ventureId) {
          setVentureId(data[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setVenturesLoading(false));
  }, [testMode]);

  const load = async () => {
    if (!ventureId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      params.set("ventureId", String(ventureId));
      const res = await fetch(`/api/logistics/freight-pnl?${params.toString()}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ventureId) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ventureId]);

  const formatMoney = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  const formatPct = (n: number) => `${n.toFixed(1)}%`;

  if (roleLoading) {
    return <div className="p-6 text-gray-500">Loading...</div>;
  }
  if (!authorized) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Freight P&L Dashboard</title>
      </Head>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold">Freight P&L Dashboard</h1>
            <p className="text-sm text-gray-400">
              Loads from your TMS, profit & margin in one place.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1">Venture</label>
              <select
                value={ventureId ?? ""}
                onChange={(e) => setVentureId(Number(e.target.value))}
                disabled={venturesLoading || ventures.length === 0}
                className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[160px]"
              >
                {venturesLoading && <option value="">Loading...</option>}
                {!venturesLoading && ventures.length === 0 && (
                  <option value="">No ventures available</option>
                )}
                {ventures.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1">From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={load}
              disabled={!ventureId}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading && <div className="text-gray-500">Loading P&amp;L…</div>}
        {!loading && !data && (
          <div className="text-red-500 text-sm">Failed to load P&amp;L data.</div>
        )}
        {!loading && data && (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <SummaryCard
                label="Total Revenue"
                value={formatMoney(data.totalRevenue)}
              />
              <SummaryCard
                label="Total Cost"
                value={formatMoney(data.totalCost)}
              />
              <SummaryCard
                label="Total Margin"
                value={formatMoney(data.totalMargin)}
              />
              <SummaryCard
                label="Delivered Loads"
                value={data.count.toLocaleString()}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SummaryCard
                label="Margin %"
                value={data.totalRevenue > 0 ? formatPct((data.totalMargin / data.totalRevenue) * 100) : "0.0%"}
              />
              <SummaryCard
                label="Avg Margin / Load"
                value={data.count > 0 ? formatMoney(data.totalMargin / data.count) : "$0"}
              />
              <SummaryCard
                label="Avg Revenue / Load"
                value={data.count > 0 ? formatMoney(data.totalRevenue / data.count) : "$0"}
              />
            </div>

            {/* Load Details */}
            <section>
              <h2 className="text-lg font-semibold mb-2">Delivered Loads</h2>
              <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">Load ID</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">Delivery Date</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-600">Revenue</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-600">Cost</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-600">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.slice(0, 50).map((item) => (
                      <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <a href={`/freight/loads/${item.id}`} className="text-blue-600 hover:underline">
                            #{item.id}
                          </a>
                        </td>
                        <td className="px-4 py-2">
                          {item.completionDate
                            ? new Date(item.completionDate).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="px-4 py-2 text-right">{formatMoney(item.revenue)}</td>
                        <td className="px-4 py-2 text-right">{formatMoney(item.cost)}</td>
                        <td className="px-4 py-2 text-right">
                          <span className={item.margin >= 0 ? "text-green-600" : "text-red-600"}>
                            {formatMoney(item.margin)}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {data.items.length === 0 && (
                      <tr>
                        <td className="px-4 py-4 text-center text-gray-500" colSpan={5}>
                          {'No delivered loads in this date range. P&L data comes from loads with status "DELIVERED".'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {data.items.length > 50 && (
                <p className="text-sm text-gray-500 mt-2">
                  Showing first 50 of {data.count} loads.
                </p>
              )}
            </section>
          </div>
        )}
      </div>
    </>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-gray-500">{label}</span>
      <span className="text-xl font-semibold text-gray-800">{value}</span>
    </div>
  );
}
