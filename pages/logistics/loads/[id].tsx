import { useRouter } from 'next/router';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  getLostReasonConfig,
  LOST_REASON_OPTIONS,
} from '@/lib/logisticsLostReasons';

interface LoadDetail {
  id: number;
  reference: string | null;
  shipperName: string | null;
  customerName: string | null;
  pickupCity: string;
  pickupState: string;
  pickupZip: string | null;
  pickupDate: string;
  dropCity: string;
  dropState: string;
  dropZip: string | null;
  dropDate: string | null;
  equipmentType: string;
  weightLbs: number | null;
  rate: number | null;
  buyRate: number | null;
  sellRate: number | null;
  status: string;
  lostReason: string | null;
  lostReasonCategory: string | null;
  dormantReason: string | null;
  notes: string | null;
  isTest: boolean;
  createdAt: string;
  venture: { id: number; name: string };
  office: { id: number; name: string; city: string | null } | null;
  carrier: { id: number; name: string; mcNumber: string | null } | null;
  shipper: { id: number; name: string; city: string | null; state: string | null } | null;
  createdBy: { id: number; name: string | null; email: string };
}

interface CarrierMatch {
  carrierId: number;
  carrierName: string;
  totalScore: number;
  reasons: string[];
  onTimePercentage?: number | null;
  fmcsaHealth?: {
    authorized: boolean | null;
    complianceStatus?: string | null;
    mcNumber?: string | null;
    dotNumber?: string | null;
    lastSyncedAt?: string | null;
  };
  components?: {
    bonusScore?: number;
    [key: string]: number | undefined;
  };
}

const STATUS_OPTIONS = ['OPEN', 'WORKING', 'COVERED', 'LOST', 'DORMANT', 'MAYBE'];

function formatCurrency(amount: number | null): string {
  if (amount === null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function LoadDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [load, setLoad] = useState<LoadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState('');
  const [lostReasonCategory, setLostReasonCategory] = useState('');
  const [lostReason, setLostReason] = useState('');
  const [dormantReason, setDormantReason] = useState('');
  const [notes, setNotes] = useState('');
  const [lostReasonWarning, setLostReasonWarning] = useState('');
  
  // Carrier matching states
  const [carrierMatches, setCarrierMatches] = useState<CarrierMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [onlyAuthorized, setOnlyAuthorized] = useState(true);

  const loadMatches = useCallback(async () => {
    if (!id) return;
    setLoadingMatches(true);
    setMatchesError(null);
    try {
      const res = await fetch(
        `/api/freight/loads/${id}/matches?onlyAuthorized=${onlyAuthorized ? 'true' : 'false'}&maxResults=10`,
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load matches');
      }
      const data = await res.json();
      setCarrierMatches((data.matches || []) as CarrierMatch[]);
    } catch (e: any) {
      setMatchesError(e.message || 'Failed to load matches');
      setCarrierMatches([]);
    } finally {
      setLoadingMatches(false);
    }
  }, [id, onlyAuthorized]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/logistics/loads/${id}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to load');
      }
      const data = await res.json();
      setLoad(data);
      setStatus(data.status);
      setLostReasonCategory(data.lostReasonCategory || '');
      setLostReason(data.lostReason || '');
      setDormantReason(data.dormantReason || '');
      setNotes(data.notes || '');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const cfg = getLostReasonConfig(lostReasonCategory || undefined);

  const handleSave = async () => {
    if (!id) return;

    if (status === 'LOST' && !lostReasonCategory) {
      setLostReasonWarning('Please select a lost reason category before saving.');
      return;
    }
    setLostReasonWarning('');

    setSaving(true);
    try {
      const res = await fetch(`/api/logistics/loads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          lostReasonCategory: status === 'LOST' ? lostReasonCategory : null,
          lostReason: status === 'LOST' ? lostReason : null,
          dormantReason: status === 'DORMANT' ? dormantReason : null,
          notes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save');
      }

      const updated = await res.json();
      setLoad(updated);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!id) {
    return <div className="p-6 text-gray-500">Loading...</div>;
  }

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !load) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error || 'Load not found'}</p>
        <Link href="/logistics/dashboard" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const lane = `${load.pickupCity}, ${load.pickupState} → ${load.dropCity}, ${load.dropState}`;
  const margin = load.sellRate && load.buyRate ? load.sellRate - load.buyRate : null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">
            Load #{load.id}
            {load.reference && <span className="text-gray-500 ml-2">({load.reference})</span>}
          </h1>
          <p className="text-sm text-gray-600">{lane}</p>
          {load.isTest && (
            <span className="inline-block mt-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded">
              Test Load
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/logistics/dashboard"
            className="px-3 py-1 rounded border text-sm bg-white hover:bg-gray-50"
          >
            Dashboard
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="border rounded-lg bg-white p-4">
            <h2 className="font-semibold mb-3">Load Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <div className="text-xs text-gray-500">Shipper</div>
                <div>{load.shipperName || load.shipper?.name || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Customer</div>
                <div>{load.customerName || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Equipment</div>
                <div>{load.equipmentType}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Weight</div>
                <div>{load.weightLbs ? `${load.weightLbs.toLocaleString()} lbs` : '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Pickup</div>
                <div>{load.pickupCity}, {load.pickupState}</div>
                <div className="text-xs text-gray-400">
                  {new Date(load.pickupDate).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Drop</div>
                <div>{load.dropCity}, {load.dropState}</div>
                {load.dropDate && (
                  <div className="text-xs text-gray-400">
                    {new Date(load.dropDate).toLocaleDateString()}
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs text-gray-500">Buy Rate</div>
                <div>{formatCurrency(load.buyRate)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Sell Rate</div>
                <div>{formatCurrency(load.sellRate)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Margin</div>
                <div className={margin && margin > 0 ? 'text-green-700' : margin && margin < 0 ? 'text-red-600' : ''}>
                  {formatCurrency(margin)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Carrier</div>
                <div>{load.carrier?.name || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Created By</div>
                <div>{load.createdBy?.name || load.createdBy?.email || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Created</div>
                <div>{new Date(load.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
          </div>

          <div className="border rounded-lg bg-white p-4">
            <h2 className="font-semibold mb-3">Status & Notes</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <label className="block mb-1 text-xs text-gray-500">Status</label>
                <select
                  className="w-full border rounded px-2 py-1"
                  value={status}
                  onChange={e => {
                    setStatus(e.target.value);
                    if (e.target.value !== 'LOST') {
                      setLostReasonWarning('');
                    }
                  }}
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-1 text-xs text-gray-500">Notes</label>
                <textarea
                  className="w-full border rounded px-2 py-1 min-h-[60px]"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add internal notes..."
                />
              </div>
            </div>

            {status === 'LOST' && (
              <div className="border-t pt-3 mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="md:col-span-1">
                  <label className="block mb-1">Lost Reason Category</label>
                  <select
                    className="w-full border rounded px-2 py-1"
                    value={lostReasonCategory}
                    onChange={e => setLostReasonCategory(e.target.value)}
                  >
                    <option value="">-- Select Category --</option>
                    {LOST_REASON_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {cfg && (
                    <p className="mt-2 text-xs text-gray-600">
                      {cfg.description}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2 space-y-2">
                  <div>
                    <label className="block mb-1">
                      Lost Reason Details{' '}
                      <span className="text-xs text-gray-400">(what actually happened?)</span>
                    </label>
                    <textarea
                      className="w-full border rounded px-2 py-1 min-h-[60px]"
                      value={lostReason}
                      onChange={e => setLostReason(e.target.value)}
                      placeholder="Example: Shipper had another carrier at $2.10/mile, we were at $2.35; they confirmed via email at 3:42 PM."
                    />
                  </div>

                  {cfg && (
                    <div className="mt-2 border rounded-md bg-gray-50 p-2">
                      <div className="text-xs font-semibold mb-1">
                        SOP checklist for this loss
                      </div>
                      <ul className="list-disc pl-4 space-y-0.5 text-xs text-gray-700">
                        {cfg.sopSteps.map(step => (
                          <li key={step}>{step}</li>
                        ))}
                      </ul>
                      <div className="mt-2 text-xs text-gray-500">
                        Coaching prompts for 1:1 or huddle:
                      </div>
                      <ul className="list-disc pl-4 space-y-0.5 text-xs text-gray-600">
                        {cfg.coachingQuestions.map(q => (
                          <li key={q}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {lostReasonWarning && (
                  <div className="md:col-span-3 text-xs text-red-600">
                    {lostReasonWarning}
                  </div>
                )}
              </div>
            )}

            {status === 'DORMANT' && (
              <div className="border-t pt-3 mt-3 text-sm">
                <label className="block mb-1">Dormant Reason</label>
                <textarea
                  className="w-full border rounded px-2 py-1 min-h-[60px]"
                  value={dormantReason}
                  onChange={e => setDormantReason(e.target.value)}
                  placeholder="Why is this load dormant?"
                />
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="border rounded-lg bg-white p-4">
            <h2 className="font-semibold mb-3">Context</h2>
            <div className="text-sm space-y-2">
              <div>
                <div className="text-xs text-gray-500">Venture</div>
                <div>{load.venture?.name}</div>
              </div>
              {load.office && (
                <div>
                  <div className="text-xs text-gray-500">Office</div>
                  <div>{load.office.name} {load.office.city && `(${load.office.city})`}</div>
                </div>
              )}
              {load.shipper && (
                <div>
                  <div className="text-xs text-gray-500">Shipper Profile</div>
                  <div>
                    <Link
                      href={`/logistics/shippers`}
                      className="text-blue-600 hover:underline"
                    >
                      {load.shipper.name}
                    </Link>
                    {load.shipper.city && (
                      <span className="text-gray-500 text-xs ml-1">
                        ({load.shipper.city}, {load.shipper.state})
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border rounded-lg bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Carrier Matches</h2>
              <label className="flex items-center text-xs">
                <input
                  type="checkbox"
                  checked={onlyAuthorized}
                  onChange={(e) => setOnlyAuthorized(e.target.checked)}
                  className="mr-1"
                />
                Authorized only
              </label>
            </div>
            
            {loadingMatches ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              </div>
            ) : matchesError ? (
              <div className="text-red-600 text-sm py-2">{matchesError}</div>
            ) : carrierMatches.length === 0 ? (
              <div className="text-gray-500 text-sm py-2">No matches found</div>
            ) : (
              <div className="space-y-2">
                {carrierMatches.slice(0, 5).map((match) => (
                  <div key={match.carrierId} className="border rounded p-2 text-sm">
                    <div className="font-medium">{match.carrierName}</div>
                    <div className="text-xs text-gray-600">
                      Score: {match.totalScore.toFixed(1)}
                      {match.onTimePercentage !== null && match.onTimePercentage !== undefined && (
                        <span className="ml-2">
                          On-time: {match.onTimePercentage.toFixed(1)}%
                        </span>
                      )}
                    </div>
                    {match.reasons && match.reasons.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {match.reasons.slice(0, 2).join(', ')}
                        {match.reasons.length > 2 && '...'}
                      </div>
                    )}
                  </div>
                ))}
                {carrierMatches.length > 5 && (
                  <div className="text-xs text-gray-500 text-center py-1">
                    +{carrierMatches.length - 5} more matches
                  </div>
                )}
              </div>
            )}
          </div>

          {cfg && status === 'LOST' && (
            <div className="border rounded-lg bg-amber-50 border-amber-200 p-4">
              <h2 className="font-semibold text-amber-800 mb-2">KPI Impact</h2>
              <p className="text-xs text-amber-700">{cfg.kpiImpact}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
