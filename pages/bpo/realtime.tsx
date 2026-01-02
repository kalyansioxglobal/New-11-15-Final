import { GetServerSideProps } from 'next';
import { useState, useEffect, useCallback } from 'react';
import { getEffectiveUser } from '@/lib/effectiveUser';
import type { PageWithLayout } from '@/types/page';
import { Skeleton } from '@/components/ui/Skeleton';

type AgentStats = {
  id: number;
  name: string;
  avatarUrl: string | null;
  campaignName: string;
  status: 'online' | 'busy' | 'idle' | 'offline';
  callsToday: number;
  connectedCalls: number;
  talkTimeMin: number;
  leadsToday: number;
  demosToday: number;
  salesToday: number;
  lastCallAt: string | null;
  connectionRate: number;
};

type CampaignStats = {
  id: number;
  name: string;
  clientName: string;
  totalCalls: number;
  connectedCalls: number;
  connectionRate: number;
  leads: number;
  demos: number;
  sales: number;
  revenue: number;
  activeAgents: number;
};

type Summary = {
  totalAgents: number;
  onlineAgents: number;
  busyAgents: number;
  idleAgents: number;
  offlineAgents: number;
  totalCallsToday: number;
  connectedCallsToday: number;
  leadsToday: number;
  salesToday: number;
  totalRevenue: number;
};

type RealtimeData = {
  timestamp: string;
  summary: Summary;
  agents: AgentStats[];
  campaigns: CampaignStats[];
};

type Venture = { id: number; name: string; type: string };

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const user = await getEffectiveUser(ctx.req, ctx.res);
  if (!user) {
    return { redirect: { destination: '/login', permanent: false } };
  }
  const allowedRoles = ['CEO', 'ADMIN', 'COO', 'VENTURE_HEAD', 'OFFICE_MANAGER', 'TEAM_LEAD'];
  if (!allowedRoles.includes(user.role)) {
    return { redirect: { destination: '/overview', permanent: false } };
  }
  return { props: {} };
};

function BpoRealtimePage() {
  const [ventures, setVentures] = useState<Venture[]>([]);
  const [selectedVentureId, setSelectedVentureId] = useState<number | null>(null);
  const [data, setData] = useState<RealtimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetch('/api/ventures?types=BPO')
      .then((r) => r.json())
      .then((v) => {
        setVentures(v);
        if (v.length > 0) {
          setSelectedVentureId(v[0].id);
        }
      })
      .catch(() => setError('Failed to load ventures'));
  }, []);

  const fetchData = useCallback(async () => {
    if (!selectedVentureId) return;
    try {
      const res = await fetch(`/api/bpo/realtime-stats?ventureId=${selectedVentureId}`);
      if (!res.ok) throw new Error('Failed to fetch data');
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [selectedVentureId]);

  useEffect(() => {
    if (selectedVentureId) {
      setLoading(true);
      fetchData();
    }
  }, [selectedVentureId, fetchData]);

  useEffect(() => {
    if (!autoRefresh || !selectedVentureId) return;
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedVentureId, fetchData]);

  const statusColor = (status: string) => {
    switch (status) {
      case 'busy': return 'bg-red-500';
      case 'online': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const formatPercent = (val: number) => `${Math.round(val * 100)}%`;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Real-time Agent Dashboard</h1>
          <p className="text-sm text-gray-500">
            {lastUpdated && `Last updated: ${lastUpdated.toLocaleTimeString()}`}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedVentureId || ''}
            onChange={(e) => setSelectedVentureId(Number(e.target.value))}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            {ventures.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh (10s)
          </label>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            Refresh Now
          </button>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>}

      {loading && !data && (
        <Skeleton className='w-full h-[85vh]' />
     )}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-3xl font-bold text-green-600">{data.summary.onlineAgents}</div>
              <div className="text-sm text-gray-500">Online Agents</div>
              <div className="text-xs text-gray-400 mt-1">
                {data.summary.busyAgents} busy, {data.summary.idleAgents} idle
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-3xl font-bold text-blue-600">{data.summary.totalCallsToday}</div>
              <div className="text-sm text-gray-500">Calls Today</div>
              <div className="text-xs text-gray-400 mt-1">
                {data.summary.connectedCallsToday} connected
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-3xl font-bold text-purple-600">{data.summary.leadsToday}</div>
              <div className="text-sm text-gray-500">Leads Today</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-3xl font-bold text-amber-600">{data.summary.salesToday}</div>
              <div className="text-sm text-gray-500">Sales Today</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(data.summary.totalRevenue)}
              </div>
              <div className="text-sm text-gray-500">Revenue Today</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50">
                <h2 className="font-semibold">Agent Status</h2>
              </div>
              <div className="divide-y max-h-[400px] overflow-y-auto">
                {data.agents.map((agent) => (
                  <div key={agent.id} className="px-4 py-3 flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${statusColor(agent.status)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{agent.name}</div>
                      <div className="text-xs text-gray-500">{agent.campaignName}</div>
                    </div>
                    <div className="text-right text-sm">
                      <div>{agent.callsToday} calls</div>
                      <div className="text-xs text-gray-500">
                        {formatPercent(agent.connectionRate)} connect
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-green-600">{agent.leadsToday} leads</div>
                      <div className="text-amber-600">{agent.salesToday} sales</div>
                    </div>
                  </div>
                ))}
                {data.agents.length === 0 && (
                  <div className="px-4 py-8 text-center text-gray-500">No agents found</div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50">
                <h2 className="font-semibold">Campaign Performance</h2>
              </div>
              <div className="divide-y max-h-[400px] overflow-y-auto">
                {data.campaigns.map((camp) => (
                  <div key={camp.id} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-medium">{camp.name}</div>
                        <div className="text-xs text-gray-500">{camp.clientName}</div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {camp.activeAgents} active agents
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center text-sm">
                      <div>
                        <div className="font-semibold">{camp.totalCalls}</div>
                        <div className="text-xs text-gray-500">Calls</div>
                      </div>
                      <div>
                        <div className="font-semibold text-purple-600">{camp.leads}</div>
                        <div className="text-xs text-gray-500">Leads</div>
                      </div>
                      <div>
                        <div className="font-semibold text-amber-600">{camp.sales}</div>
                        <div className="text-xs text-gray-500">Sales</div>
                      </div>
                      <div>
                        <div className="font-semibold text-green-600">
                          {formatCurrency(camp.revenue)}
                        </div>
                        <div className="text-xs text-gray-500">Revenue</div>
                      </div>
                    </div>
                  </div>
                ))}
                {data.campaigns.length === 0 && (
                  <div className="px-4 py-8 text-center text-gray-500">No campaigns found</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

(BpoRealtimePage as PageWithLayout).title = 'BPO Real-time Dashboard';
export default BpoRealtimePage;
