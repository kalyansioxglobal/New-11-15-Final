import { useState, useEffect } from "react";
import Link from "next/link";

interface CallLog {
  id: number;
  agentId: number;
  ventureId: number;
  officeId: number | null;
  campaignId: number | null;
  callStartedAt: string;
  callEndedAt: string | null;
  dialCount: number;
  isConnected: boolean;
  appointmentSet: boolean;
  dealWon: boolean;
  revenue: number;
  notes: string | null;
  agent: {
    id: number;
    userId: number;
    user: {
      id: number;
      fullName: string;
    };
  };
  campaign: {
    id: number;
    name: string;
  } | null;
}

interface Campaign {
  id: number;
  name: string;
}

interface Venture {
  id: number;
  name: string;
}

export default function BpoCallLogsPage() {
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [ventures, setVentures] = useState<Venture[]>([]);

  const [ventureFilter, setVentureFilter] = useState<string>("");
  const [campaignFilter, setCampaignFilter] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [isConnectedFilter, setIsConnectedFilter] = useState<string>("");
  const [dealWonFilter, setDealWonFilter] = useState<string>("");

  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/ventures?types=BPO")
      .then((r) => r.json())
      .then((data) => setVentures(data || []))
      .catch(() => {});

    fetch("/api/bpo/campaigns")
      .then((r) => r.json())
      .then((data) => {
        const items = data.items || data.campaigns || data || [];
        setCampaigns(Array.isArray(items) ? items : []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadCallLogs();
  }, [ventureFilter, campaignFilter, fromDate, toDate, isConnectedFilter, dealWonFilter]);

  async function loadCallLogs(cursor?: number) {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("limit", "50");
      if (ventureFilter) params.set("ventureId", ventureFilter);
      if (campaignFilter) params.set("campaignId", campaignFilter);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      if (isConnectedFilter) params.set("isConnected", isConnectedFilter);
      if (dealWonFilter) params.set("dealWon", dealWonFilter);
      if (cursor) params.set("cursor", cursor.toString());

      const res = await fetch(`/api/bpo/call-logs?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load call logs");
      }

      const json = await res.json();
      const items = json.items || [];

      if (cursor) {
        setCallLogs((prev) => [...prev, ...items]);
      } else {
        setCallLogs(items);
      }
      setHasMore(json.hasMore || false);
      setNextCursor(json.nextCursor || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function formatDuration(start: string, end: string | null): string {
    if (!end) return "In progress";
    const startDate = new Date(start);
    const endDate = new Date(end);
    const seconds = Math.floor((endDate.getTime() - startDate.getTime()) / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  }

  function formatDateTime(date: string): string {
    return new Date(date).toLocaleString();
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Call Logs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Browse and analyze BPO call activity
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-lg border">
        <select
          value={ventureFilter}
          onChange={(e) => setVentureFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">All Ventures</option>
          {ventures.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>

        <select
          value={campaignFilter}
          onChange={(e) => setCampaignFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">All Campaigns</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">From:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">To:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          />
        </div>

        <select
          value={isConnectedFilter}
          onChange={(e) => setIsConnectedFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">Connected?</option>
          <option value="true">Connected</option>
          <option value="false">Not Connected</option>
        </select>

        <select
          value={dealWonFilter}
          onChange={(e) => setDealWonFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">Deal Won?</option>
          <option value="true">Won</option>
          <option value="false">Not Won</option>
        </select>

        <button
          onClick={() => {
            setVentureFilter("");
            setCampaignFilter("");
            setFromDate("");
            setToDate("");
            setIsConnectedFilter("");
            setDealWonFilter("");
          }}
          className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
        >
          Clear Filters
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
      )}

      {loading && callLogs.length === 0 ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : callLogs.length === 0 ? (
        <div className="text-center py-12 border rounded-xl bg-gray-50">
          <div className="text-gray-400 text-3xl mb-3">📞</div>
          <h3 className="text-gray-700 font-medium mb-1">No Call Logs Found</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            {ventureFilter || campaignFilter || fromDate || toDate
              ? "No call logs match your current filters. Try adjusting the filters above."
              : "No call logs have been recorded yet."}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Agent</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Campaign</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Started</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Duration</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">Dials</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">Connected</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">Appointment</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">Deal Won</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {callLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{log.agent?.user?.fullName || "Unknown"}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {log.campaign?.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatDateTime(log.callStartedAt)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatDuration(log.callStartedAt, log.callEndedAt)}
                      </td>
                      <td className="px-4 py-3 text-center">{log.dialCount}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block w-2 h-2 rounded-full ${log.isConnected ? "bg-green-500" : "bg-gray-300"}`} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block w-2 h-2 rounded-full ${log.appointmentSet ? "bg-blue-500" : "bg-gray-300"}`} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block w-2 h-2 rounded-full ${log.dealWon ? "bg-green-500" : "bg-gray-300"}`} />
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-green-600">
                        {log.revenue > 0 ? `$${log.revenue.toLocaleString()}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {hasMore && (
            <div className="text-center py-4">
              <button
                onClick={() => nextCursor && loadCallLogs(nextCursor)}
                disabled={loading}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {loading ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

BpoCallLogsPage.title = "BPO Call Logs";
