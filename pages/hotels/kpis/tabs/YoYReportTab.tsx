import { useState } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type PeriodMetrics = {
  label: string;
  roomsSold: number;
  roomsAvailable: number;
  roomRevenue: number;
  totalRevenue: number;
  occupancyPct: number;
  adr: number;
  revpar: number;
  daysInPeriod: number;
};

type KpiComparisonData = {
  mtd: PeriodMetrics;
  lyMtd: PeriodMetrics;
  ytd: PeriodMetrics;
  lyYtd: PeriodMetrics;
  mtdChange: {
    revenuePct: number;
    occupancyPts: number;
    adrPct: number;
    revparPct: number;
  };
  ytdChange: {
    revenuePct: number;
    occupancyPts: number;
    adrPct: number;
    revparPct: number;
  };
  dailyTrend: {
    date: string;
    occupancy: number;
    lyOccupancy: number | null;
    revenue: number;
    lyRevenue: number | null;
    adr: number;
    lyAdr: number | null;
    revpar: number;
    lyRevpar: number | null;
  }[];
};

type HotelProperty = {
  id: number;
  name: string;
  ventureId: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPct(value: number, decimals = 1) {
  return `${value.toFixed(decimals)}%`;
}

function ChangeIndicator({
  value,
  isPercentage = true,
  isPoints = false,
  inverse = false,
}: {
  value: number;
  isPercentage?: boolean;
  isPoints?: boolean;
  inverse?: boolean;
}) {
  const isPositive = inverse ? value < 0 : value > 0;
  const color = isPositive
    ? "text-green-400"
    : value === 0
    ? "text-gray-400 dark:text-gray-500"
    : "text-red-400";
  const arrow = value > 0 ? "▲" : value < 0 ? "▼" : "–";
  const suffix = isPoints ? " pts" : isPercentage ? "%" : "";

  return (
    <span className={`text-sm font-medium ${color}`}>
      {arrow} {Math.abs(value).toFixed(1)}
      {suffix}
    </span>
  );
}

function MetricCard({
  title,
  current,
  lyValue,
  change,
  format = "currency",
  changeLabel = "vs LY",
  isPoints = false,
}: {
  title: string;
  current: number;
  lyValue: number;
  change: number;
  format?: "currency" | "percent" | "number";
  changeLabel?: string;
  isPoints?: boolean;
}) {
  const formattedCurrent =
    format === "currency"
      ? formatCurrency(current)
      : format === "percent"
      ? formatPct(current)
      : current.toLocaleString();

  const formattedLy =
    format === "currency"
      ? formatCurrency(lyValue)
      : format === "percent"
      ? formatPct(lyValue)
      : lyValue.toLocaleString();

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <p className="text-xs text-slate-400 uppercase tracking-wide">{title}</p>
      <p className="text-2xl font-bold text-white mt-1">{formattedCurrent}</p>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-slate-500">LY: {formattedLy}</span>
        <ChangeIndicator value={change} isPoints={isPoints} />
      </div>
      <p className="text-xs text-slate-500 mt-1">{changeLabel}</p>
    </div>
  );
}

type ActiveTab = "MTD" | "YTD";

export default function YoYReportTab() {
  const { status } = useSession();
  const [selectedHotelId, setSelectedHotelId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("MTD");

  const { data: hotels } = useSWR<HotelProperty[]>(
    "/api/hospitality/hotels",
    fetcher
  );

  const apiUrl = selectedHotelId
    ? `/api/hotels/kpi-comparison?hotelId=${selectedHotelId}`
    : null;

  const { data, isLoading, error } = useSWR<KpiComparisonData>(
    selectedHotelId ? apiUrl : null,
    fetcher
  );

  if (status === "loading") {
    return (
      <div className="p-6 text-slate-300">Loading...</div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="p-6 text-slate-300">Please sign in to view hotel KPI reports.</div>
    );
  }

  const currentMonth = new Date().toLocaleString("default", { month: "long" });
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Year-over-Year Report</h2>
          <p className="text-slate-400 text-sm mt-1">
            LYMTD and LYYTD comparison metrics
          </p>
        </div>
        <select
          value={selectedHotelId}
          onChange={(e) => setSelectedHotelId(e.target.value)}
          className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-200"
        >
          <option value="">Select a hotel...</option>
          {hotels?.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </div>

      {!selectedHotelId && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 text-center">
          <p className="text-slate-400">
            Select a hotel to view KPI comparison report
          </p>
        </div>
      )}

      {selectedHotelId && isLoading && (
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-28 bg-slate-700 rounded-lg"
              ></div>
            ))}
          </div>
        </div>
      )}

      {selectedHotelId && error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300">
          Error loading KPI data
        </div>
      )}

      {selectedHotelId && data && (
        <>
          <div className="border-b border-slate-700">
            <nav className="flex gap-4">
              {(["MTD", "YTD"] as ActiveTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? "border-blue-500 text-blue-400"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tab === "MTD"
                    ? `${currentMonth} MTD vs LYMTD`
                    : `${currentYear} YTD vs LYYTD`}
                </button>
              ))}
            </nav>
          </div>

          {activeTab === "MTD" && (
            <div className="space-y-6">
              <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-blue-300">
                  {currentMonth} {currentYear} Month-to-Date vs Last Year
                </h2>
                <p className="text-sm text-blue-400 mt-1">
                  Comparing {data.mtd.daysInPeriod} days this year to{" "}
                  {data.lyMtd.daysInPeriod} days last year
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                  title="Room Revenue"
                  current={data.mtd.roomRevenue}
                  lyValue={data.lyMtd.roomRevenue}
                  change={data.mtdChange.revenuePct}
                  format="currency"
                  changeLabel="vs LYMTD"
                />
                <MetricCard
                  title="Occupancy"
                  current={data.mtd.occupancyPct}
                  lyValue={data.lyMtd.occupancyPct}
                  change={data.mtdChange.occupancyPts}
                  format="percent"
                  changeLabel="vs LYMTD"
                  isPoints
                />
                <MetricCard
                  title="ADR"
                  current={data.mtd.adr}
                  lyValue={data.lyMtd.adr}
                  change={data.mtdChange.adrPct}
                  format="currency"
                  changeLabel="vs LYMTD"
                />
                <MetricCard
                  title="RevPAR"
                  current={data.mtd.revpar}
                  lyValue={data.lyMtd.revpar}
                  change={data.mtdChange.revparPct}
                  format="currency"
                  changeLabel="vs LYMTD"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                  <p className="text-xs text-slate-400 mb-1">Rooms Sold</p>
                  <p className="text-xl font-bold text-white">
                    {data.mtd.roomsSold.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500">
                    LY: {data.lyMtd.roomsSold.toLocaleString()}
                  </p>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                  <p className="text-xs text-slate-400 mb-1">Rooms Available</p>
                  <p className="text-xl font-bold text-white">
                    {data.mtd.roomsAvailable.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500">
                    LY: {data.lyMtd.roomsAvailable.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "YTD" && (
            <div className="space-y-6">
              <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-purple-300">
                  {currentYear} Year-to-Date vs Last Year
                </h2>
                <p className="text-sm text-purple-400 mt-1">
                  Comparing {data.ytd.daysInPeriod} days this year to{" "}
                  {data.lyYtd.daysInPeriod} days last year
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                  title="Room Revenue"
                  current={data.ytd.roomRevenue}
                  lyValue={data.lyYtd.roomRevenue}
                  change={data.ytdChange.revenuePct}
                  format="currency"
                  changeLabel="vs LYYTD"
                />
                <MetricCard
                  title="Occupancy"
                  current={data.ytd.occupancyPct}
                  lyValue={data.lyYtd.occupancyPct}
                  change={data.ytdChange.occupancyPts}
                  format="percent"
                  changeLabel="vs LYYTD"
                  isPoints
                />
                <MetricCard
                  title="ADR"
                  current={data.ytd.adr}
                  lyValue={data.lyYtd.adr}
                  change={data.ytdChange.adrPct}
                  format="currency"
                  changeLabel="vs LYYTD"
                />
                <MetricCard
                  title="RevPAR"
                  current={data.ytd.revpar}
                  lyValue={data.lyYtd.revpar}
                  change={data.ytdChange.revparPct}
                  format="currency"
                  changeLabel="vs LYYTD"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                  <p className="text-xs text-slate-400 mb-1">Rooms Sold</p>
                  <p className="text-xl font-bold text-white">
                    {data.ytd.roomsSold.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500">
                    LY: {data.lyYtd.roomsSold.toLocaleString()}
                  </p>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                  <p className="text-xs text-slate-400 mb-1">Rooms Available</p>
                  <p className="text-xl font-bold text-white">
                    {data.ytd.roomsAvailable.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500">
                    LY: {data.lyYtd.roomsAvailable.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">
              30-Day Trend: This Year vs Last Year
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-slate-300 mb-4">
                  Occupancy Comparison
                </h4>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={data.dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      tickFormatter={(v) =>
                        new Date(v).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      }
                    />
                    <YAxis
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #475569",
                      }}
                      labelFormatter={(v) =>
                        new Date(v).toLocaleDateString()
                      }
                      formatter={(value: number) => [`${value.toFixed(1)}%`]}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="occupancy"
                      name="This Year"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="lyOccupancy"
                      name="Last Year"
                      stroke="#94a3b8"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-slate-300 mb-4">
                  Revenue Comparison
                </h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      tickFormatter={(v) =>
                        new Date(v).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      }
                    />
                    <YAxis
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #475569",
                      }}
                      labelFormatter={(v) =>
                        new Date(v).toLocaleDateString()
                      }
                      formatter={(value: number) => [formatCurrency(value)]}
                    />
                    <Legend />
                    <Bar
                      dataKey="revenue"
                      name="This Year"
                      fill="#22c55e"
                      radius={[2, 2, 0, 0]}
                    />
                    <Bar
                      dataKey="lyRevenue"
                      name="Last Year"
                      fill="#64748b"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-slate-300 mb-4">
                  ADR Comparison
                </h4>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={data.dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      tickFormatter={(v) =>
                        new Date(v).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      }
                    />
                    <YAxis
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #475569",
                      }}
                      labelFormatter={(v) =>
                        new Date(v).toLocaleDateString()
                      }
                      formatter={(value: number) => [formatCurrency(value)]}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="adr"
                      name="This Year"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="lyAdr"
                      name="Last Year"
                      stroke="#94a3b8"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-slate-300 mb-4">
                  RevPAR Comparison
                </h4>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={data.dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      tickFormatter={(v) =>
                        new Date(v).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      }
                    />
                    <YAxis
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #475569",
                      }}
                      labelFormatter={(v) =>
                        new Date(v).toLocaleDateString()
                      }
                      formatter={(value: number) => [formatCurrency(value)]}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revpar"
                      name="This Year"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="lyRevpar"
                      name="Last Year"
                      stroke="#94a3b8"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
