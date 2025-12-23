import { useState, useEffect } from "react";

interface HotelMiniKpiProps {
  ventureId: number;
}

export default function HotelMiniKpi({ ventureId }: HotelMiniKpiProps) {
  const [summary, setSummary] = useState<any | null>(null);

  useEffect(() => {
    const now = new Date();
    const from = new Date();
    from.setDate(now.getDate() - 7);

    const qs = new URLSearchParams({
      ventureId: String(ventureId),
      from: from.toISOString().slice(0, 10),
      to: now.toISOString().slice(0, 10),
    });

    fetch(`/api/hotel-kpi?${qs.toString()}`)
      .then((r) => r.json())
      .then((d) => setSummary(d.summary))
      .catch(() => {});
  }, [ventureId]);

  if (!summary) return null;

  return (
    <div className="mt-2 text-xs border-t pt-2 space-y-1">
      <div className="flex justify-between">
        <span>Occ (7d)</span>
        <span className={summary.lowOcc ? "text-red-500 font-semibold" : ""}>
          {summary.occupancyPct.toFixed(1)}%
        </span>
      </div>
      <div className="flex justify-between">
        <span>ADR</span>
        <span>${summary.adr.toFixed(0)}</span>
      </div>
      <div className="flex justify-between">
        <span>RevPAR</span>
        <span className={summary.lowRevpar ? "text-red-500 font-semibold" : ""}>
          ${summary.revpar.toFixed(0)}
        </span>
      </div>
    </div>
  );
}
