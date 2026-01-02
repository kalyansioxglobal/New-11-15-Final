import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTestMode } from '../../contexts/TestModeContext';
import { GetServerSideProps } from "next";
import { Skeleton } from '@/components/ui/Skeleton';

interface CampaignCard {
  id: number;
  name: string;
  clientName: string | null;
  vertical: string | null;
  talkTimeMin: number;
  handledCalls: number;
  outboundCalls: number;
  leadsCreated: number;
  demosBooked: number;
  salesClosed: number;
  revenue: number;
  cost: number;
  conversion: number;
  roi: number;
  avgQa: number;
}

interface AgentRow {
  key: string;
  name: string;
  outboundCalls: number;
  leadsCreated: number;
  demosBooked: number;
  salesClosed: number;
  leadRate: number;
}

interface BpoDashboardData {
  summary: {
    totalTalk: number;
    totalHandled: number;
    totalOutbound: number;
    totalLeads: number;
    totalDemos: number;
    totalSales: number;
    totalRevenue: number;
    totalCost: number;
    portfolioConversion: number;
    portfolioRoi: number;
  };
  campaigns: CampaignCard[];
  leaderboard: AgentRow[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPct(value: number): string {
  return (value * 100).toFixed(1) + '%';
}

export default function BpoDashboardPage() {
  const { testMode, setTestMode } = useTestMode();
  const [data, setData] = useState<BpoDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [ventureId, setVentureId] = useState<number | null>(null);
  const [ventures, setVentures] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    fetch(`/api/ventures?types=BPO&includeTest=${testMode}`)
      .then(r => r.json())
      .then(d => {
        const bpoVentures = d as { id: number; name: string }[];
        setVentures(bpoVentures);
        if (bpoVentures.length === 1 && !ventureId) {
          setVentureId(bpoVentures[0].id);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testMode]);

  const loadData = async () => {
    if (!ventureId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('ventureId', String(ventureId));
      params.set('includeTest', testMode ? 'true' : 'false');
      const res = await fetch(`/api/bpo/dashboard?${params.toString()}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testMode, ventureId]);

  const sum = data?.summary;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">BPO Dashboard</h1>
          <p className="text-sm text-gray-600">
            Calls, leads, demos, sales & ROI across campaigns (7 days).
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {ventures.length > 0 && (
            <select
              value={ventureId || ''}
              onChange={e => setVentureId(e.target.value ? Number(e.target.value) : null)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="">Select BPO Venture</option>
              {ventures.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => setTestMode(!testMode)}
            className={`px-3 py-1 rounded text-sm border ${
              testMode ? 'bg-yellow-200 border-yellow-400' : 'bg-gray-100'
            }`}
          >
            Test Mode: {testMode ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={loadData}
            className="px-3 py-1 rounded border text-sm bg-white hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {!ventureId ? (
        <div className="text-center p-8 text-gray-500">
          Please select a BPO venture to view the dashboard.
        </div>
      ) : loading ? (
        <div className="flex justify-center p-8">
          <Skeleton className="w-full h-[85vh]" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="border rounded-xl p-4 bg-white">
              <div className="text-xs text-gray-500 mb-1">Outbound Calls (7d)</div>
              <div className="text-2xl font-semibold">{sum?.totalOutbound ?? '--'}</div>
              <div className="text-xs text-gray-500 mt-1">
                Handled: {sum?.totalHandled ?? '--'}
              </div>
            </div>

            <div className="border rounded-xl p-4 bg-white">
              <div className="text-xs text-gray-500 mb-1">Leads (7d)</div>
              <div className="text-2xl font-semibold text-green-700">
                {sum?.totalLeads ?? '--'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Demos: {sum?.totalDemos ?? '--'}
              </div>
            </div>

            <div className="border rounded-xl p-4 bg-white">
              <div className="text-xs text-gray-500 mb-1">Sales (7d)</div>
              <div className="text-2xl font-semibold text-blue-700">
                {sum?.totalSales ?? '--'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Conv%: {sum ? formatPct(sum.portfolioConversion) : '--'}
              </div>
            </div>

            <div className="border rounded-xl p-4 bg-white">
              <div className="text-xs text-gray-500 mb-1">ROI (7d)</div>
              <div className="text-2xl font-semibold">
                {sum ? formatPct(sum.portfolioRoi) : '--'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Rev: {sum ? formatCurrency(sum.totalRevenue) : '--'} | Cost: {sum ? formatCurrency(sum.totalCost) : '--'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="border rounded-xl bg-white p-4 lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Campaigns (7d Performance)</h2>
                <Link href="/bpo/campaigns" className="text-xs text-blue-600 hover:underline">
                  View All
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Campaign</th>
                      <th className="px-3 py-2 text-left">Client</th>
                      <th className="px-3 py-2 text-right">Outbound</th>
                      <th className="px-3 py-2 text-right">Leads</th>
                      <th className="px-3 py-2 text-right">Demos</th>
                      <th className="px-3 py-2 text-right">Sales</th>
                      <th className="px-3 py-2 text-right">Conv%</th>
                      <th className="px-3 py-2 text-right">ROI%</th>
                      <th className="px-3 py-2 text-right">QA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.campaigns?.length ? (
                      data.campaigns.map(c => (
                        <tr key={c.id} className="border-t hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <Link
                              href={`/bpo/campaigns/${c.id}`}
                              className="text-blue-600 hover:underline"
                            >
                              {c.name}
                            </Link>
                          </td>
                          <td className="px-3 py-2 text-gray-600">{c.clientName || '—'}</td>
                          <td className="px-3 py-2 text-right">{c.outboundCalls}</td>
                          <td className="px-3 py-2 text-right">{c.leadsCreated}</td>
                          <td className="px-3 py-2 text-right">{c.demosBooked}</td>
                          <td className="px-3 py-2 text-right">{c.salesClosed}</td>
                          <td className="px-3 py-2 text-right">{formatPct(c.conversion)}</td>
                          <td className="px-3 py-2 text-right">{formatPct(c.roi)}</td>
                          <td className="px-3 py-2 text-right">
                            {c.avgQa ? c.avgQa.toFixed(1) : '—'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="px-3 py-4 text-center text-gray-500">
                          No campaigns yet. Create BPO campaigns for this venture.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="border rounded-xl bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Agent Leaderboard (7d)</h2>
                <span className="text-xs text-gray-500">Ranked by leads</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Agent</th>
                      <th className="px-3 py-2 text-right">Outbound</th>
                      <th className="px-3 py-2 text-right">Leads</th>
                      <th className="px-3 py-2 text-right">Demos</th>
                      <th className="px-3 py-2 text-right">Sales</th>
                      <th className="px-3 py-2 text-right">Lead%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.leaderboard?.length ? (
                      data.leaderboard.map(a => (
                        <tr key={a.key} className="border-t">
                          <td className="px-3 py-2">{a.name}</td>
                          <td className="px-3 py-2 text-right">{a.outboundCalls}</td>
                          <td className="px-3 py-2 text-right">{a.leadsCreated}</td>
                          <td className="px-3 py-2 text-right">{a.demosBooked}</td>
                          <td className="px-3 py-2 text-right">{a.salesClosed}</td>
                          <td className="px-3 py-2 text-right">{formatPct(a.leadRate)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-3 py-4 text-center text-gray-500">
                          No agent metrics yet. Import BPO agent stats.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Test Mode {testMode ? 'ON' : 'OFF'} — when OFF, test records are excluded.
          </p>
        </>
      )}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};
