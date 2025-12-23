import { useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { useTestMode } from "@/contexts/TestModeContext";

type ChurnStatus = "ACTIVE" | "AT_RISK" | "CHURNED" | "REACTIVATED" | "NEW";
type RiskLevel = "low" | "medium" | "high" | "critical";

type Venture = {
  id: number;
  name: string;
  type: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type ShipperWithChurn = {
  id: number;
  name: string;
  ventureId: number;
  lastLoadDate: string | null;
  churnStatus: ChurnStatus;
  daysSinceLastLoad: number | null;
  loadCount: number;
  totalRevenue: number;
  avgLoadsPerMonth: number | null;
  loadFrequencyDays: number | null;
  expectedNextLoadDate: string | null;
  churnRiskScore: number | null;
  daysOverdue: number | null;
};

type ChurnSummary = {
  ventureId: number;
  date: string;
  activeCount: number;
  atRiskCount: number;
  churnedCount: number;
  reactivatedCount: number;
  newCount: number;
  retentionRate: number;
  avgRiskScore: number;
  highRiskCount: number;
};

type ActiveTab = "SUMMARY" | "AT_RISK" | "CHURNED" | "HIGH_RISK";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "Never";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Never";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function formatNumber(value: number | null, decimals: number = 1): string {
  if (value === null) return "N/A";
  return value.toFixed(decimals);
}

function getRiskLevel(score: number | null): RiskLevel {
  if (score === null) return "medium";
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function StatusBadge({ status }: { status: ChurnStatus }) {
  const colors: Record<ChurnStatus, string> = {
    ACTIVE: "bg-green-100 text-green-800",
    AT_RISK: "bg-yellow-100 text-yellow-800",
    CHURNED: "bg-red-100 text-red-800",
    REACTIVATED: "bg-blue-100 text-blue-800",
    NEW: "bg-purple-100 text-purple-800",
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status]}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function RiskBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-400 text-xs">N/A</span>;
  
  const level = getRiskLevel(score);
  const colors: Record<RiskLevel, string> = {
    low: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    critical: "bg-red-100 text-red-800",
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[level]}`}>
      {score}%
    </span>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  color: string;
}) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 ${color}`}>
      <div className="text-sm text-gray-500 dark:text-gray-400">{title}</div>
      <div className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{value}</div>
      {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
    </div>
  );
}

function FrequencyLabel({ days }: { days: number | null }) {
  if (days === null) return <span className="text-gray-400">Unknown</span>;
  
  let label: string;
  let colorClass: string;
  
  if (days <= 3) {
    label = "Very High";
    colorClass = "text-green-600";
  } else if (days <= 7) {
    label = "Weekly";
    colorClass = "text-green-500";
  } else if (days <= 14) {
    label = "Bi-weekly";
    colorClass = "text-blue-500";
  } else if (days <= 30) {
    label = "Monthly";
    colorClass = "text-yellow-600";
  } else {
    label = "Infrequent";
    colorClass = "text-orange-600";
  }

  return (
    <span className={`text-sm font-medium ${colorClass}`}>
      {label} ({days.toFixed(0)}d)
    </span>
  );
}

export default function ShipperChurnTab() {
  const { data: session } = useSession();
  const { testMode } = useTestMode();
  const [activeTab, setActiveTab] = useState<ActiveTab>("SUMMARY");
  const [ventureId, setVentureId] = useState<number | null>(null);

  const [summary, setSummary] = useState<ChurnSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [atRiskShippers, setAtRiskShippers] = useState<ShipperWithChurn[]>([]);
  const [atRiskLoading, setAtRiskLoading] = useState(false);

  const [churnedShippers, setChurnedShippers] = useState<ShipperWithChurn[]>([]);
  const [churnedLoading, setChurnedLoading] = useState(false);

  const [highRiskShippers, setHighRiskShippers] = useState<ShipperWithChurn[]>([]);
  const [highRiskLoading, setHighRiskLoading] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const { data: venturesData } = useSWR<Venture[]>(
    `/api/ventures?types=LOGISTICS,TRANSPORT&includeTest=${testMode}`,
    fetcher
  );

  const freightVentures = useMemo(() => venturesData || [], [venturesData]);

  useEffect(() => {
    const user = session?.user as { ventureIds?: number[] } | undefined;
    if (user?.ventureIds?.[0]) {
      setVentureId(user.ventureIds[0]);
    } else if (freightVentures.length > 0 && !ventureId) {
      setVentureId(freightVentures[0].id);
    }
  }, [session, freightVentures, ventureId]);

  const fetchSummary = useCallback(async () => {
    if (!ventureId) return;
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const res = await fetch(`/api/freight/shipper-churn?ventureId=${ventureId}&type=summary&includeTest=${testMode}`);
      if (!res.ok) throw new Error("Failed to fetch summary");
      const data = await res.json();
      setSummary(data);
    } catch (err: unknown) {
      setSummaryError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSummaryLoading(false);
    }
  }, [ventureId, testMode]);

  const fetchAtRisk = useCallback(async () => {
    if (!ventureId) return;
    setAtRiskLoading(true);
    try {
      const res = await fetch(`/api/freight/shipper-churn?ventureId=${ventureId}&type=at-risk&limit=100&includeTest=${testMode}`);
      if (!res.ok) throw new Error("Failed to fetch at-risk shippers");
      const data = await res.json();
      setAtRiskShippers(data.shippers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setAtRiskLoading(false);
    }
  }, [ventureId, testMode]);

  const fetchChurned = useCallback(async () => {
    if (!ventureId) return;
    setChurnedLoading(true);
    try {
      const res = await fetch(`/api/freight/shipper-churn?ventureId=${ventureId}&type=churned&limit=100&includeTest=${testMode}`);
      if (!res.ok) throw new Error("Failed to fetch churned shippers");
      const data = await res.json();
      setChurnedShippers(data.shippers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setChurnedLoading(false);
    }
  }, [ventureId, testMode]);

  const fetchHighRisk = useCallback(async () => {
    if (!ventureId) return;
    setHighRiskLoading(true);
    try {
      const res = await fetch(`/api/freight/shipper-churn?ventureId=${ventureId}&type=high-risk&minRiskScore=60&limit=100&includeTest=${testMode}`);
      if (!res.ok) throw new Error("Failed to fetch high-risk shippers");
      const data = await res.json();
      setHighRiskShippers(data.shippers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setHighRiskLoading(false);
    }
  }, [ventureId, testMode]);

  const handleRefresh = async () => {
    if (!ventureId) return;
    setRefreshing(true);
    try {
      const res = await fetch(`/api/freight/shipper-churn?ventureId=${ventureId}&includeTest=${testMode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh" }),
      });
      if (!res.ok) throw new Error("Failed to refresh");
      await fetchSummary();
      if (activeTab === "AT_RISK") await fetchAtRisk();
      if (activeTab === "CHURNED") await fetchChurned();
      if (activeTab === "HIGH_RISK") await fetchHighRisk();
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (activeTab === "AT_RISK") fetchAtRisk();
    if (activeTab === "CHURNED") fetchChurned();
    if (activeTab === "HIGH_RISK") fetchHighRisk();
  }, [activeTab, fetchAtRisk, fetchChurned, fetchHighRisk]);

  const totalShippers = summary
    ? summary.activeCount + summary.atRiskCount + summary.churnedCount + summary.reactivatedCount + summary.newCount
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {freightVentures.length > 1 && (
            <select
              value={ventureId || ""}
              onChange={(e) => setVentureId(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {freightVentures.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || !ventureId}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {refreshing ? "Calculating..." : "Recalculate Metrics"}
        </button>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {(["SUMMARY", "HIGH_RISK", "AT_RISK", "CHURNED"] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium ${
              activeTab === tab
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            {tab === "SUMMARY" && "Overview"}
            {tab === "HIGH_RISK" && `High Risk (${summary?.highRiskCount ?? 0})`}
            {tab === "AT_RISK" && `At Risk (${summary?.atRiskCount ?? 0})`}
            {tab === "CHURNED" && `Churned (${summary?.churnedCount ?? 0})`}
          </button>
        ))}
      </div>

      {activeTab === "SUMMARY" && (
        <div>
          {summaryLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : summaryError ? (
            <div className="text-center py-8 text-red-500">{summaryError}</div>
          ) : summary ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
                <StatCard title="Total Shippers" value={totalShippers} color="border-gray-500" />
                <StatCard title="Active" value={summary.activeCount} subtitle="Within expected frequency" color="border-green-500" />
                <StatCard title="At Risk" value={summary.atRiskCount} subtitle="Overdue for shipment" color="border-yellow-500" />
                <StatCard title="Churned" value={summary.churnedCount} subtitle="Significantly overdue" color="border-red-500" />
                <StatCard title="Reactivated" value={summary.reactivatedCount} subtitle="Came back from churn" color="border-blue-500" />
                <StatCard title="High Risk" value={summary.highRiskCount} subtitle="Risk score 70+" color="border-orange-500" />
                <StatCard title="Avg Risk Score" value={`${summary.avgRiskScore}%`} subtitle="Across all shippers" color="border-purple-500" />
                <StatCard title="Retention Rate" value={`${summary.retentionRate.toFixed(1)}%`} subtitle="Active / Total" color="border-indigo-500" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Advanced Churn Logic</h3>
                  <div className="space-y-4 text-sm">
                    <div>
                      <div className="font-medium text-gray-700 dark:text-gray-300">Dynamic Thresholds</div>
                      <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Churn thresholds adapt to each shipper&apos;s shipping frequency. 
                        A weekly shipper becomes at-risk faster than a monthly shipper.
                      </p>
                    </div>
                    <div>
                      <div className="font-medium text-gray-700 dark:text-gray-300">Pattern-Based Detection</div>
                      <p className="text-gray-500 dark:text-gray-400 mt-1">
                        The system calculates average loads per month and expected shipping 
                        intervals to predict when a shipper should place their next load.
                      </p>
                    </div>
                    <div>
                      <div className="font-medium text-gray-700 dark:text-gray-300">Risk Scoring (0-100)</div>
                      <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Combines days overdue (40%), volume decline (25%), pattern deviation (20%), 
                        and tenure (15%) into a single predictive score.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Status Definitions</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3">
                      <StatusBadge status="ACTIVE" />
                      <span className="text-gray-700 dark:text-gray-300">Within expected load frequency or recent activity</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status="AT_RISK" />
                      <span className="text-gray-700 dark:text-gray-300">Overdue based on their typical shipping pattern</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status="CHURNED" />
                      <span className="text-gray-700 dark:text-gray-300">Significantly overdue (3x their normal frequency)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status="REACTIVATED" />
                      <span className="text-gray-700 dark:text-gray-300">Previously churned but shipped again</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status="NEW" />
                      <span className="text-gray-700 dark:text-gray-300">Created within last 30 days, no load yet</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">No data available</div>
          )}
        </div>
      )}

      {activeTab === "HIGH_RISK" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-100 dark:border-orange-800">
            <p className="text-sm text-orange-800 dark:text-orange-200">
              Shippers with risk score 60% or higher who haven&apos;t churned yet. These need immediate attention.
            </p>
          </div>
          {highRiskLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : highRiskShippers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No high-risk shippers found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Shipper</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Risk Score</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Load Frequency</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Avg Loads/Month</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Expected Next</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Days Overdue</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total Revenue</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {highRiskShippers.map((shipper) => (
                    <tr key={shipper.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{shipper.name}</td>
                      <td className="px-4 py-3"><RiskBadge score={shipper.churnRiskScore} /></td>
                      <td className="px-4 py-3"><FrequencyLabel days={shipper.loadFrequencyDays} /></td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{formatNumber(shipper.avgLoadsPerMonth)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{formatDate(shipper.expectedNextLoadDate)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-orange-600">{shipper.daysOverdue !== null ? `${shipper.daysOverdue}d` : "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{formatCurrency(shipper.totalRevenue)}</td>
                      <td className="px-4 py-3"><StatusBadge status={shipper.churnStatus} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "AT_RISK" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-100 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Shippers who are overdue based on their typical shipping pattern. Contact them to prevent churn.
            </p>
          </div>
          {atRiskLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : atRiskShippers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No at-risk shippers found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Shipper</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Risk Score</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Load Frequency</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Avg Loads/Month</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Last Load</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Days Inactive</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Lifetime Revenue</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {atRiskShippers.map((shipper) => (
                    <tr key={shipper.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{shipper.name}</td>
                      <td className="px-4 py-3"><RiskBadge score={shipper.churnRiskScore} /></td>
                      <td className="px-4 py-3"><FrequencyLabel days={shipper.loadFrequencyDays} /></td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{formatNumber(shipper.avgLoadsPerMonth)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{formatDate(shipper.lastLoadDate)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-yellow-600">{shipper.daysSinceLastLoad !== null ? `${shipper.daysSinceLastLoad}d` : "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{formatCurrency(shipper.totalRevenue)}</td>
                      <td className="px-4 py-3"><StatusBadge status={shipper.churnStatus} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "CHURNED" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-200">
              Shippers who have churned (significantly overdue). Consider win-back campaigns for high-value accounts.
            </p>
          </div>
          {churnedLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : churnedShippers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No churned shippers found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Shipper</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Risk Score</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Load Frequency</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Avg Loads/Month</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Last Load</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Days Inactive</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Lifetime Revenue</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {churnedShippers.map((shipper) => (
                    <tr key={shipper.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{shipper.name}</td>
                      <td className="px-4 py-3"><RiskBadge score={shipper.churnRiskScore} /></td>
                      <td className="px-4 py-3"><FrequencyLabel days={shipper.loadFrequencyDays} /></td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{formatNumber(shipper.avgLoadsPerMonth)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{formatDate(shipper.lastLoadDate)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-red-600">{shipper.daysSinceLastLoad !== null ? `${shipper.daysSinceLastLoad}d` : "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{formatCurrency(shipper.totalRevenue)}</td>
                      <td className="px-4 py-3"><StatusBadge status={shipper.churnStatus} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
