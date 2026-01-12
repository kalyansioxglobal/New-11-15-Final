import * as React from "react";
import type { VentureSummaryWithAggregates } from "@/types/ventures";

type Props = {
  ventures: VentureSummaryWithAggregates[];
  showKpis?: boolean;
};

function healthBadgeColor(health: string) {
  switch (health) {
    case "Healthy":
      return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
    case "Attention":
      return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
    case "Critical":
      return "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800";
    default:
      return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600";
  }
}

function healthIcon(health: string) {
  switch (health) {
    case "Healthy":
      return (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      );
    case "Attention":
      return (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      );
    case "Critical":
      return (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      );
    default:
      return null;
  }
}

export const VenturesHealthTable: React.FC<Props> = ({
  ventures,
  showKpis = true,
}) => {
  if (!ventures || ventures.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-8 text-center">
        <svg
          className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No ventures found</p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Ventures will appear here once they are added</p>
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

  const totalOffices = ventures.reduce((acc, v) => acc + (v.officesCount || 0), 0);
  const healthyCount = ventures.filter((v) => String(v.health) === "Healthy").length;
  const attentionCount = ventures.filter((v) => String(v.health) === "Attention").length;
  const criticalCount = ventures.filter((v) => String(v.health) === "Critical").length;

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <svg
              className="w-5 h-5 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Ventures Health Overview
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Monitor the health status of all ventures
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 shadow-sm">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Ventures</div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">{ventures.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 shadow-sm">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Offices</div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">{totalOffices}</div>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800 p-3 shadow-sm">
          <div className="text-xs text-emerald-700 dark:text-emerald-300 mb-1">Healthy</div>
          <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{healthyCount}</div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 p-3 shadow-sm">
          <div className="text-xs text-amber-700 dark:text-amber-300 mb-1">Attention</div>
          <div className="text-xl font-bold text-amber-700 dark:text-amber-300">{attentionCount}</div>
        </div>
        <div className="bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-200 dark:border-rose-800 p-3 shadow-sm">
          <div className="text-xs text-rose-700 dark:text-rose-300 mb-1">Critical</div>
          <div className="text-xl font-bold text-rose-700 dark:text-rose-300">{criticalCount}</div>
        </div>
        {showKpis && (
          <>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-3 shadow-sm">
              <div className="text-xs text-blue-700 dark:text-blue-300 mb-1">Coverage (7d)</div>
              <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
                {totalCoverageRate != null
                  ? `${totalCoverageRate.toFixed(1)}%`
                  : "—"}
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 p-3 shadow-sm">
              <div className="text-xs text-purple-700 dark:text-purple-300 mb-1">RevPAR (7d)</div>
              <div className="text-xl font-bold text-purple-700 dark:text-purple-300">
                {overallRevpar != null ? overallRevpar.toFixed(2) : "—"}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Venture Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  <div className="flex items-center justify-end gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Offices
                  </div>
                </th>
                {showKpis && (
                  <>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Loads (7d)
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Coverage (7d)
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Rooms (7d)
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      RevPAR (7d)
                    </th>
                  </>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Health Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {ventures.map((v, index) => {
                const freight = v.freight;
                const hotels = v.hotels;
                const coverageRate = freight?.coverageRate7d;

                return (
                  <tr
                    key={v.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900 dark:text-white">{v.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {v.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {v.typeCode ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{v.roleLabel}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5 tabular-nums font-medium text-gray-900 dark:text-white">
                        <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {v.officesCount}
                      </div>
                    </td>

                    {showKpis && (
                      <>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {freight?.totalLoadsInbound7d != null ? (
                            <span className="font-medium text-gray-900 dark:text-white">
                              {freight.totalLoadsInbound7d}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {coverageRate != null ? (
                            <span
                              className={`font-semibold ${
                                coverageRate >= 90
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : coverageRate >= 70
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-rose-600 dark:text-rose-400"
                              }`}
                            >
                              {coverageRate.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {hotels?.roomsSold7d != null ? (
                            <span className="font-medium text-gray-900 dark:text-white">
                              {hotels.roomsSold7d}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {hotels?.revpar7d != null ? (
                            <span className="font-semibold text-purple-600 dark:text-purple-400">
                              ${hotels.revpar7d.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </td>
                      </>
                    )}

                    <td className="px-4 py-3">
                      <div className="space-y-1.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${healthBadgeColor(
                            v.health
                          )}`}
                        >
                          {healthIcon(v.health)}
                          {v.health}
                        </span>
                        {v.reasons && v.reasons.length > 0 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 max-w-xs">
                            <span className="font-medium text-gray-600 dark:text-gray-300">
                              {v.reasons.length === 1 ? "Issue: " : "Issues: "}
                            </span>
                            {v.reasons.map((r, idx) => (
                              <span key={idx}>
                                {r.message}
                                {idx < v.reasons.length - 1 && " • "}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {showKpis && (
              <tfoot className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 border-t-2 border-gray-300 dark:border-gray-700">
                <tr>
                  <td
                    className="px-4 py-3 font-bold text-gray-900 dark:text-white"
                    colSpan={5}
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Totals (All Ventures)
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-gray-900 dark:text-white">
                    {totals.totalLoadsInbound7d}
                  </td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums">
                    {totalCoverageRate != null ? (
                      <span
                        className={
                          totalCoverageRate >= 90
                            ? "text-emerald-600 dark:text-emerald-400"
                            : totalCoverageRate >= 70
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-rose-600 dark:text-rose-400"
                        }
                      >
                        {totalCoverageRate.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-gray-900 dark:text-white">
                    {totals.roomsSold7d}
                  </td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-purple-600 dark:text-purple-400">
                    {overallRevpar != null ? `$${overallRevpar.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
