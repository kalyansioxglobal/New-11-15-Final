import { useState } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Tier = "A" | "B" | "C" | "D";
type GrowthPotential = "HIGH" | "MEDIUM" | "LOW";
type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

type ShipperMetrics = {
  id: number;
  name: string;
  totalLoads: number;
  totalRevenue: number;
  totalMargin: number;
  avgMargin: number;
  avgMarginPercent: number;
  coverageRate: number;
  avgLoadValue: number;
  tenureDays: number;
  distinctLanes: number;
  equipmentTypes: string[];
  topLanes: { origin: string; dest: string; count: number }[];
  icpScore: number;
  tier: Tier;
  growthPotential: GrowthPotential;
  riskLevel: RiskLevel;
  salesRep: string | null;
  csr: string | null;
};

type IdealProfile = {
  avgMarginPercent: number;
  avgLoadValue: number;
  avgLoadsPerMonth: number;
  avgCoverageRate: number;
  avgTenureDays: number;
  avgLaneDiversity: number;
  topEquipmentTypes: { type: string; count: number }[];
  topLanes: { origin: string; dest: string; count: number }[];
};

type TierSummary = {
  tier: Tier;
  count: number;
  totalRevenue: number;
  avgMargin: number;
  avgLoads: number;
};

type IcpData = {
  shippers: ShipperMetrics[];
  idealProfile: IdealProfile;
  tierSummary: TierSummary[];
  acquisitionTargets: ShipperMetrics[];
  riskRewardMatrix: {
    highValueLowRisk: number;
    highValueHighRisk: number;
    lowValueLowRisk: number;
    lowValueHighRisk: number;
  };
  totals: {
    totalShippers: number;
    totalRevenue: number;
    totalMargin: number;
    avgIcpScore: number;
  };
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function TierBadge({ tier }: { tier: Tier }) {
  const colors: Record<Tier, string> = {
    A: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    B: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    C: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    D: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  return (
    <span className={`px-2 py-1 text-xs font-bold rounded ${colors[tier]}`}>
      Tier {tier}
    </span>
  );
}

function GrowthBadge({ potential }: { potential: GrowthPotential }) {
  const colors: Record<GrowthPotential, string> = {
    HIGH: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    MEDIUM: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    LOW: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded ${colors[potential]}`}>
      {potential}
    </span>
  );
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const colors: Record<RiskLevel, string> = {
    LOW: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    MEDIUM: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    HIGH: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded ${colors[level]}`}>
      {level}
    </span>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  color = "blue",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: "blue" | "green" | "yellow" | "red" | "purple";
}) {
  const colors = {
    blue: "bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700",
    green: "bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700",
    yellow: "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-700",
    red: "bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-700",
    purple: "bg-purple-50 border-purple-200 dark:bg-purple-900/30 dark:border-purple-700",
  };

  return (
    <div className={`p-4 rounded-lg border ${colors[color]}`}>
      <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

type ActiveTab = "OVERVIEW" | "SEGMENTS" | "TARGETS" | "MATRIX" | "ALL";

export default function ShipperIcpTab() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<ActiveTab>("OVERVIEW");
  const [tierFilter, setTierFilter] = useState<Tier | "ALL">("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading, error } = useSWR<IcpData>(
    session ? "/api/freight/shipper-icp" : null,
    fetcher
  );

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <div className="text-red-600">Error loading ICP data.</div>;
  }

  const { shippers, idealProfile, tierSummary, acquisitionTargets, riskRewardMatrix, totals } = data;

  const filteredShippers = shippers.filter((s) => {
    const matchesTier = tierFilter === "ALL" || s.tier === tierFilter;
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTier && matchesSearch;
  });

  const tabs: { key: ActiveTab; label: string }[] = [
    { key: "OVERVIEW", label: "Ideal Profile" },
    { key: "SEGMENTS", label: "Tier Segments" },
    { key: "TARGETS", label: "Growth Targets" },
    { key: "MATRIX", label: "Risk/Reward" },
    { key: "ALL", label: "All Shippers" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Shippers" value={totals.totalShippers} color="blue" />
        <StatCard title="Total Revenue" value={formatCurrency(totals.totalRevenue)} color="green" />
        <StatCard title="Total Margin" value={formatCurrency(totals.totalMargin)} color="purple" />
        <StatCard title="Avg ICP Score" value={totals.avgIcpScore.toFixed(0)} subtitle="out of 100" color="yellow" />
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "OVERVIEW" && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Your Ideal Shipper Profile</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Based on analysis of your top-performing (Tier A) shippers</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatPercent(idealProfile.avgMarginPercent)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Avg Margin %</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(idealProfile.avgLoadValue)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Avg Load Value</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{idealProfile.avgLoadsPerMonth.toFixed(1)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Loads/Month</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{formatPercent(idealProfile.avgCoverageRate)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Coverage Rate</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{Math.round(idealProfile.avgTenureDays / 30)}mo</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Avg Tenure</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-pink-600 dark:text-pink-400">{idealProfile.avgLaneDiversity.toFixed(1)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Lane Diversity</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Top Equipment Types</h3>
              {idealProfile.topEquipmentTypes.length > 0 ? (
                <ul className="space-y-2">
                  {idealProfile.topEquipmentTypes.map((eq, i) => (
                    <li key={i} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700 dark:text-gray-300">{eq.type}</span>
                      <span className="text-gray-500 dark:text-gray-400">{eq.count} shippers</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No data available</p>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Top Performing Lanes</h3>
              {idealProfile.topLanes.length > 0 ? (
                <ul className="space-y-2">
                  {idealProfile.topLanes.map((lane, i) => (
                    <li key={i} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700 dark:text-gray-300">{lane.origin} → {lane.dest}</span>
                      <span className="text-gray-500 dark:text-gray-400">{lane.count} loads</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No data available</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "SEGMENTS" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {tierSummary.map((tier) => (
              <div
                key={tier.tier}
                className={`p-4 rounded-lg border ${
                  tier.tier === "A" ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700"
                    : tier.tier === "B" ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700"
                    : tier.tier === "C" ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700"
                    : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <TierBadge tier={tier.tier} />
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{tier.count}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Revenue: {formatCurrency(tier.totalRevenue)}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Margin: {formatPercent(tier.avgMargin)}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Loads: {tier.avgLoads.toFixed(1)}</p>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Tier Criteria</h3>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <TierBadge tier="A" />
                <span className="text-gray-700 dark:text-gray-300">ICP Score 80-100: High margin, high volume, excellent coverage, loyal customers</span>
              </div>
              <div className="flex items-start gap-3">
                <TierBadge tier="B" />
                <span className="text-gray-700 dark:text-gray-300">ICP Score 60-79: Good performance, potential for growth with attention</span>
              </div>
              <div className="flex items-start gap-3">
                <TierBadge tier="C" />
                <span className="text-gray-700 dark:text-gray-300">ICP Score 40-59: Average performance, may need re-engagement strategy</span>
              </div>
              <div className="flex items-start gap-3">
                <TierBadge tier="D" />
                <span className="text-gray-700 dark:text-gray-300">ICP Score 0-39: Low value, consider if worth retaining</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "TARGETS" && (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 dark:text-blue-200">Growth Opportunities</h3>
            <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">These Tier B/C shippers show HIGH growth potential - prioritize for upselling</p>
          </div>

          {acquisitionTargets.length > 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Shipper</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">Tier</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">Revenue</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">Loads</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">Margin</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">Growth</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Sales Rep</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {acquisitionTargets.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.name}</td>
                      <td className="px-4 py-3 text-center"><TierBadge tier={s.tier} /></td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{formatCurrency(s.totalRevenue)}</td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{s.totalLoads}</td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{formatPercent(s.avgMarginPercent)}</td>
                      <td className="px-4 py-3 text-center"><GrowthBadge potential={s.growthPotential} /></td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{s.salesRep || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No growth targets identified.</p>
          )}
        </div>
      )}

      {activeTab === "MATRIX" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
            <div className="col-span-2 text-center text-sm text-gray-500 dark:text-gray-400 font-medium">← Low Risk | High Risk →</div>
            <div className="bg-green-100 dark:bg-green-900/40 border-2 border-green-300 dark:border-green-700 rounded-lg p-6 text-center">
              <p className="text-4xl font-bold text-green-700 dark:text-green-300">{riskRewardMatrix.highValueLowRisk}</p>
              <p className="text-sm font-medium text-green-600 dark:text-green-400 mt-2">PROTECT</p>
              <p className="text-xs text-green-500 mt-1">High Value / Low Risk</p>
            </div>
            <div className="bg-yellow-100 dark:bg-yellow-900/40 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg p-6 text-center">
              <p className="text-4xl font-bold text-yellow-700 dark:text-yellow-300">{riskRewardMatrix.highValueHighRisk}</p>
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400 mt-2">RETAIN</p>
              <p className="text-xs text-yellow-500 mt-1">High Value / High Risk</p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/40 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-6 text-center">
              <p className="text-4xl font-bold text-blue-700 dark:text-blue-300">{riskRewardMatrix.lowValueLowRisk}</p>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-2">GROW</p>
              <p className="text-xs text-blue-500 mt-1">Low Value / Low Risk</p>
            </div>
            <div className="bg-red-100 dark:bg-red-900/40 border-2 border-red-300 dark:border-red-700 rounded-lg p-6 text-center">
              <p className="text-4xl font-bold text-red-700 dark:text-red-300">{riskRewardMatrix.lowValueHighRisk}</p>
              <p className="text-sm font-medium text-red-600 dark:text-red-400 mt-2">EVALUATE</p>
              <p className="text-xs text-red-500 mt-1">Low Value / High Risk</p>
            </div>
            <div className="col-span-2 text-center text-sm text-gray-500 dark:text-gray-400 mt-2">↑ High Value | Low Value ↓</div>
          </div>
        </div>
      )}

      {activeTab === "ALL" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 items-center">
            <input
              type="text"
              placeholder="Search shippers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value as Tier | "ALL")}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="ALL">All Tiers</option>
              <option value="A">Tier A</option>
              <option value="B">Tier B</option>
              <option value="C">Tier C</option>
              <option value="D">Tier D</option>
            </select>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Shipper</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">Tier</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">ICP Score</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">Revenue</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">Loads</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">Growth</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredShippers.slice(0, 50).map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.name}</td>
                    <td className="px-4 py-3 text-center"><TierBadge tier={s.tier} /></td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{s.icpScore.toFixed(0)}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{formatCurrency(s.totalRevenue)}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{s.totalLoads}</td>
                    <td className="px-4 py-3 text-center"><GrowthBadge potential={s.growthPotential} /></td>
                    <td className="px-4 py-3 text-center"><RiskBadge level={s.riskLevel} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
