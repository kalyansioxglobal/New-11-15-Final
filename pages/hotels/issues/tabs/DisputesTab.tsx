import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useTestMode } from '@/contexts/TestModeContext';

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
        return "bg-yellow-100 text-yellow-800";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800";
      case "WON":
        return "bg-green-100 text-green-800";
      case "LOST":
        return "bg-red-100 text-red-800";
      case "CLOSED_NO_ACTION":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Disputes</h2>
          <p className="text-sm text-slate-400">
            Track chargebacks, OTA disputes, and other guest billing issues.
          </p>
        </div>
        <Link
          href="/hotels/disputes/new"
          className="px-3 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
        >
          + New Dispute
        </Link>
      </div>

      {totals && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="text-sm text-slate-400">Total Disputes</div>
            <div className="text-2xl font-bold text-white">{totals.totalDisputes}</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="text-sm text-slate-400">Open / In Progress</div>
            <div className="text-2xl font-bold text-yellow-400">{totals.openDisputes}</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="text-sm text-slate-400">Won</div>
            <div className="text-2xl font-bold text-green-400">{totals.wonDisputes}</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="text-sm text-slate-400">Lost (Chargebacks)</div>
            <div className="text-2xl font-bold text-red-400">
              {totals.lostDisputes}
              <span className="text-sm font-normal ml-2">
                (${totals.totalChargebackLost.toLocaleString()})
              </span>
            </div>
          </div>
        </div>
      )}

      {summary.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setShowSummary(!showSummary)}
            className="text-sm text-blue-400 hover:underline mb-2"
          >
            {showSummary ? "Hide" : "Show"} Chargeback Summary by Hotel
          </button>
          {showSummary && (
            <div className="overflow-auto border border-slate-700 rounded bg-slate-800 mb-4">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="text-left px-3 py-2 border-b border-slate-600 font-medium text-slate-200">Hotel</th>
                    <th className="text-right px-3 py-2 border-b border-slate-600 font-medium text-slate-200">Total</th>
                    <th className="text-right px-3 py-2 border-b border-slate-600 font-medium text-slate-200">Open</th>
                    <th className="text-right px-3 py-2 border-b border-slate-600 font-medium text-slate-200">Won</th>
                    <th className="text-right px-3 py-2 border-b border-slate-600 font-medium text-slate-200">Lost</th>
                    <th className="text-right px-3 py-2 border-b border-slate-600 font-medium text-slate-200">Total Chargeback Lost</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((s) => (
                    <tr key={s.propertyId} className="border-t border-slate-700 hover:bg-slate-700/50">
                      <td className="px-3 py-2 font-medium text-slate-200">{s.propertyName}</td>
                      <td className="px-3 py-2 text-right text-slate-300">{s.totalDisputes}</td>
                      <td className="px-3 py-2 text-right text-yellow-400">{s.openDisputes}</td>
                      <td className="px-3 py-2 text-right text-green-400">{s.wonDisputes}</td>
                      <td className="px-3 py-2 text-right text-red-400">{s.lostDisputes}</td>
                      <td className="px-3 py-2 text-right font-medium text-red-400">
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

      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm text-slate-300">Status:</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-600 rounded px-2 py-1 text-sm bg-slate-800 text-slate-200"
        >
          <option value="">All</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="WON">Won</option>
          <option value="LOST">Lost</option>
          <option value="CLOSED_NO_ACTION">Closed - No Action</option>
        </select>
      </div>

      {loading ? (
        <div className="text-sm text-slate-400">Loading disputes...</div>
      ) : (
        <div className="overflow-auto border border-slate-700 rounded bg-slate-800 mb-4">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-700">
              <tr>
                <th className="text-left px-3 py-2 border-b border-slate-600 font-medium text-slate-200">ID</th>
                <th className="text-left px-3 py-2 border-b border-slate-600 font-medium text-slate-200">Property</th>
                <th className="text-left px-3 py-2 border-b border-slate-600 font-medium text-slate-200">Guest</th>
                <th className="text-left px-3 py-2 border-b border-slate-600 font-medium text-slate-200">Type</th>
                <th className="text-left px-3 py-2 border-b border-slate-600 font-medium text-slate-200">Channel</th>
                <th className="text-left px-3 py-2 border-b border-slate-600 font-medium text-slate-200">Amount</th>
                <th className="text-left px-3 py-2 border-b border-slate-600 font-medium text-slate-200">Status</th>
                <th className="text-left px-3 py-2 border-b border-slate-600 font-medium text-slate-200">Posted</th>
                <th className="text-left px-3 py-2 border-b border-slate-600 font-medium text-slate-200">Evidence Due</th>
                <th className="text-left px-3 py-2 border-b border-slate-600 font-medium text-slate-200"></th>
              </tr>
            </thead>
            <tbody>
              {disputes.map((d) => (
                <tr key={d.id} className="border-t border-slate-700 hover:bg-slate-700/50">
                  <td className="px-3 py-2 text-slate-300">{d.id}</td>
                  <td className="px-3 py-2 text-slate-300">{d.property?.name}</td>
                  <td className="px-3 py-2 text-slate-300">{d.guestName || "-"}</td>
                  <td className="px-3 py-2 text-slate-300">{d.type.replace(/_/g, " ")}</td>
                  <td className="px-3 py-2 text-slate-300">{d.channel.replace(/_/g, " ")}</td>
                  <td className="px-3 py-2 text-slate-300">
                    {d.currency} {d.disputedAmount.toFixed(2)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                        d.status
                      )}`}
                    >
                      {d.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-300">
                    {d.postedDate
                      ? new Date(d.postedDate).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-3 py-2 text-slate-300">
                    {d.evidenceDueDate
                      ? new Date(d.evidenceDueDate).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/hotels/disputes/${d.id}`}
                      className="text-xs text-blue-400 hover:underline"
                    >
                      View / Edit
                    </Link>
                  </td>
                </tr>
              ))}
              {!disputes.length && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-3 py-4 text-center text-sm text-slate-400"
                  >
                    No disputes found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && total > pageSize && (
        <div className="flex justify-between items-center mt-2 text-xs text-slate-400">
          <span>
            Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total} disputes
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2 py-1 border border-slate-600 rounded disabled:opacity-50 bg-slate-800 text-slate-200"
            >
              Prev
            </button>
            <button
              disabled={page * pageSize >= total}
              onClick={() => setPage((p) => p + 1)}
              className="px-2 py-1 border border-slate-600 rounded disabled:opacity-50 bg-slate-800 text-slate-200"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
