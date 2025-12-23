import * as React from "react";
import type { VentureSummaryWithAggregates } from "@/types/ventures";

type Props = {
  ventures: VentureSummaryWithAggregates[];
  showKpis?: boolean;
};

function healthBadgeColor(health: string) {
  switch (health) {
    case "HEALTHY":
      return "bg-emerald-100 text-emerald-700";
    case "ATTENTION":
      return "bg-amber-100 text-amber-700";
    case "CRITICAL":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export const VenturesHealthTable: React.FC<Props> = ({
  ventures,
  showKpis = true,
}) => {
  if (!ventures || ventures.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-6 text-sm text-gray-500">
        No ventures found.
      </div>
    );
  }

  const totals = ventures.reduce(
    (acc, v) => {
      if (v.freight) {
        acc.totalLoadsInbound7d += v.freight.totalLoadsInbound7d || 0;
        acc.totalLoadsCovered7d += v.freight.totalLoadsCovered7d || 0;
      }
      if (v.hotels) {
        acc.roomsSold7d += v.hotels.roomsSold7d || 0;
        acc.revparWeightedNumerator +=
          (v.hotels.revpar7d || 0) *
          (v.hotels.roomsSold7d || 0);
        acc.roomsSampleForRevpar += v.hotels.roomsSold7d || 0;
      }
      return acc;
    },
    {
      totalLoadsInbound7d: 0,
      totalLoadsCovered7d: 0,
      roomsSold7d: 0,
      revparWeightedNumerator: 0,
      roomsSampleForRevpar: 0,
    }
  );

  const totalCoverageRate =
    totals.totalLoadsInbound7d > 0
      ? (totals.totalLoadsCovered7d / totals.totalLoadsInbound7d) * 100
      : null;

  const overallRevpar =
    totals.roomsSampleForRevpar > 0
      ? totals.revparWeightedNumerator / totals.roomsSampleForRevpar
      : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-800">
          Ventures Health Overview
        </h2>
        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
          <span>
            Ventures:{" "}
            <span className="font-semibold text-gray-800">
              {ventures.length}
            </span>
          </span>
          <span className="hidden sm:inline-block">•</span>
          <span>
            Offices:{" "}
            <span className="font-semibold text-gray-800">
              {ventures.reduce((acc, v) => acc + (v.officesCount || 0), 0)}
            </span>
          </span>
          {showKpis && (
            <>
              <span className="hidden sm:inline-block">•</span>
              <span>
                7d Loads Inbound:{" "}
                <span className="font-semibold text-gray-800">
                  {totals.totalLoadsInbound7d}
                </span>
              </span>
              <span className="hidden sm:inline-block">•</span>
              <span>
                7d Coverage:{" "}
                <span className="font-semibold text-gray-800">
                  {totalCoverageRate != null
                    ? `${totalCoverageRate.toFixed(1)}%`
                    : "—"}
                </span>
              </span>
              <span className="hidden sm:inline-block">•</span>
              <span>
                7d Rooms Sold:{" "}
                <span className="font-semibold text-gray-800">
                  {totals.roomsSold7d}
                </span>
              </span>
              <span className="hidden sm:inline-block">•</span>
              <span>
                7d RevPAR:{" "}
                <span className="font-semibold text-gray-800">
                  {overallRevpar != null ? overallRevpar.toFixed(2) : "—"}
                </span>
              </span>
            </>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Role</th>
              <th className="px-3 py-2 text-right">Offices</th>
              {showKpis && (
                <>
                  <th className="px-3 py-2 text-right">
                    Loads Inbound (7d)
                  </th>
                  <th className="px-3 py-2 text-right">
                    Coverage (7d)
                  </th>
                  <th className="px-3 py-2 text-right">Rooms Sold (7d)</th>
                  <th className="px-3 py-2 text-right">RevPAR (7d)</th>
                </>
              )}
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ventures.map((v) => {
              const freight = v.freight;
              const hotels = v.hotels;

              return (
                <tr key={v.id} className="hover:bg-gray-50/60">
                  <td className="px-3 py-2 font-medium text-gray-900">
                    {v.name}
                  </td>
                  <td className="px-3 py-2 text-gray-700">{v.category}</td>
                  <td className="px-3 py-2 text-gray-700">
                    {v.typeCode ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-gray-700">{v.roleLabel}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-900">
                    {v.officesCount}
                  </td>

                  {showKpis && (
                    <>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                        {freight?.totalLoadsInbound7d ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                        {freight?.coverageRate7d != null
                          ? `${freight.coverageRate7d.toFixed(1)}%`
                          : "—"}
                      </td>

                      <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                        {hotels?.roomsSold7d ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                        {hotels?.revpar7d != null
                          ? hotels.revpar7d.toFixed(2)
                          : "—"}
                      </td>
                    </>
                  )}

                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${healthBadgeColor(
                        v.health
                      )}`}
                    >
                      {v.health === "HEALTHY"
                        ? "Healthy"
                        : v.health === "ATTENTION"
                        ? "Attention"
                        : v.health === "CRITICAL"
                        ? "Critical"
                        : v.health}
                    </span>
                    {v.reasons && v.reasons.length > 0 && (
                      <div className="mt-1 text-[11px] text-gray-500 line-clamp-2">
                        {v.reasons.map((r) => r.message).join(" • ")}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {showKpis && (
            <tfoot className="bg-gray-50 text-xs text-gray-700">
              <tr>
                <td className="px-3 py-2 font-semibold" colSpan={5}>
                  Totals (all ventures)
                </td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">
                  {totals.totalLoadsInbound7d}
                </td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">
                  {totalCoverageRate != null
                    ? `${totalCoverageRate.toFixed(1)}%`
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">
                  {totals.roomsSold7d}
                </td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">
                  {overallRevpar != null ? overallRevpar.toFixed(2) : "—"}
                </td>
                <td className="px-3 py-2" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};
