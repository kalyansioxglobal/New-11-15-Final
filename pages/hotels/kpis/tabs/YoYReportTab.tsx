import { useState, useEffect } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
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
import { Skeleton } from "@/components/ui/Skeleton";

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) {
    throw new Error(`Failed to fetch: ${r.statusText}`);
  }
  return r.json();
});

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

type HotelsResponse = {
  items: HotelProperty[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
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
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 shadow-sm">
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formattedCurrent}</p>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-600 dark:text-gray-500">LY: {formattedLy}</span>
        <ChangeIndicator value={change} isPoints={isPoints} />
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-500 mt-1">{changeLabel}</p>
    </div>
  );
}

type ActiveTab = "MTD" | "YTD";

export default function YoYReportTab() {
  const [selectedHotelId, setSelectedHotelId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("MTD");

  const { data: hotelsData, error: hotelsError, isLoading: hotelsLoading } = useSWR<HotelsResponse>(
    "/api/hospitality/hotels?pageSize=200",
    fetcher
  );

  const apiUrl = selectedHotelId
    ? `/api/hotels/kpi-comparison?hotelId=${selectedHotelId}`
    : null;

  const { data, isLoading, error } = useSWR<KpiComparisonData>(
    selectedHotelId ? apiUrl : null,
    fetcher
  );

  // Debug: Log API response
  useEffect(() => {
    if (data && selectedHotelId) {
      console.log('📊 YoY Report API Response:', {
        mtd: data.mtd,
        ytd: data.ytd,
        dailyTrendCount: data.dailyTrend?.length,
        apiUrl,
      });
    }
  }, [data, selectedHotelId, apiUrl]);

  // Extract hotels array from API response
  const hotels = hotelsData?.items || [];

  // Show toast on errors
  useEffect(() => {
    if (hotelsError) {
      toast.error('Failed to load hotels. Please try again.');
    }
  }, [hotelsError]);

  useEffect(() => {
    if (error) {
      toast.error('Failed to load KPI comparison data. Please try again.');
    }
  }, [error]);

  const currentMonth = new Date().toLocaleString("default", { month: "long" });
  const currentMonthIndex = new Date().getMonth(); // 0 = January, 11 = December
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Year-over-Year Report</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            LYMTD and LYYTD comparison metrics
          </p>
        </div>
        {hotelsLoading ? (
          <Skeleton className="h-10 w-64" />
        ) : (
          <select
            value={selectedHotelId}
            onChange={(e) => setSelectedHotelId(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            disabled={hotelsError || hotels.length === 0}
          >
            <option value="">Select a hotel...</option>
            {hotels.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {!selectedHotelId && (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            Select a hotel to view KPI comparison report
          </p>
        </div>
      )}

      {selectedHotelId && isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </div>
      )}

      {selectedHotelId && error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <div className="text-red-700 dark:text-red-400 font-medium mb-1">Error loading KPI data</div>
          <p className="text-sm text-red-600 dark:text-red-500">{error.message || 'Please try again.'}</p>
        </div>
      )}

      {selectedHotelId && data && (
        <>
          <div className="border-b border-gray-200 dark:border-slate-700">
            <nav className="flex gap-4">
              {(["MTD", "YTD"] as ActiveTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? "border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
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
                  {currentMonthIndex === 0 && (
                    <span className="block mt-1 text-xs text-blue-300 italic">
                      Note: In January, MTD and YTD show the same data since both start from Jan 1st.
                    </span>
                  )}
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
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Rooms Sold</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {data.mtd.roomsSold.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-500">
                    LY: {data.lyMtd.roomsSold.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Rooms Available</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {data.mtd.roomsAvailable.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-500">
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
                  {currentMonthIndex === 0 && (
                    <span className="block mt-1 text-xs text-purple-300 italic">
                      Note: In January, MTD and YTD show the same data since both start from Jan 1st.
                    </span>
                  )}
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
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Rooms Sold</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {data.ytd.roomsSold.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-500">
                    LY: {data.lyYtd.roomsSold.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Rooms Available</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {data.ytd.roomsAvailable.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-500">
                    LY: {data.lyYtd.roomsAvailable.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              30-Day Trend: This Year vs Last Year
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                  Occupancy Comparison
                </h4>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={data.dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" className="dark:stroke-slate-600" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      className="dark:[&>*]:fill-slate-400"
                      tickFormatter={(v) =>
                        new Date(v).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      }
                    />
                    <YAxis
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      className="dark:[&>*]:fill-slate-400"
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #475569",
                        color: "#f1f5f9",
                      }}
                      labelStyle={{ color: "#f1f5f9" }}
                      labelFormatter={(v) =>
                        new Date(v).toLocaleDateString()
                      }
                      formatter={(value: number) => [`${value.toFixed(1)}%`, "Occupancy"]}
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

              <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                  Revenue Comparison
                </h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" className="dark:stroke-slate-600" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      className="dark:[&>*]:fill-slate-400"
                      tickFormatter={(v) =>
                        new Date(v).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      }
                    />
                    <YAxis
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      className="dark:[&>*]:fill-slate-400"
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #475569",
                        color: "#f1f5f9",
                      }}
                      labelStyle={{ color: "#f1f5f9" }}
                      labelFormatter={(v) =>
                        new Date(v).toLocaleDateString()
                      }
                      formatter={(value: number, name: string) => [formatCurrency(value), name]}
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

              <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
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
                        color: "#f1f5f9",
                      }}
                      labelStyle={{ color: "#f1f5f9" }}
                      labelFormatter={(v) =>
                        new Date(v).toLocaleDateString()
                      }
                      formatter={(value: number, name: string) => [formatCurrency(value), name]}
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

              <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
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
                        color: "#f1f5f9",
                      }}
                      labelStyle={{ color: "#f1f5f9" }}
                      labelFormatter={(v) =>
                        new Date(v).toLocaleDateString()
                      }
                      formatter={(value: number, name: string) => [formatCurrency(value), name]}
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
