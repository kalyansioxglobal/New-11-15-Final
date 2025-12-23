import { useState, useEffect } from "react";
import { GetServerSideProps } from "next";
import { getEffectiveUser } from "@/lib/effectiveUser";
import useSWR from "swr";
import Layout from "@/components/Layout";
import PersonalPerformance from "@/components/PersonalPerformance";

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
  const [loadsError, setLoadsError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  
  const { data: loadsData, isLoading: loadsLoading, error: loadsApiError } = useSWR<{ items: Load[]; total: number }>(
    `/api/freight/loads/list?limit=50${statusFilter !== "all" ? `&status=${statusFilter}` : ""}`,
    fetcher,
    { 
      refreshInterval: 30000,
      onError: (err) => setLoadsError("Unable to load freight data"),
    }
  );

  const { data: coverageData, error: coverageApiError } = useSWR<CoverageStats>(
    "/api/freight/coverage-stats",
    fetcher,
    { 
      refreshInterval: 60000,
      onError: () => setStatsError("Unable to load coverage stats"),
    }
  );

  const loads = loadsData?.items || [];
  const stats = coverageData || { totalLoads: 0, coveredLoads: 0, atRiskLoads: 0, lostLoads: 0, coverageRate: 0 };
  const hasError = loadsError || statsError || loadsApiError || coverageApiError;

  const todayLoads = loads.filter((l) => {
    if (!l.pickupDate) return false;
    const pickup = new Date(l.pickupDate);
    const today = new Date();
    return pickup.toDateString() === today.toDateString();
  });

  const atRiskLoads = loads.filter((l) => l.atRiskFlag || l.loadStatus === "AT_RISK");
  const uncoveredLoads = loads.filter((l) => !l.carrier && l.loadStatus !== "LOST" && l.loadStatus !== "CANCELLED");

  const getStatusColor = (status: string, atRisk: boolean) => {
    if (atRisk) return "bg-orange-100 text-orange-700";
    switch (status) {
      case "COVERED": return "bg-green-100 text-green-700";
      case "LOST": return "bg-red-100 text-red-700";
      case "IN_TRANSIT": return "bg-blue-100 text-blue-700";
      case "DELIVERED": return "bg-gray-100 text-gray-700";
      default: return "bg-yellow-100 text-yellow-700";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dispatcher Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Your daily load board and priorities</p>
        </div>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {hasError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-yellow-800 text-sm">
            Some data may not be available. Please refresh or contact support if the issue persists.
          </p>
        </div>
      )}

      <PersonalPerformance />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Today&apos;s Pickups</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{todayLoads.length}</div>
          <div className="text-xs text-gray-400 mt-1">Scheduled for today</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Uncovered Loads</div>
          <div className="text-3xl font-bold text-amber-600 mt-1">{uncoveredLoads.length}</div>
          <div className="text-xs text-gray-400 mt-1">Need carrier assignment</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">At Risk</div>
          <div className="text-3xl font-bold text-orange-600 mt-1">{atRiskLoads.length}</div>
          <div className="text-xs text-gray-400 mt-1">Require attention</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Coverage Rate</div>
          <div className="text-3xl font-bold text-green-600 mt-1">{stats.coverageRate}%</div>
          <div className="text-xs text-gray-400 mt-1">Overall performance</div>
        </div>
      </div>

      {atRiskLoads.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <h2 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
            Priority: At-Risk Loads ({atRiskLoads.length})
          </h2>
          <div className="space-y-2">
            {atRiskLoads.slice(0, 5).map((load) => (
              <div key={load.id} className="bg-white rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">
                    {load.reference || `Load #${load.id}`}
                  </div>
                  <div className="text-sm text-gray-500">
                    {load.pickupCity}, {load.pickupState} → {load.dropCity}, {load.dropState}
                  </div>
                </div>
                <a 
                  href={`/logistics/loads/${load.id}`}
                  className="px-3 py-1 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  View
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Load Board</h2>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
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
          <div className="p-8 text-center text-gray-500">Loading loads...</div>
        ) : loads.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No loads found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
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
              <tbody className="divide-y divide-gray-100">
                {loads.map((load) => (
                  <tr key={load.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {load.reference || `#${load.id}`}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {load.customerName || load.shipperName || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {load.pickupCity && load.dropCity
                        ? `${load.pickupCity}, ${load.pickupState} → ${load.dropCity}, ${load.dropState}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {load.pickupDate ? new Date(load.pickupDate).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {load.carrier ? (
                        <span className="text-gray-900">{load.carrier.name}</span>
                      ) : (
                        <span className="text-amber-600 font-medium">Needs Carrier</span>
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
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
