import { useRouter } from 'next/router';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useTestMode } from '../../../contexts/TestModeContext';

interface Campaign {
  id: number;
  name: string;
  clientName: string | null;
  vertical: string | null;
  timezone: string | null;
  description: string | null;
  isActive: boolean;
  venture: { id: number; name: string };
  office: { id: number; name: string; city: string | null } | null;
  _count: { kpiRecords: number; dailyMetrics: number };
}

interface Metric {
  id: number;
  date: string;
  talkTimeMin: number | null;
  handledCalls: number | null;
  outboundCalls: number | null;
  leadsCreated: number | null;
  demosBooked: number | null;
  salesClosed: number | null;
  fteCount: number | null;
  avgQaScore: number | null;
  revenue: number | null;
  cost: number | null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function BpoCampaignDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { testMode, setTestMode } = useTestMode();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [cRes, mRes] = await Promise.all([
        fetch(`/api/bpo/campaigns/${id}`),
        fetch(`/api/bpo/campaigns/${id}/metrics?includeTest=${testMode ? 'true' : 'false'}`),
      ]);

      if (cRes.ok) {
        setCampaign(await cRes.json());
      }
      if (mRes.ok) {
        setMetrics(await mRes.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id, testMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!id) {
    return <div className="p-6 text-gray-500">Loading...</div>;
  }

  if (!loading && !campaign) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Campaign not found.</p>
        <Link href="/bpo/campaigns" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to Campaigns
        </Link>
      </div>
    );
  }

  const last7 = metrics.slice(-7);
  const sum = (key: keyof Metric) =>
    last7.reduce((s, m) => s + ((m[key] as number) || 0), 0);

  const outbound7 = sum('outboundCalls');
  const leads7 = sum('leadsCreated');
  const demos7 = sum('demosBooked');
  const sales7 = sum('salesClosed');
  const rev7 = sum('revenue');
  const cost7 = sum('cost');

  const conv7 = outbound7 > 0 ? leads7 / outbound7 : 0;
  const roi7 = cost7 > 0 ? (rev7 - cost7) / cost7 : 0;

  const avgQa7 =
    last7.length > 0
      ? last7.reduce((s, m) => s + ((m.avgQaScore as number) || 0), 0) / last7.length
      : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">{campaign?.name || 'Loading...'}</h1>
          <p className="text-sm text-gray-600">
            {[campaign?.clientName, campaign?.vertical, campaign?.timezone]
              .filter(Boolean)
              .join(' | ') || 'BPO Campaign'}
          </p>
          {campaign?.office && (
            <p className="text-xs text-gray-400 mt-1">
              Office: {campaign.office.name} {campaign.office.city && `(${campaign.office.city})`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTestMode(!testMode)}
            className={`px-3 py-1 rounded text-sm border ${
              testMode ? 'bg-yellow-200 border-yellow-400' : 'bg-gray-100'
            }`}
          >
            Test Mode: {testMode ? 'ON' : 'OFF'}
          </button>
          <Link
            href="/bpo/dashboard"
            className="px-3 py-1 rounded border text-sm bg-white hover:bg-gray-50"
          >
            Dashboard
          </Link>
          <Link
            href="/bpo/campaigns"
            className="px-3 py-1 rounded border text-sm bg-white hover:bg-gray-50"
          >
            All Campaigns
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="border rounded-lg p-3 bg-white">
              <div className="text-xs text-gray-500 mb-1">Outbound (7d)</div>
              <div className="font-semibold text-lg">{outbound7}</div>
              <div className="text-xs text-gray-500 mt-1">
                Leads: {leads7} | Demos: {demos7}
              </div>
            </div>
            <div className="border rounded-lg p-3 bg-white">
              <div className="text-xs text-gray-500 mb-1">Sales (7d)</div>
              <div className="font-semibold text-lg">{sales7}</div>
              <div className="text-xs text-gray-500 mt-1">
                Conv%: {(conv7 * 100).toFixed(1)}%
              </div>
            </div>
            <div className="border rounded-lg p-3 bg-white">
              <div className="text-xs text-gray-500 mb-1">ROI (7d)</div>
              <div className="font-semibold text-lg">{(roi7 * 100).toFixed(1)}%</div>
              <div className="text-xs text-gray-500 mt-1">
                Rev: {formatCurrency(rev7)} | Cost: {formatCurrency(cost7)}
              </div>
            </div>
            <div className="border rounded-lg p-3 bg-white">
              <div className="text-xs text-gray-500 mb-1">QA Score (7d)</div>
              <div className="font-semibold text-lg">
                {avgQa7 ? avgQa7.toFixed(1) : '—'}
              </div>
            </div>
          </div>

          <div className="border rounded-lg bg-white">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h2 className="font-semibold">Daily Metrics</h2>
              <span className="text-xs text-gray-500">
                {metrics.length} days of data
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-right">Outbound</th>
                    <th className="px-3 py-2 text-right">Handled</th>
                    <th className="px-3 py-2 text-right">Leads</th>
                    <th className="px-3 py-2 text-right">Demos</th>
                    <th className="px-3 py-2 text-right">Sales</th>
                    <th className="px-3 py-2 text-right">QA</th>
                    <th className="px-3 py-2 text-right">Revenue</th>
                    <th className="px-3 py-2 text-right">Cost</th>
                    <th className="px-3 py-2 text-right">FTE</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.length ? (
                    metrics.map(m => (
                      <tr key={m.id} className="border-t hover:bg-gray-50">
                        <td className="px-3 py-2">
                          {new Date(m.date).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2 text-right">{m.outboundCalls ?? 0}</td>
                        <td className="px-3 py-2 text-right">{m.handledCalls ?? 0}</td>
                        <td className="px-3 py-2 text-right">{m.leadsCreated ?? 0}</td>
                        <td className="px-3 py-2 text-right">{m.demosBooked ?? 0}</td>
                        <td className="px-3 py-2 text-right">{m.salesClosed ?? 0}</td>
                        <td className="px-3 py-2 text-right">
                          {m.avgQaScore != null ? m.avgQaScore.toFixed(1) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {m.revenue != null ? formatCurrency(m.revenue) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {m.cost != null ? formatCurrency(m.cost) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {m.fteCount != null ? m.fteCount.toFixed(1) : '—'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="px-3 py-4 text-center text-gray-500">
                        No BPO metrics yet. Import your dialer / CRM stats here.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {campaign?.description && (
            <div className="border rounded-lg bg-white p-4">
              <h3 className="font-medium mb-2">Description</h3>
              <p className="text-sm text-gray-600">{campaign.description}</p>
            </div>
          )}

          <p className="text-xs text-gray-400">
            Test Mode {testMode ? 'ON' : 'OFF'} — when OFF, test records are excluded.
          </p>
        </>
      )}
    </div>
  );
}
