import { useState, useEffect } from "react";

type FreightMiniKpiProps = {
  ventureId: number;
};

export default function FreightMiniKpi({ ventureId }: FreightMiniKpiProps) {
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    const now = new Date();
    const from = new Date();
    from.setDate(now.getDate() - 7);

    const qs = new URLSearchParams({
      ventureId: String(ventureId),
      from: from.toISOString().slice(0, 10),
      to: now.toISOString().slice(0, 10),
    });

    fetch(`/api/freight-kpi?${qs.toString()}`)
      .then((r) => r.json())
      .then((d) => setData(d.summary))
      .catch(() => {});
  }, [ventureId]);

  if (!data) return null;

  return (
    <div className="mt-2 text-xs border-t pt-2 space-y-1">
      <div className="flex justify-between">
        <span>Loads In (7d)</span>
        <span>{data.totalLoadsInbound}</span>
      </div>
      <div className="flex justify-between">
        <span>Loads Covered</span>
        <span>{data.totalLoadsCovered}</span>
      </div>
      <div className="flex justify-between">
        <span>Coverage %</span>
        <span className={data.lowCoverage ? "text-red-500 font-semibold" : ""}>
          {data.coverageRate?.toFixed(1)}%
        </span>
      </div>
      <div className="flex justify-between">
        <span>Margin %</span>
        <span className={data.lowMargin ? "text-red-500 font-semibold" : ""}>
          {data.overallMarginPct?.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
