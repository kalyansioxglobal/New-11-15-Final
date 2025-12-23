import { useEffect, useState } from "react";

type Shipper = { id: number; name: string };
type LostReason = { id: number; name: string };

type Load = {
  id: number;
  tmsLoadId?: string | null;
  reference?: string | null;
  shipper?: Shipper | null;
  shipperName?: string | null;
  customerName?: string | null;
  pickupCity?: string | null;
  pickupState?: string | null;
  dropCity?: string | null;
  dropState?: string | null;
  deliveryCity?: string | null;
  deliveryState?: string | null;
  pickupDate?: string | null;
  lostAt?: string | null;
  loadStatus?: string;
  lostReason?: string | null;
  lostReasonCategory?: string | null;
  lostReasonRef?: LostReason | null;
  repName?: string | null;
  salesRepName?: string | null;
  hoursToPickup?: number | null;
};

type AgentDraft = {
  carrier: { id?: number; name: string; email?: string | null; phone?: string | null; source?: string; laneScore?: number };
  to: string;
  subject: string;
  html: string;
};

type AgentDraftResponse = { mode: "DRAFT"; loadId: number; count: number; drafts: AgentDraft[] };
type ActiveTab = "AT_RISK" | "LOST";

function formatDateDisplay(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function formatDateShort(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

export default function AtRiskLostTab() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("AT_RISK");
  const [hoursUntilPickup, setHoursUntilPickup] = useState<number>(24);
  const [atRiskLoading, setAtRiskLoading] = useState<boolean>(false);
  const [atRiskLoads, setAtRiskLoads] = useState<Load[]>([]);
  const [atRiskError, setAtRiskError] = useState<string | null>(null);
  const [lostFrom, setLostFrom] = useState<string>(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().substring(0, 10); });
  const [lostTo, setLostTo] = useState<string>(() => new Date().toISOString().substring(0, 10));
  const [lostLoading, setLostLoading] = useState<boolean>(false);
  const [lostLoads, setLostLoads] = useState<Load[]>([]);
  const [lostError, setLostError] = useState<string | null>(null);
  const [draftsLoading, setDraftsLoading] = useState<boolean>(false);
  const [currentDrafts, setCurrentDrafts] = useState<AgentDraftResponse | null>(null);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [filterShipper, setFilterShipper] = useState<string | null>(null);
  const [filterRep, setFilterRep] = useState<string | null>(null);
  const [filterLane, setFilterLane] = useState<string | null>(null);
  const [postmortemLoading, setPostmortemLoading] = useState<boolean>(false);
  const [postmortemText, setPostmortemText] = useState<string | null>(null);
  const [postmortemError, setPostmortemError] = useState<string | null>(null);

  useEffect(() => { fetchAtRiskLoads(); }, [hoursUntilPickup]);
  useEffect(() => { fetchLostLoads(); }, [lostFrom, lostTo]);

  async function fetchAtRiskLoads() {
    try {
      setAtRiskLoading(true);
      setAtRiskError(null);
      setCurrentDrafts(null);
      const params = new URLSearchParams({ hoursUntilPickup: String(hoursUntilPickup || 24) });
      const res = await fetch(`/api/freight/at-risk-loads?${params.toString()}`);
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || "Failed to load at-risk loads"); }
      const data = await res.json();
      setAtRiskLoads(data.loads || []);
    } catch (err: unknown) {
      setAtRiskError(err instanceof Error ? err.message : "Failed to load at-risk loads");
    } finally { setAtRiskLoading(false); }
  }

  async function fetchLostLoads() {
    try {
      setLostLoading(true);
      setLostError(null);
      setCurrentDrafts(null);
      const params = new URLSearchParams();
      if (lostFrom) params.set("from", lostFrom);
      if (lostTo) params.set("to", lostTo);
      const res = await fetch(`/api/freight/lost-loads?${params.toString()}`);
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || "Failed to load lost loads"); }
      const data = await res.json();
      setLostLoads(data.loads || []);
    } catch (err: unknown) {
      setLostError(err instanceof Error ? err.message : "Failed to load lost loads");
    } finally { setLostLoading(false); }
  }

  async function handleRunAgentDraft(loadId: number) {
    try {
      setDraftsLoading(true);
      setAgentError(null);
      setCurrentDrafts(null);
      const res = await fetch(`/api/freight/loads/${loadId}/run-lost-load-agent`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ autoSend: false, maxEmails: 10 }) });
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || "Failed to run AI Lost Load Agent"); }
      const data: AgentDraftResponse = await res.json();
      setCurrentDrafts(data);
    } catch (err: unknown) {
      setAgentError(err instanceof Error ? err.message : "Error running AI Lost Load Agent");
    } finally { setDraftsLoading(false); }
  }

  async function handleRunPostmortem() {
    try {
      setPostmortemLoading(true);
      setPostmortemError(null);
      setPostmortemText(null);
      const res = await fetch("/api/freight/lost-postmortem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from: lostFrom, to: lostTo, filterShipper, filterRep, filterLane }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate postmortem");
      setPostmortemText(data.summary || "");
    } catch (err: unknown) {
      setPostmortemError(err instanceof Error ? err.message : "Error generating postmortem");
    } finally { setPostmortemLoading(false); }
  }

  const filteredLostLoads: Load[] = lostLoads.filter((load) => {
    if (filterShipper && (load.shipper?.name || load.shipperName) !== filterShipper) return false;
    if (filterRep && (load.salesRepName || load.repName) !== filterRep) return false;
    if (filterLane) {
      const origin = (load.pickupState || load.pickupCity || "?").toString().trim();
      const dest = (load.deliveryState || load.dropState || load.deliveryCity || load.dropCity || "?").toString().trim();
      if (`${origin} → ${dest}` !== filterLane) return false;
    }
    return true;
  });

  const activeLoads = activeTab === "AT_RISK" ? atRiskLoads : filteredLostLoads;
  const activeLoading = activeTab === "AT_RISK" ? atRiskLoading : lostLoading;
  const activeError = activeTab === "AT_RISK" ? atRiskError : lostError;
  const lostCount = lostLoads.length;
  const atRiskCount = atRiskLoads.length;

  const lostByShipper = (() => {
    const map = new Map<string, number>();
    for (const load of lostLoads) { const key = load.shipper?.name || load.shipperName || "Unknown Shipper"; map.set(key, (map.get(key) || 0) + 1); }
    return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
  })();

  const lostByRep = (() => {
    const map = new Map<string, number>();
    for (const load of lostLoads) { const key = load.salesRepName || load.repName || "Unassigned / Unknown"; map.set(key, (map.get(key) || 0) + 1); }
    return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
  })();

  const lostByLane = (() => {
    const map = new Map<string, number>();
    for (const load of lostLoads) {
      const origin = (load.pickupState || load.pickupCity || "?").toString().trim();
      const dest = (load.deliveryState || load.dropState || load.deliveryCity || load.dropCity || "?").toString().trim();
      const key = `${origin} → ${dest}`;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
  })();

  const maxShipperLost = lostByShipper[0]?.count || 1;
  const maxRepLost = lostByRep[0]?.count || 1;
  const maxLaneLost = lostByLane[0]?.count || 1;

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button onClick={() => setActiveTab("AT_RISK")} className={`whitespace-nowrap py-3 px-1 border-b-2 text-sm font-medium ${activeTab === "AT_RISK" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>At-Risk Loads</button>
          <button onClick={() => setActiveTab("LOST")} className={`whitespace-nowrap py-3 px-1 border-b-2 text-sm font-medium ${activeTab === "LOST" ? "border-red-500 text-red-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>Lost Loads</button>
        </nav>
      </div>

      {activeTab === "AT_RISK" && (
        <div className="flex items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Hours until pickup</label>
            <input type="number" min={1} value={hoursUntilPickup} onChange={(e) => setHoursUntilPickup(Number(e.target.value) || 1)} className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm w-24 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
          <button onClick={fetchAtRiskLoads} className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-sm rounded-md bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200">Refresh</button>
        </div>
      )}

      {activeTab === "LOST" && (
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Lost From</label>
            <input type="date" value={lostFrom} onChange={(e) => setLostFrom(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Lost To</label>
            <input type="date" value={lostTo} onChange={(e) => setLostTo(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
          <button onClick={fetchLostLoads} className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-sm rounded-md bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200">Refresh</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">At-Risk Loads</div>
          <div className="mt-1 text-2xl font-semibold text-yellow-600">{atRiskCount}</div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Loads within {hoursUntilPickup} hours of pickup without solid coverage.</p>
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Lost Loads (Filtered)</div>
          <div className="mt-1 text-2xl font-semibold text-red-600">{lostCount}</div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Loads marked LOST between {lostFrom || "start"} and {lostTo || "today"}.</p>
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">AI Rescue Activity</div>
          <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
            {currentDrafts ? (<>Last run: <span className="font-medium">Load #{currentDrafts.loadId}</span> – {currentDrafts.count} draft email{currentDrafts.count === 1 ? "" : "s"} generated.</>) : (<span className="text-gray-400">No AI rescue run yet in this session.</span>)}
          </div>
        </div>
      </div>

      {lostCount > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Lost Loads by Shipper</div>
            {lostByShipper.length === 0 ? <div className="text-xs text-gray-400">No data available.</div> : (
              <div className="space-y-2">
                {lostByShipper.map((item) => (
                  <div key={item.name} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded p-1 -mx-1 transition-colors" onClick={() => { setActiveTab("LOST"); setFilterShipper(item.name); }}>
                    <div className="flex justify-between text-xs"><span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[70%]">{item.name}</span><span className="text-gray-500 ml-2">{item.count}</span></div>
                    <div className="w-full bg-gray-100 dark:bg-gray-600 rounded-full h-2 mt-1"><div className="h-2 rounded-full bg-red-500" style={{ width: `${Math.max(8, (item.count / maxShipperLost) * 100)}%` }} /></div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Lost Loads by Rep</div>
            {lostByRep.length === 0 ? <div className="text-xs text-gray-400">No data available.</div> : (
              <div className="space-y-2">
                {lostByRep.map((item) => (
                  <div key={item.name} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded p-1 -mx-1 transition-colors" onClick={() => { setActiveTab("LOST"); setFilterRep(item.name); }}>
                    <div className="flex justify-between text-xs"><span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[70%]">{item.name}</span><span className="text-gray-500 ml-2">{item.count}</span></div>
                    <div className="w-full bg-gray-100 dark:bg-gray-600 rounded-full h-2 mt-1"><div className="h-2 rounded-full bg-yellow-500" style={{ width: `${Math.max(8, (item.count / maxRepLost) * 100)}%` }} /></div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Lost Loads by Lane</div>
            {lostByLane.length === 0 ? <div className="text-xs text-gray-400">No data available.</div> : (
              <div className="space-y-2">
                {lostByLane.map((item) => (
                  <div key={item.name} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded p-1 -mx-1 transition-colors" onClick={() => { setActiveTab("LOST"); setFilterLane(item.name); }}>
                    <div className="flex justify-between text-xs"><span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[70%]">{item.name}</span><span className="text-gray-500 ml-2">{item.count}</span></div>
                    <div className="w-full bg-gray-100 dark:bg-gray-600 rounded-full h-2 mt-1"><div className="h-2 rounded-full bg-blue-500" style={{ width: `${Math.max(8, (item.count / maxLaneLost) * 100)}%` }} /></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "LOST" && (filterShipper || filterRep || filterLane) && (
        <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
          <span className="text-gray-500 dark:text-gray-400">Filters:</span>
          {filterShipper && (<button onClick={() => setFilterShipper(null)} className="inline-flex items-center px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-700">Shipper: {filterShipper}<span className="ml-1 text-[10px]">✕</span></button>)}
          {filterRep && (<button onClick={() => setFilterRep(null)} className="inline-flex items-center px-2 py-1 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full border border-yellow-200 dark:border-yellow-700">Rep: {filterRep}<span className="ml-1 text-[10px]">✕</span></button>)}
          {filterLane && (<button onClick={() => setFilterLane(null)} className="inline-flex items-center px-2 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full border border-purple-200 dark:border-purple-700">Lane: {filterLane}<span className="ml-1 text-[10px]">✕</span></button>)}
          <button onClick={() => { setFilterShipper(null); setFilterRep(null); setFilterLane(null); }} className="ml-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400">Clear all</button>
        </div>
      )}

      {activeTab === "LOST" && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <button onClick={handleRunPostmortem} disabled={postmortemLoading || lostCount === 0} className="inline-flex items-center px-3 py-1.5 border border-purple-500 text-purple-700 dark:text-purple-300 text-xs font-medium rounded-md bg-white dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed">{postmortemLoading ? "Analyzing lost loads..." : "AI Postmortem for this view"}</button>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Uses only the currently filtered LOST loads to explain patterns and suggest actions.</p>
          </div>
          {postmortemError && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 text-xs px-3 py-2 rounded">{postmortemError}</div>}
          {postmortemText && <div className="border border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-xs leading-relaxed text-purple-900 dark:text-purple-200 max-h-64 overflow-y-auto whitespace-pre-wrap">{postmortemText}</div>}
        </div>
      )}

      {activeLoading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : activeError ? (
        <div className="text-center py-8 text-red-500">{activeError}</div>
      ) : activeLoads.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No loads found.</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Load</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Shipper</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Lane</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{activeTab === "AT_RISK" ? "Pickup" : "Lost At"}</th>
                  {activeTab === "AT_RISK" && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Hrs Left</th>}
                  {activeTab === "LOST" && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Reason</th>}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {activeLoads.slice(0, 50).map((load) => (
                  <tr key={load.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{load.tmsLoadId || load.reference || `#${load.id}`}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{load.shipper?.name || load.shipperName || load.customerName || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{load.pickupCity || load.pickupState || "?"} → {load.deliveryCity || load.dropCity || load.deliveryState || load.dropState || "?"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{activeTab === "AT_RISK" ? formatDateShort(load.pickupDate) : formatDateDisplay(load.lostAt)}</td>
                    {activeTab === "AT_RISK" && <td className="px-4 py-3 text-sm font-medium text-yellow-600">{load.hoursToPickup !== null ? `${load.hoursToPickup}h` : "-"}</td>}
                    {activeTab === "LOST" && <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{load.lostReasonRef?.name || load.lostReasonCategory || load.lostReason || "-"}</td>}
                    <td className="px-4 py-3">
                      <button onClick={() => handleRunAgentDraft(load.id)} disabled={draftsLoading} className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">{draftsLoading ? "..." : "AI Rescue"}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {agentError && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 text-sm px-4 py-3 rounded">{agentError}</div>}

      {currentDrafts && currentDrafts.drafts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">AI Draft Emails (Load #{currentDrafts.loadId})</h3>
          <div className="space-y-4">
            {currentDrafts.drafts.map((draft, i) => (
              <div key={i} className="border border-gray-200 dark:border-gray-700 rounded p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">To: {draft.to}</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">{draft.subject}</div>
                <div className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: draft.html }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
