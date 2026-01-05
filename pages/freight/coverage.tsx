import { useState, useEffect } from "react";
import { useRouter } from "next/router";
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
import { Skeleton } from "@/components/ui/Skeleton";

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

type TabType = "stats" | "war-room";

export default function CoveragePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("stats");
  const [ventureId, setVentureId] = useState<string>("");

  useEffect(() => {
    if (router.query.tab === "war-room") {
      setActiveTab("war-room");
    } else if (router.query.tab === "stats") {
      setActiveTab("stats");
    }
    if (router.query.ventureId) {
      setVentureId(router.query.ventureId as string);
    }
  }, [router.query]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    router.replace(
      { pathname: router.pathname, query: { ...router.query, tab } },
      undefined,
      { shallow: true }
    );
  };

  const statsUrl = `/api/freight/coverage-stats${ventureId ? `?ventureId=${ventureId}` : ""}`;
  const warRoomUrl = `/api/freight/coverage-war-room${ventureId ? `?ventureId=${ventureId}` : ""}`;

  const { data: statsData, error: statsError, isLoading: statsLoading } = useSWR(
    activeTab === "stats" ? statsUrl : null,
    fetcher
  );

  const { data: warRoomData, error: warRoomError, isLoading: warRoomLoading } = useSWR(
    activeTab === "war-room" ? warRoomUrl : null,
    fetcher
  );

  const { data: ventures } = useSWR("/api/ventures?limit=100", fetcher);

  const tabs = [
    { id: "stats" as TabType, label: "Coverage Stats" },
    { id: "war-room" as TabType, label: "War Room" },
  ];

  return (
    <div className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Freight Coverage
          </h1>
          <select
            value={ventureId}
            onChange={(e) => setVentureId(e.target.value)}
            className="border rounded px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">All Ventures</option>
            {ventures?.data?.map((v: any) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>

        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === "stats" && (
          <CoverageStatsTab data={statsData} loading={statsLoading} error={statsError} />
        )}

        {activeTab === "war-room" && (
          <WarRoomTab data={warRoomData} loading={warRoomLoading} error={warRoomError} />
        )}
    </div>
  );
}

function CoverageStatsTab({ data, loading, error }: { data: any; loading: boolean; error: any }) {
  if (loading) return <Skeleton className="w-full h-[85vh]" />;
  if (error) return <ErrorState message="Failed to load coverage stats" />;
  if (!data) return null;

  const { summary, loadsByStatus, topCarriers, dailyCoverage, outreach } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard label="Total Loads" value={summary.totalLoads} />
        <StatCard label="Covered" value={summary.coveredLoads} color="green" />
        <StatCard label="Open" value={summary.openLoads} color="yellow" />
        <StatCard label="At Risk" value={summary.atRiskLoads} color="orange" />
        <StatCard label="Lost" value={summary.lostLoads} color="red" />
        <StatCard label="Coverage Rate" value={`${summary.coverageRate}%`} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">Daily Coverage Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyCoverage?.slice().reverse() || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="covered" stroke="#10b981" name="Covered" />
              <Line type="monotone" dataKey="lost" stroke="#ef4444" name="Lost" />
              <Line type="monotone" dataKey="total" stroke="#6b7280" name="Total" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">Loads by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={loadsByStatus || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">Top Carriers</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-2 dark:text-gray-300">Carrier</th>
                  <th className="text-right py-2 dark:text-gray-300">Loads</th>
                  <th className="text-right py-2 dark:text-gray-300">On-Time %</th>
                </tr>
              </thead>
              <tbody>
                {topCarriers?.map((c: any, i: number) => (
                  <tr key={i} className="border-b dark:border-gray-700">
                    <td className="py-2 dark:text-white">{c.carrierName}</td>
                    <td className="text-right py-2 dark:text-gray-300">{c.loadsCovered}</td>
                    <td className="text-right py-2 dark:text-gray-300">
                      {c.onTimePercentage != null ? `${c.onTimePercentage}%` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">Outreach Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="dark:text-gray-300">Total Contacts</span>
              <span className="font-semibold dark:text-white">{outreach?.totalContacts || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="dark:text-gray-300">Unique Carriers Contacted</span>
              <span className="font-semibold dark:text-white">{outreach?.uniqueCarriersContacted || 0}</span>
            </div>
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2 dark:text-gray-300">Response Breakdown</h4>
              {outreach?.responseBreakdown?.map((r: any, i: number) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="dark:text-gray-400">{r.outcome || "Unknown"}</span>
                  <span className="dark:text-gray-300">{r.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WarRoomTab({ data, loading, error }: { data: any; loading: boolean; error: any }) {
  if (loading) return <Skeleton className="w-full h-[85vh]" />;
  if (error) return <ErrorState message="Failed to load war room data" />;
  if (!data) return null;

  const { summary, loadsNeedingAttention, dispatcherLeaderboard, trends } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total Loads" value={summary.totalLoads} />
        <StatCard label="Covered" value={summary.coveredLoads} color="green" />
        <StatCard label="Open" value={summary.openLoads} color="yellow" />
        <StatCard label="At Risk" value={summary.atRiskLoads} color="orange" />
        <StatCard label="Lost" value={summary.lostLoads} color="red" />
        <StatCard label="Coverage Rate" value={`${summary.coverageRatePct}%`} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">
            Loads Needing Attention ({loadsNeedingAttention?.length || 0})
          </h3>
          <div className="overflow-x-auto max-h-96">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-white dark:bg-gray-800">
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-2 dark:text-gray-300">Ref</th>
                  <th className="text-left py-2 dark:text-gray-300">Shipper</th>
                  <th className="text-left py-2 dark:text-gray-300">Route</th>
                  <th className="text-center py-2 dark:text-gray-300">Status</th>
                  <th className="text-right py-2 dark:text-gray-300">Hrs to PU</th>
                  <th className="text-right py-2 dark:text-gray-300">Contacts</th>
                </tr>
              </thead>
              <tbody>
                {loadsNeedingAttention?.map((load: any) => (
                  <tr
                    key={load.id}
                    className={`border-b dark:border-gray-700 ${
                      load.hoursToPickup < 4
                        ? "bg-red-50 dark:bg-red-900/20"
                        : load.hoursToPickup < 12
                        ? "bg-yellow-50 dark:bg-yellow-900/20"
                        : ""
                    }`}
                  >
                    <td className="py-2 dark:text-white">
                      <a
                        href={`/freight/loads/${load.id}`}
                        className="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {load.reference || `#${load.id}`}
                      </a>
                    </td>
                    <td className="py-2 dark:text-gray-300">{load.shipperName || "-"}</td>
                    <td className="py-2 dark:text-gray-300 text-xs">
                      {load.originCityState} → {load.destCityState}
                    </td>
                    <td className="py-2 text-center">
                      <StatusBadge status={load.status} />
                    </td>
                    <td
                      className={`py-2 text-right font-medium ${
                        load.hoursToPickup < 4
                          ? "text-red-600 dark:text-red-400"
                          : load.hoursToPickup < 12
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "dark:text-gray-300"
                      }`}
                    >
                      {load.hoursToPickup}h
                    </td>
                    <td className="py-2 text-right dark:text-gray-300">{load.carriersContactedCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">Dispatcher Leaderboard</h3>
          <div className="space-y-3">
            {dispatcherLeaderboard?.map((d: any, i: number) => (
              <div
                key={d.userId}
                className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-700"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                      i === 0
                        ? "bg-yellow-400 text-yellow-900"
                        : i === 1
                        ? "bg-gray-300 text-gray-700"
                        : i === 2
                        ? "bg-orange-400 text-orange-900"
                        : "bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="font-medium dark:text-white">{d.userName}</span>
                </div>
                <div className="text-right text-sm">
                  <div className="font-semibold dark:text-white">{d.loadsCovered} covered</div>
                  <div className="text-gray-500 dark:text-gray-400">{d.contactsMade} contacts</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-4 dark:text-white">Coverage Trend (14 Days)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trends?.daily || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="totalLoads" stroke="#6b7280" name="Total" />
            <Line yAxisId="left" type="monotone" dataKey="coveredLoads" stroke="#10b981" name="Covered" />
            <Line yAxisId="right" type="monotone" dataKey="coverageRatePct" stroke="#3b82f6" name="Rate %" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  const colorClasses: Record<string, string> = {
    green: "text-green-600 dark:text-green-400",
    yellow: "text-yellow-600 dark:text-yellow-400",
    orange: "text-orange-600 dark:text-orange-400",
    red: "text-red-600 dark:text-red-400",
    blue: "text-blue-600 dark:text-blue-400",
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-2xl font-bold ${color ? colorClasses[color] : "dark:text-white"}`}>
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    OPEN: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    WORKING: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    MAYBE: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    AT_RISK: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    COVERED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    LOST: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || colors.OPEN}`}>
      {status}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
      {message}
    </div>
  );
}
