import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useTestMode } from '@/contexts/TestModeContext';
import { Skeleton } from "@/components/ui/Skeleton";

interface Dispute {
  id: number;
  status: string;
  type: string;
  channel: string;
  disputedAmount: number;
  currency: string;
  property: { id: number; name: string };
  guestName?: string;
  postedDate?: string;
  evidenceDueDate?: string;
}

interface HotelSummary {
  propertyId: number;
  propertyName: string;
  totalDisputes: number;
  openDisputes: number;
  wonDisputes: number;
  lostDisputes: number;
  totalDisputedAmount: number;
  totalChargebackLost: number;
  currency: string;
}

interface Totals {
  totalDisputes: number;
  openDisputes: number;
  wonDisputes: number;
  lostDisputes: number;
  totalDisputedAmount: number;
  totalChargebackLost: number;
}

export default function DisputesTab() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("OPEN");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<HotelSummary[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [showSummary, setShowSummary] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const { testMode } = useTestMode();

  const fetchDisputes = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    params.set("includeTest", testMode ? "true" : "false");
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    const res = await fetch(`/api/hotels/disputes?${params.toString()}`);
    const data = await res.json();
    setDisputes(data.disputes || []);
    setTotal(data.total || 0);
    setLoading(false);
  };

  const fetchSummary = async () => {
    const params = new URLSearchParams();
    params.set("includeTest", testMode ? "true" : "false");
    const res = await fetch(`/api/hotels/disputes/summary?${params.toString()}`);
    const data = await res.json();
    setSummary(data.summary || []);
    setTotals(data.totals || null);
  };

  useEffect(() => {
    fetchDisputes();
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, testMode, page]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800";
      case "IN_PROGRESS":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800";
      case "WON":
        return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800";
      case "LOST":
        return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800";
      case "CLOSED_NO_ACTION":
        return "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700";
      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Disputes</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track chargebacks, OTA disputes, and other guest billing issues.
          </p>
        </div>
        <Link
          href="/hotels/disputes/new"
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Dispute
        </Link>
      </div>

      {totals && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Disputes</div>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{totals.totalDisputes}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Open / In Progress</div>
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{totals.openDisputes}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Won</div>
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{totals.wonDisputes}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Lost (Chargebacks)</div>
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">
              {totals.lostDisputes}
              <span className="text-sm font-normal ml-2 text-gray-500 dark:text-gray-400">
                (${totals.totalChargebackLost.toLocaleString()})
              </span>
            </div>
          </div>
        </div>
      )}

      {summary.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Chargeback Summary by Hotel</h3>
            <button
              onClick={() => setShowSummary(!showSummary)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1"
            >
              {showSummary ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  Hide
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Show
                </>
              )}
            </button>
          </div>
          {showSummary && (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="text-left px-4 py-3 border-b border-gray-200 dark:border-slate-600 font-semibold text-gray-700 dark:text-gray-300">Hotel</th>
                    <th className="text-right px-4 py-3 border-b border-gray-200 dark:border-slate-600 font-semibold text-gray-700 dark:text-gray-300">Total</th>
                    <th className="text-right px-4 py-3 border-b border-gray-200 dark:border-slate-600 font-semibold text-gray-700 dark:text-gray-300">Open</th>
                    <th className="text-right px-4 py-3 border-b border-gray-200 dark:border-slate-600 font-semibold text-gray-700 dark:text-gray-300">Won</th>
                    <th className="text-right px-4 py-3 border-b border-gray-200 dark:border-slate-600 font-semibold text-gray-700 dark:text-gray-300">Lost</th>
                    <th className="text-right px-4 py-3 border-b border-gray-200 dark:border-slate-600 font-semibold text-gray-700 dark:text-gray-300">Total Chargeback Lost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {summary.map((s) => (
                    <tr key={s.propertyId} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.propertyName}</td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{s.totalDisputes}</td>
                      <td className="px-4 py-3 text-right font-medium text-yellow-600 dark:text-yellow-400">{s.openDisputes}</td>
                      <td className="px-4 py-3 text-right font-medium text-green-600 dark:text-green-400">{s.wonDisputes}</td>
                      <td className="px-4 py-3 text-right font-medium text-red-600 dark:text-red-400">{s.lostDisputes}</td>
                      <td className="px-4 py-3 text-right font-semibold text-red-600 dark:text-red-400">
                        {s.currency} {s.totalChargebackLost.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Status:</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="WON">Won</option>
          <option value="LOST">Lost</option>
          <option value="CLOSED_NO_ACTION">Closed - No Action</option>
        </select>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <Skeleton className="w-full h-[85vh]" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700/50">
                <tr>
                  <th className="text-left px-4 py-3 border-b border-gray-200 dark:border-slate-600 font-semibold text-gray-700 dark:text-gray-300">ID</th>
                  <th className="text-left px-4 py-3 border-b border-gray-200 dark:border-slate-600 font-semibold text-gray-700 dark:text-gray-300">Property</th>
                  <th className="text-left px-4 py-3 border-b border-gray-200 dark:border-slate-600 font-semibold text-gray-700 dark:text-gray-300">Guest</th>
                  <th className="text-left px-4 py-3 border-b border-gray-200 dark:border-slate-600 font-semibold text-gray-700 dark:text-gray-300">Type</th>
                  <th className="text-left px-4 py-3 border-b border-gray-200 dark:border-slate-600 font-semibold text-gray-700 dark:text-gray-300">Channel</th>
                  <th className="text-left px-4 py-3 border-b border-gray-200 dark:border-slate-600 font-semibold text-gray-700 dark:text-gray-300">Amount</th>
                  <th className="text-left px-4 py-3 border-b border-gray-200 dark:border-slate-600 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                  <th className="text-left px-4 py-3 border-b border-gray-200 dark:border-slate-600 font-semibold text-gray-700 dark:text-gray-300">Posted</th>
                  <th className="text-left px-4 py-3 border-b border-gray-200 dark:border-slate-600 font-semibold text-gray-700 dark:text-gray-300">Evidence Due</th>
                  <th className="text-left px-4 py-3 border-b border-gray-200 dark:border-slate-600 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {disputes.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">#{d.id}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{d.property?.name || "-"}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{d.guestName || "-"}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 capitalize">{d.type.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 capitalize">{d.channel.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                      {d.currency} {d.disputedAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          d.status
                        )}`}
                      >
                        {d.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {d.postedDate
                        ? new Date(d.postedDate).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {d.evidenceDueDate
                        ? new Date(d.evidenceDueDate).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/hotels/disputes/${d.id}`}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm flex items-center gap-1 hover:underline"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
                {!disputes.length && (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-12 text-center"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-12 h-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No disputes found</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">Try adjusting your filters</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && total > pageSize && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-4 py-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Showing <span className="font-medium text-gray-900 dark:text-white">{(page - 1) * pageSize + 1}</span> to{" "}
            <span className="font-medium text-gray-900 dark:text-white">{Math.min(page * pageSize, total)}</span> of{" "}
            <span className="font-medium text-gray-900 dark:text-white">{total}</span> disputes
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors font-medium text-sm flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
            <button
              disabled={page * pageSize >= total}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors font-medium text-sm flex items-center gap-1"
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
