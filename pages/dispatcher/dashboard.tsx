import { useState, useEffect } from "react";
import { GetServerSideProps } from "next";
import { getEffectiveUser } from "@/lib/effectiveUser";
import useSWR from "swr";
import Layout from "@/components/Layout";
import PersonalPerformance from "@/components/PersonalPerformance";
import { Skeleton } from "@/components/ui/Skeleton";
import toast from "react-hot-toast";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Load = {
  id: number;
  reference: string | null;
  shipperName: string | null;
  customerName: string | null;
  pickupCity: string | null;
  pickupState: string | null;
  dropCity: string | null;
  dropState: string | null;
  pickupDate: string | null;
  loadStatus: string;
  atRiskFlag: boolean;
  carrier: { id: number; name: string; mcNumber: string } | null;
  venture: { id: number; name: string } | null;
};

type CoverageStats = {
  totalLoads: number;
  coveredLoads: number;
  atRiskLoads: number;
  lostLoads: number;
  coverageRate: number;
};

export default function DispatcherDashboard() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cursor, setCursor] = useState<string | null>(null);
  const [pageSize] = useState(50);
  
  const { data: loadsData, isLoading: loadsLoading, error: loadsApiError } = useSWR<{ 
    items: Load[]; 
    nextCursor: string | null;
    hasMore: boolean;
  }>(
    `/api/freight/loads/list?limit=${pageSize}${statusFilter !== "all" ? `&status=${statusFilter}` : ""}${cursor ? `&cursor=${cursor}` : ""}`,
    fetcher,
    { 
      refreshInterval: 30000,
      onError: (err) => {
        toast.error("Unable to load freight data");
      },
    }
  );

  const { data: coverageData, error: coverageApiError } = useSWR<CoverageStats>(
    "/api/freight/coverage-stats",
    fetcher,
    { 
      refreshInterval: 60000,
      onError: () => {
        toast.error("Unable to load coverage stats");
      },
    }
  );

  const loads = loadsData?.items || [];
  const stats = coverageData || { totalLoads: 0, coveredLoads: 0, atRiskLoads: 0, lostLoads: 0, coverageRate: 0 };
  const hasMore = loadsData?.hasMore || false;
  const nextCursor = loadsData?.nextCursor || null;

  // Reset cursor when filter changes
  useEffect(() => {
    setCursor(null);
  }, [statusFilter]);

  // Show error toast if API errors occur
  useEffect(() => {
    if (loadsApiError) {
      toast.error("Failed to load loads. Please refresh the page.");
    }
    if (coverageApiError) {
      toast.error("Failed to load coverage stats. Some metrics may be unavailable.");
    }
  }, [loadsApiError, coverageApiError]);

  const todayLoads = loads.filter((l) => {
    if (!l.pickupDate) return false;
    const pickup = new Date(l.pickupDate);
    const today = new Date();
    return pickup.toDateString() === today.toDateString();
  });

  const atRiskLoads = loads.filter((l) => l.atRiskFlag || l.loadStatus === "AT_RISK");
  const uncoveredLoads = loads.filter((l) => !l.carrier && l.loadStatus !== "LOST" && l.loadStatus !== "CANCELLED");

  const getStatusColor = (status: string, atRisk: boolean) => {
    if (atRisk) return "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800";
    switch (status) {
      case "COVERED": return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800";
      case "LOST": return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800";
      case "IN_TRANSIT": return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800";
      case "DELIVERED": return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600";
      default: return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800";
    }
  };

  return (
    <div className="p-6 space-y-6 dark:bg-gray-900 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Dispatcher Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your daily load board and priorities</p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      <PersonalPerformance />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <div className="text-sm text-gray-500 dark:text-gray-400">Today&apos;s Pickups</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{todayLoads.length}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">Scheduled for today</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <div className="text-sm text-gray-500 dark:text-gray-400">Uncovered Loads</div>
          <div className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-1">{uncoveredLoads.length}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">Need carrier assignment</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <div className="text-sm text-gray-500 dark:text-gray-400">At Risk</div>
          <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-1">{atRiskLoads.length}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">Require attention</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <div className="text-sm text-gray-500 dark:text-gray-400">Coverage Rate</div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.coverageRate}%</div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">Overall performance</div>
        </div>
      </div>

      {atRiskLoads.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
          <h2 className="font-semibold text-orange-800 dark:text-orange-300 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-orange-500 dark:bg-orange-400 rounded-full animate-pulse"></span>
            Priority: At-Risk Loads ({atRiskLoads.length})
          </h2>
          <div className="space-y-2">
            {atRiskLoads.slice(0, 5).map((load) => (
              <div key={load.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 flex items-center justify-between border border-gray-200 dark:border-gray-700">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {load.reference || `Load #${load.id}`}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {load.pickupCity}, {load.pickupState} → {load.dropCity}, {load.dropState}
                  </div>
                </div>
                <a 
                  href={`/logistics/loads/${load.id}`}
                  className="px-3 py-1 text-sm bg-orange-600 dark:bg-orange-700 text-white rounded-lg hover:bg-orange-700 dark:hover:bg-orange-800 transition-colors"
                >
                  View
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-white">Load Board</h2>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
          >
            <option value="all">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="COVERED">Covered</option>
            <option value="AT_RISK">At Risk</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="DELIVERED">Delivered</option>
            <option value="LOST">Lost</option>
          </select>
        </div>
        
        {loadsLoading ? (
          <Skeleton className="w-full h-full" />
        ) : loads.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">No loads found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Reference</th>
                    <th className="px-4 py-3 text-left font-medium">Customer</th>
                    <th className="px-4 py-3 text-left font-medium">Route</th>
                    <th className="px-4 py-3 text-left font-medium">Pickup</th>
                    <th className="px-4 py-3 text-left font-medium">Carrier</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {loads.map((load) => (
                    <tr key={load.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {load.reference || `#${load.id}`}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        {load.customerName || load.shipperName || "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        {load.pickupCity && load.dropCity
                          ? `${load.pickupCity}, ${load.pickupState} → ${load.dropCity}, ${load.dropState}`
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        {load.pickupDate ? new Date(load.pickupDate).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 py-3">
                        {load.carrier ? (
                          <span className="text-gray-900 dark:text-white">{load.carrier.name}</span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">Needs Carrier</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(load.loadStatus, load.atRiskFlag)}`}>
                          {load.atRiskFlag ? "AT RISK" : load.loadStatus.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={`/logistics/loads/${load.id}`}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium transition-colors"
                        >
                          View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination Controls */}
            {(cursor || hasMore) && (
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {loads.length} load{loads.length !== 1 ? "s" : ""}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCursor(null)}
                    disabled={!cursor}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition ${
                      !cursor
                        ? "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                        : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    First Page
                  </button>
                  <button
                    onClick={() => {
                      if (loads.length > 0) {
                        const lastLoadId = loads[loads.length - 1].id;
                        setCursor(String(lastLoadId));
                      }
                    }}
                    disabled={!hasMore}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition ${
                      !hasMore
                        ? "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                        : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    Load More
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const user = await getEffectiveUser(ctx.req, ctx.res);

  if (!user) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  const allowedRoles = ["DISPATCHER", "CSR", "CEO", "ADMIN", "COO", "VENTURE_HEAD", "TEAM_LEAD"];
  if (!allowedRoles.includes(user.role)) {
    return { redirect: { destination: "/overview", permanent: false } };
  }

  return { props: {} };
};

DispatcherDashboard.getLayout = (page: React.ReactElement) => <Layout>{page}</Layout>;
DispatcherDashboard.title = "Dispatcher Dashboard";
