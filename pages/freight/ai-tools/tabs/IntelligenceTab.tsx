import { useState, useEffect } from "react";
import { useTestMode } from "@/contexts/TestModeContext";

type LaneRiskData = {
  laneId: string;
  origin: string;
  destination: string;
  score: number;
  riskLevel: "low" | "medium" | "high";
  loads: number;
  avgMargin: number;
  signals: {
    demandSignal: number;
    pricingSignal: number;
    reliabilityRisk: number;
    competitionSignal: number;
  };
};

type CsrPerformanceData = {
  aliasId: number;
  userId: number | null;
  name: string;
  score: number;
  loadsSecured: number;
  totalQuotes: number;
  avgMargin: number;
  strengths: string[];
  weaknesses: string[];
};

type ShipperHealthData = {
  shipperId: number;
  name: string;
  score: number;
  riskLevel: "green" | "yellow" | "red";
  contributingFactors: {
    marginSignal: number;
    volumeSignal: number;
    responseSignal: number;
    retentionSignal: number;
    reliabilityPenalty: number;
  };
};

export default function IntelligenceTab() {
  const { testMode } = useTestMode();
  const [loading, setLoading] = useState(true);
  const [subtab, setSubtab] = useState<"lanes" | "csrs" | "shippers">("lanes");
  
  const [laneRisks, setLaneRisks] = useState<LaneRiskData[]>([]);
  const [csrPerformance, setCsrPerformance] = useState<CsrPerformanceData[]>([]);
  const [shipperHealth, setShipperHealth] = useState<ShipperHealthData[]>([]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/freight/intelligence?includeTest=${testMode}`);
        if (res.ok) {
          const data = await res.json();
          setLaneRisks(data.laneRisks || []);
          setCsrPerformance(data.csrPerformance || []);
          setShipperHealth(data.shipperHealth || []);
        }
      } catch (e) {
        console.error("Failed to load intelligence data", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [testMode]);

  const getRiskColor = (level: string) => {
    switch (level) {
      case "high":
      case "red":
        return "bg-red-100 text-red-800";
      case "medium":
      case "yellow":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-green-100 text-green-800";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Freight Intelligence</h2>
        <p className="text-sm text-gray-500 mt-1">
          AI-powered analytics for lane risk, CSR performance, and shipper health
        </p>
      </div>

      <div className="flex gap-2 border-b">
        <button
          onClick={() => setSubtab("lanes")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            subtab === "lanes"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Lane Risk Analysis
        </button>
        <button
          onClick={() => setSubtab("csrs")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            subtab === "csrs"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          CSR Performance
        </button>
        <button
          onClick={() => setSubtab("shippers")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            subtab === "shippers"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Shipper Health
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <>
          {subtab === "lanes" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg border p-4">
                  <div className="text-sm text-gray-500">Total Lanes Analyzed</div>
                  <div className="text-2xl font-bold">{laneRisks.length}</div>
                </div>
                <div className="bg-white rounded-lg border p-4">
                  <div className="text-sm text-gray-500">High Risk Lanes</div>
                  <div className="text-2xl font-bold text-red-600">
                    {laneRisks.filter((l) => l.riskLevel === "high").length}
                  </div>
                </div>
                <div className="bg-white rounded-lg border p-4">
                  <div className="text-sm text-gray-500">Avg Risk Score</div>
                  <div className="text-2xl font-bold">
                    {laneRisks.length > 0
                      ? Math.round(laneRisks.reduce((s, l) => s + l.score, 0) / laneRisks.length)
                      : 0}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Lane</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Risk Score</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Level</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Loads</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Avg Margin</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Signals</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {laneRisks.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                          No lane data available. Load more freight data to see analysis.
                        </td>
                      </tr>
                    ) : (
                      laneRisks.map((lane) => (
                        <tr key={lane.laneId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">
                            {lane.origin} → {lane.destination}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-bold ${getScoreColor(100 - lane.score)}`}>
                              {lane.score}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(lane.riskLevel)}`}>
                              {lane.riskLevel}
                            </span>
                          </td>
                          <td className="px-4 py-3">{lane.loads}</td>
                          <td className="px-4 py-3">${lane.avgMargin.toFixed(0)}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            D:{lane.signals.demandSignal} P:{lane.signals.pricingSignal} R:{lane.signals.reliabilityRisk} C:{lane.signals.competitionSignal}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {subtab === "csrs" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg border p-4">
                  <div className="text-sm text-gray-500">CSRs Tracked</div>
                  <div className="text-2xl font-bold">{csrPerformance.length}</div>
                </div>
                <div className="bg-white rounded-lg border p-4">
                  <div className="text-sm text-gray-500">Top Performer Score</div>
                  <div className="text-2xl font-bold text-green-600">
                    {csrPerformance.length > 0
                      ? Math.max(...csrPerformance.map((c) => c.score))
                      : 0}
                  </div>
                </div>
                <div className="bg-white rounded-lg border p-4">
                  <div className="text-sm text-gray-500">Avg Performance</div>
                  <div className="text-2xl font-bold">
                    {csrPerformance.length > 0
                      ? Math.round(csrPerformance.reduce((s, c) => s + c.score, 0) / csrPerformance.length)
                      : 0}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">CSR Name</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Score</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Loads</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Quotes</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Avg Margin</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Strengths</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Areas to Improve</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {csrPerformance.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                          No CSR data available. Assign CSRs to loads to see performance.
                        </td>
                      </tr>
                    ) : (
                      csrPerformance.map((csr) => (
                        <tr key={csr.aliasId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{csr.name}</td>
                          <td className="px-4 py-3">
                            <span className={`font-bold ${getScoreColor(csr.score)}`}>
                              {csr.score}
                            </span>
                          </td>
                          <td className="px-4 py-3">{csr.loadsSecured}</td>
                          <td className="px-4 py-3">{csr.totalQuotes}</td>
                          <td className="px-4 py-3">${csr.avgMargin.toFixed(0)}</td>
                          <td className="px-4 py-3 text-xs text-green-600">
                            {csr.strengths.slice(0, 2).join(", ") || "-"}
                          </td>
                          <td className="px-4 py-3 text-xs text-orange-600">
                            {csr.weaknesses.slice(0, 2).join(", ") || "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {subtab === "shippers" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg border p-4">
                  <div className="text-sm text-gray-500">Shippers Analyzed</div>
                  <div className="text-2xl font-bold">{shipperHealth.length}</div>
                </div>
                <div className="bg-white rounded-lg border p-4">
                  <div className="text-sm text-gray-500">At-Risk Shippers</div>
                  <div className="text-2xl font-bold text-red-600">
                    {shipperHealth.filter((s) => s.riskLevel === "red").length}
                  </div>
                </div>
                <div className="bg-white rounded-lg border p-4">
                  <div className="text-sm text-gray-500">Healthy Shippers</div>
                  <div className="text-2xl font-bold text-green-600">
                    {shipperHealth.filter((s) => s.riskLevel === "green").length}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Shipper</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Health Score</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Margin</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Volume</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Retention</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {shipperHealth.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                          No shipper health data available. Add more loads to see analysis.
                        </td>
                      </tr>
                    ) : (
                      shipperHealth.map((shipper) => (
                        <tr key={shipper.shipperId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{shipper.name}</td>
                          <td className="px-4 py-3">
                            <span className={`font-bold ${getScoreColor(shipper.score)}`}>
                              {shipper.score}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(shipper.riskLevel)}`}>
                              {shipper.riskLevel}
                            </span>
                          </td>
                          <td className="px-4 py-3">{shipper.contributingFactors.marginSignal}%</td>
                          <td className="px-4 py-3">{shipper.contributingFactors.volumeSignal}%</td>
                          <td className="px-4 py-3">{shipper.contributingFactors.retentionSignal}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
