import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

type Match = {
  carrierId: number;
  carrierName: string;
  totalScore: number;
  reasons: string[];
  equipmentTypes: string | null;
  onTimePercentage: number | null;
  powerUnits: number | null;
  contact: {
    phone: string | null;
    email: string | null;
    city: string | null;
    state: string | null;
  };
  fmcsaHealth?: {
    authorized: boolean | null;
    mcNumber: string | null;
    dotNumber: string | null;
  };
  primaryDispatcher?: {
    id: string;
    name: string;
    role: string | null;
    phone: string | null;
    mobile: string | null;
    email: string | null;
    preferredContactMethod: string | null;
  } | null;
};

type Load = {
  id: number;
  reference: string | null;
  pickupCity: string | null;
  pickupState: string | null;
  dropCity: string | null;
  dropState: string | null;
  pickupDate: string | null;
  equipmentType: string | null;
  loadStatus: string;
};

export default function FindCarriersPage() {
  const router = useRouter();
  const { id } = router.query;

  const [load, setLoad] = useState<Load | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCarriers, setSelectedCarriers] = useState<Set<number>>(new Set());
  const [sending, setSending] = useState(false);
  const [outreachResult, setOutreachResult] = useState<any>(null);

  const [filters, setFilters] = useState({
    requireEquipmentMatch: false,
    limit: 20,
  });

  useEffect(() => {
    if (!id) return;
    fetchMatches();
  }, [id, filters]);

  const fetchMatches = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("limit", String(filters.limit));
      if (filters.requireEquipmentMatch) params.set("requireEquipmentMatch", "true");

      const res = await fetch(`/api/freight/loads/${id}/outreach?${params}`);
      if (!res.ok) throw new Error("Failed to fetch matches");

      const data = await res.json();
      setLoad(data.load);
      setMatches(data.matches || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleCarrier = (carrierId: number) => {
    const next = new Set(selectedCarriers);
    if (next.has(carrierId)) {
      next.delete(carrierId);
    } else {
      next.add(carrierId);
    }
    setSelectedCarriers(next);
  };

  const selectAll = () => {
    setSelectedCarriers(new Set(matches.map((m) => m.carrierId)));
  };

  const selectNone = () => {
    setSelectedCarriers(new Set());
  };

  const sendOutreach = async (channel: string) => {
    if (selectedCarriers.size === 0) return;

    setSending(true);
    setOutreachResult(null);

    try {
      const res = await fetch(`/api/freight/loads/${id}/outreach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carrierIds: Array.from(selectedCarriers),
          channel,
          templateType: "coverage_request",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send outreach");

      setOutreachResult(data);
      setSelectedCarriers(new Set());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 70) return "bg-green-100 text-green-800";
    if (score >= 50) return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-gray-600 dark:text-gray-400">Loading carrier matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link href={`/freight/loads/${id}`} className="text-blue-600 hover:underline text-sm">
            &larr; Back to Load
          </Link>
        </div>

        {load && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Find Carriers for Load</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {load.reference || `Load #${load.id}`} &bull;{" "}
                  {load.pickupCity}, {load.pickupState} &rarr; {load.dropCity}, {load.dropState}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Equipment: {load.equipmentType || "Not specified"} &bull;{" "}
                  Pickup: {load.pickupDate ? new Date(load.pickupDate).toLocaleDateString() : "TBD"}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  load.loadStatus === "OPEN"
                    ? "bg-blue-100 text-blue-800"
                    : load.loadStatus === "COVERED"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {load.loadStatus}
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {outreachResult && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
            Outreach sent to {outreachResult.sentCount} carriers via {outreachResult.channel}!
            {outreachResult.failedCount > 0 && (
              <span className="ml-2 text-red-600">({outreachResult.failedCount} failed)</span>
            )}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-4 items-center">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={filters.requireEquipmentMatch}
                  onChange={(e) => setFilters({ ...filters, requireEquipmentMatch: e.target.checked })}
                  className="rounded"
                />
                Equipment match required
              </label>

              <select
                value={filters.limit}
                onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) })}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm dark:bg-gray-700 dark:text-white"
              >
                <option value={10}>Top 10</option>
                <option value={20}>Top 20</option>
                <option value={50}>Top 50</option>
                <option value={100}>Top 100</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button onClick={selectAll} className="text-sm text-blue-600 hover:underline">
                Select All
              </button>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <button onClick={selectNone} className="text-sm text-blue-600 hover:underline">
                Select None
              </button>
            </div>
          </div>
        </div>

        {selectedCarriers.size > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
            <span className="text-blue-800 dark:text-blue-300 font-medium">
              {selectedCarriers.size} carrier{selectedCarriers.size > 1 ? "s" : ""} selected
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => sendOutreach("email")}
                disabled={sending}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                title="Log email outreach to selected carriers"
              >
                {sending ? "Logging..." : "Log Email Outreach"}
              </button>
              <button
                onClick={() => sendOutreach("sms")}
                disabled={sending}
                className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                title="Log SMS outreach to selected carriers"
              >
                {sending ? "Logging..." : "Log SMS Outreach"}
              </button>
              <button
                onClick={() => sendOutreach("phone")}
                disabled={sending}
                className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                title="Log phone calls to selected carriers"
              >
                Log Calls
              </button>
            </div>
          </div>
        )}

        {/* AI Email Draft Section */}
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-medium text-purple-900 dark:text-purple-300">Carrier Outreach</h3>
              <p className="text-sm text-purple-700 dark:text-purple-400 mt-1">
                Draft personalized emails using AI or log contact attempts
              </p>
            </div>
            <Link
              href={`/freight/ai/carrier-draft?loadId=${id}`}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Draft AI Email
            </Link>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Matched Carriers ({matches.length})
            </h2>
          </div>

          {matches.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No carriers found matching this load. Try adjusting filters.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {matches.map((match) => (
                <div
                  key={match.carrierId}
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition ${
                    selectedCarriers.has(match.carrierId) ? "bg-blue-50 dark:bg-blue-900/30" : ""
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selectedCarriers.has(match.carrierId)}
                      onChange={() => toggleCarrier(match.carrierId)}
                      className="mt-1 rounded"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/freight/carriers/${match.carrierId}`}
                          className="font-medium text-gray-900 dark:text-white hover:text-blue-600"
                        >
                          {match.carrierName}
                        </Link>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getScoreBadgeColor(match.totalScore)}`}>
                          Score: {match.totalScore}
                        </span>
                        {match.fmcsaHealth?.mcNumber && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            MC# {match.fmcsaHealth.mcNumber}
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-400">
                        {match.equipmentTypes && (
                          <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs">
                            {match.equipmentTypes}
                          </span>
                        )}
                        {match.contact.city && match.contact.state && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {match.contact.city}, {match.contact.state}
                          </span>
                        )}
                        {match.onTimePercentage != null && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            On-time: {match.onTimePercentage}%
                          </span>
                        )}
                        {match.powerUnits && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {match.powerUnits} trucks
                          </span>
                        )}
                      </div>

                      {match.reasons.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {match.reasons.slice(0, 3).map((reason, i) => (
                            <span key={i} className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                              {reason}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="text-right text-sm min-w-[180px]">
                      {match.primaryDispatcher ? (
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{match.primaryDispatcher.name}</div>
                          {match.primaryDispatcher.role && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">{match.primaryDispatcher.role}</div>
                          )}
                          {(match.primaryDispatcher.phone || match.primaryDispatcher.mobile) && (
                            <a
                              href={`tel:${match.primaryDispatcher.phone || match.primaryDispatcher.mobile}`}
                              className="text-blue-600 hover:underline block"
                            >
                              {match.primaryDispatcher.phone || match.primaryDispatcher.mobile}
                            </a>
                          )}
                          {match.primaryDispatcher.email && (
                            <a
                              href={`mailto:${match.primaryDispatcher.email}`}
                              className="text-gray-500 dark:text-gray-400 hover:underline block text-xs truncate max-w-[150px]"
                            >
                              {match.primaryDispatcher.email}
                            </a>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Company Contact</div>
                          {match.contact.phone ? (
                            <a href={`tel:${match.contact.phone}`} className="text-blue-600 hover:underline block">
                              {match.contact.phone}
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs">No phone</span>
                          )}
                          {match.contact.email ? (
                            <a href={`mailto:${match.contact.email}`} className="text-gray-500 dark:text-gray-400 hover:underline block text-xs">
                              {match.contact.email}
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs block">No email</span>
                          )}
                        </div>
                      )}
                      <Link
                        href={`/freight/ai/carrier-draft?loadId=${id}&carrierId=${match.carrierId}`}
                        className="mt-2 inline-flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 hover:underline"
                        title="Draft personalized email for this carrier"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Draft Email
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
