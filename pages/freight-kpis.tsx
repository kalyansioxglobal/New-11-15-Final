import { useEffect, useState } from "react";
import Link from "next/link";
import { useTestMode } from "@/contexts/TestModeContext";

interface VentureSummary {
  ventureId: number;
  ventureName: string;
  summary: {
    totalLoadsInbound: number;
    totalLoadsCovered: number;
    coverageRate: number;
    overallMarginPct: number;
    lowCoverage: boolean;
    lowMargin: boolean;
  } | null;
}

function FreightKpisPage() {
  const { testMode } = useTestMode();
  const [ventures, setVentures] = useState<VentureSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/ventures?types=LOGISTICS,TRANSPORT&includeTest=${testMode}`)
      .then((r) => r.json())
      .then(async (data) => {
        const freightVentures = data as { id: number; name: string; type: string }[];

        const now = new Date();
        const from = new Date();
        from.setDate(now.getDate() - 7);
        const fromStr = from.toISOString().slice(0, 10);
        const toStr = now.toISOString().slice(0, 10);

        const summaries = await Promise.all(
          freightVentures.map(async (v: any) => {
            try {
              const res = await fetch(
                `/api/freight-kpi?ventureId=${v.id}&from=${fromStr}&to=${toStr}`
              );
              const kpiData = await res.json();
              return {
                ventureId: v.id,
                ventureName: v.name,
                summary: kpiData.summary || null,
              };
            } catch {
              return { ventureId: v.id, ventureName: v.name, summary: null };
            }
          })
        );

        setVentures(summaries);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [testMode]);

  if (loading) {
    return <div className="p-4">Loading freight KPIs...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Freight KPIs</h1>
        <p className="text-sm text-gray-600 mt-1">
          7-day performance summary for all logistics and transport ventures
        </p>
      </div>

      {ventures.length === 0 ? (
        <p className="text-gray-500">No freight ventures found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ventures.map((v) => (
            <Link
              key={v.ventureId}
              href={`/ventures/${v.ventureId}/freight`}
              className="block border rounded-lg p-4 bg-white shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-lg">{v.ventureName}</h3>
                <span className="text-xs text-blue-600">View Details →</span>
              </div>

              {v.summary ? (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-gray-500 text-xs">Loads In</div>
                    <div className="font-semibold">{v.summary.totalLoadsInbound}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Covered</div>
                    <div className="font-semibold">{v.summary.totalLoadsCovered}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Coverage %</div>
                    <div className={`font-semibold ${v.summary.lowCoverage ? "text-red-500" : ""}`}>
                      {v.summary.coverageRate?.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Margin %</div>
                    <div className={`font-semibold ${v.summary.lowMargin ? "text-red-500" : ""}`}>
                      {v.summary.overallMarginPct?.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">No KPI data available</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

FreightKpisPage.title = "Freight KPIs";

export default FreightKpisPage;
