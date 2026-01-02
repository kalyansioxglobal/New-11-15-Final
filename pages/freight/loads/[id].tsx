import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";
import { getValidNextStatuses } from "@/lib/freight/loadStatus";

const COMPONENT_LABELS: Record<string, string> = {
  distanceScore: 'Distance score',
  equipmentScore: 'Equipment score',
  preferredLaneScore: 'Preferred lane score',
  bonusScore: 'Bonus score',
  onTimeScore: 'On-time score',
  capacityScore: 'Capacity score',
  penaltyScore: 'Penalty score',
};

type Contact = {
  id: number;
  channel: string;
  subject: string | null;
  body: string | null;
  outcome: string | null;
  notes: string | null;
  createdAt: string;
  carrier: { id: number; name: string };
  madeBy: { id: number; name: string };
};

type Load = {
  id: number;
  reference: string | null;
  shipperName: string | null;
  shipperRef: string | null;
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
  currency: string;
  status?: string; // Legacy field
  loadStatus?: string; // Primary field from schema
  lostReason: string | null;
  lostReasonCategory: string | null;
  dormantReason: string | null;
  notes: string | null;
  lastCarrierDropNotificationAt: string | null;
  venture: { id: number; name: string };
  office: { id: number; name: string } | null;
  carrier: { id: number; name: string; mcNumber: string | null; email: string | null; phone: string | null } | null;
  createdBy: { id: number; name: string };
  contacts: Contact[];
};

type LoadUpdate = {
  status?: string;
  carrierId?: number | null;
  lostReason?: string | null;
  lostReasonCategory?: string | null;
  dormantReason?: string | null;
  notes?: string | null;
  buyRate?: number | null;
  sellRate?: number | null;
};

const LOST_REASON_OPTIONS = [
  { value: "", label: "Select reason category" },
  { value: "RATE", label: "Rate too high / undercut by other broker" },
  { value: "NO_TRUCK", label: "No truck / capacity available" },
  { value: "LATE_QUOTE", label: "Quote sent too late" },
  { value: "SHIPPER_CANCELED", label: "Shipper canceled / changed plan" },
  { value: "CARRIER_REJECTED", label: "Carrier rejected terms" },
  { value: "INTERNAL_ERROR", label: "Internal error / miscommunication" },
  { value: "OTHER", label: "Other" },
];

type MatchedCarrier = {
  id: number;
  name: string;
  mcNumber: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  rating: number | null;
  loadCount: number;
  score: number;
  matchReason: string[];
};

const STATUS_OPTIONS = ["OPEN", "WORKING", "COVERED", "IN_TRANSIT", "DELIVERED", "LOST", "DORMANT", "MAYBE"];

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800 border-blue-200",
  WORKING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  COVERED: "bg-green-100 text-green-800 border-green-200",
  IN_TRANSIT: "bg-indigo-100 text-indigo-800 border-indigo-200",
  DELIVERED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  LOST: "bg-red-100 text-red-800 border-red-200",
  DORMANT: "bg-gray-100 text-gray-800 border-gray-200",
  MAYBE: "bg-purple-100 text-purple-800 border-purple-200",
};

function StatusActionsCard({
  load,
  updating,
  onUpdateLoad,
}: {
  load: Load;
  updating: boolean;
  onUpdateLoad: (updates: LoadUpdate) => Promise<void>;
}) {
  // Use loadStatus (primary) or status (legacy) for backward compatibility
  const currentStatus = load.loadStatus || load.status || "OPEN";
  
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [lostReasonCategory, setLostReasonCategory] = useState(load.lostReasonCategory || "");
  const [lostReason, setLostReason] = useState(load.lostReason || "");
  const [dormantReason, setDormantReason] = useState(load.dormantReason || "");
  const [warning, setWarning] = useState("");

  useEffect(() => {
    setLostReasonCategory(load.lostReasonCategory || "");
    setLostReason(load.lostReason || "");
    setDormantReason(load.dormantReason || "");
  }, [load.lostReasonCategory, load.lostReason, load.dormantReason]);

  const handleStatusClick = (status: string) => {
    if (status === "LOST") {
      setPendingStatus("LOST");
    } else if (status === "DORMANT") {
      setPendingStatus("DORMANT");
    } else {
      onUpdateLoad({ status });
    }
  };

  const handleSaveLostReason = async () => {
    setWarning("");
    if (!lostReasonCategory && !lostReason) {
      setWarning("Please choose a category and/or enter a reason for losing this load.");
    }
    await onUpdateLoad({
      status: "LOST",
      lostReasonCategory: lostReasonCategory || null,
      lostReason: lostReason || null,
    });
    setPendingStatus(null);
  };

  const handleSaveDormantReason = async () => {
    await onUpdateLoad({
      status: "DORMANT",
      dormantReason: dormantReason || null,
    });
    setPendingStatus(null);
  };

  const showLostForm = currentStatus === "LOST" || pendingStatus === "LOST";
  const showDormantForm = currentStatus === "DORMANT" || pendingStatus === "DORMANT";

  // Get valid next statuses based on current status
  const validNextStatuses = getValidNextStatuses(currentStatus as 'OPEN' | 'WORKING' | 'QUOTED' | 'AT_RISK' | 'COVERED' | 'IN_TRANSIT' | 'DELIVERED' | 'LOST' | 'FELL_OFF' | 'DORMANT');
  // Always show current status and valid next statuses
  const availableStatuses = [
    currentStatus, // Current status (for display)
    ...validNextStatuses.filter(s => s !== currentStatus) // Valid next statuses
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="font-semibold text-lg mb-4">Status & Actions</h2>
      <div className="mb-2">
        <span className="text-xs text-gray-500">Current Status: </span>
        <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[currentStatus] || "bg-gray-100"}`}>
          {currentStatus}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {availableStatuses.map((status) => {
          const isCurrent = currentStatus === status;
          const isValidNext = validNextStatuses.includes(status as any);
          return (
            <button
              key={status}
              disabled={updating || isCurrent || (!isValidNext && !isCurrent)}
              onClick={() => handleStatusClick(status)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                isCurrent
                  ? STATUS_COLORS[status]
                  : isValidNext
                  ? "bg-white border-blue-300 text-blue-700 hover:bg-blue-50"
                  : "bg-white border-gray-200 text-gray-400 cursor-not-allowed"
              } disabled:opacity-50`}
              title={isCurrent ? "Current status" : isValidNext ? "Click to change status" : "Invalid transition"}
            >
              {status === "COVERED" ? "Assigned" : status === "IN_TRANSIT" ? "In Transit" : status.replace(/_/g, " ")}
            </button>
          );
        })}
      </div>

      {showLostForm && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Lost Reason Category</label>
            <select
              className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm"
              value={lostReasonCategory}
              onChange={(e) => setLostReasonCategory(e.target.value)}
            >
              {LOST_REASON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Lost Reason Details{" "}
              <span className="text-xs text-gray-400">(what actually happened?)</span>
            </label>
            <textarea
              className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm min-h-[80px]"
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              placeholder="Example: Shipper had another carrier at $2.10/mile, we were at $2.35; they confirmed via email at 3:42 PM."
            />
          </div>
          {warning && <p className="text-sm text-red-600">{warning}</p>}
          {pendingStatus === "LOST" && (
            <div className="flex gap-2">
              <button
                onClick={handleSaveLostReason}
                disabled={updating}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {updating ? "Saving..." : "Mark as Lost"}
              </button>
              <button
                onClick={() => setPendingStatus(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          )}
          {currentStatus === "LOST" && !pendingStatus && (
            <button
              onClick={() => onUpdateLoad({ lostReasonCategory, lostReason } as any)}
              disabled={updating}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900 disabled:opacity-50"
            >
              {updating ? "Saving..." : "Update Reason"}
            </button>
          )}
        </div>
      )}

      {showDormantForm && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Dormant Reason</label>
            <textarea
              className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm min-h-[60px]"
              value={dormantReason}
              onChange={(e) => setDormantReason(e.target.value)}
              placeholder="Why is this load on hold?"
            />
          </div>
          {pendingStatus === "DORMANT" && (
            <div className="flex gap-2">
              <button
                onClick={handleSaveDormantReason}
                disabled={updating}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
              >
                {updating ? "Saving..." : "Mark as Dormant"}
              </button>
              <button
                onClick={() => setPendingStatus(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          )}
          {currentStatus === "DORMANT" && !pendingStatus && (
            <button
              onClick={() => onUpdateLoad({ dormantReason } as any)}
              disabled={updating}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900 disabled:opacity-50"
            >
              {updating ? "Saving..." : "Update Reason"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function LoadDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [load, setLoad] = useState<Load | null>(null);
  const [matchedCarriers, setMatchedCarriers] = useState<MatchedCarrier[]>([]);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [breakdownError, setBreakdownError] = useState<string | null>(null);
  const [selectedBreakdown, setSelectedBreakdown] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [notifyResult, setNotifyResult] = useState<{ sent: number; error?: string } | null>(null);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/freight/loads/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Load not found");
        return r.json();
      })
      .then((data) => {
        setLoad(data.load);
        setLoading(false);

        fetch(
          `/api/freight/carriers/match?pickupState=${data.load.pickupState}&dropState=${data.load.dropState}&equipmentType=${encodeURIComponent(data.load.equipmentType)}`
        )
          .then((r) => r.json())
          .then((data) => setMatchedCarriers(data.carriers || []))
          .catch(() => {});
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  const updateLoad = async (updates: LoadUpdate) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/freight/loads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setLoad((prev) => (prev ? { ...prev, ...data.load } : prev));
      } else {
        const errorData = await res.json().catch(() => ({ error: "Failed to update load" }));
        console.error("Failed to update load:", errorData);
        alert(errorData.error || errorData.detail || "Failed to update load. Please check the console for details.");
      }
    } catch (err: any) {
      console.error("Error updating load:", err);
      alert(err.message || "An error occurred while updating the load.");
    } finally {
      setUpdating(false);
    }
  };

  const assignCarrier = async (carrierId: number) => {
    await updateLoad({ carrierId, status: "COVERED" });
  };

  const notifyCarriers = async () => {
    setNotifying(true);
    setNotifyResult(null);
    try {
      const res = await fetch(`/api/freight/loads/${id}/notify-carriers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxCarriers: 5, channels: ["email"] }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotifyResult({ sent: data.sent, error: data.error });
        if (data.sent > 0) {
          setLoad((prev) =>
            prev ? { ...prev, lastCarrierDropNotificationAt: new Date().toISOString() } : prev
          );
          const refreshRes = await fetch(`/api/freight/loads/${id}`);
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            setLoad(refreshData.load);
          }
        }
      } else {
        setNotifyResult({ sent: 0, error: data.error || "Failed to notify carriers" });
      }
    } catch (err: any) {
      setNotifyResult({ sent: 0, error: err.message || "Failed to notify carriers" });
    } finally {
      setNotifying(false);
    }
  };

  const openBreakdown = async (carrier: MatchedCarrier) => {
    setBreakdownError(null);
    setSelectedBreakdown(null);
    setBreakdownOpen(true);

    // If carrier already has detailed breakdown in object, use it
    // Our matchedCarriers entries from /api/freight/carriers/match do not include components,
    // so fetch load-level matches which contain component breakdowns.
    setBreakdownLoading(true);
    try {
      const res = await fetch(`/api/freight/loads/${id}/matches`);
      if (!res.ok) throw new Error('Failed to fetch breakdown');
      const data = await res.json();
      const found = (data.matches || []).find((m: any) => m.carrierId === carrier.id || m.carrierName === carrier.name);
      if (!found) throw new Error('Breakdown not available for this carrier');
      setSelectedBreakdown(found);
    } catch (err: any) {
      setBreakdownError(err.message || 'Error loading breakdown');
    } finally {
      setBreakdownLoading(false);
    }
  };

  if (loading) {
    return <Skeleton className="w-full h-[85vh]" />;
  }

  if (error || !load) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error || "Load not found"}</p>
        <Link href="/freight/loads" className="text-blue-600 underline text-sm mt-2 inline-block">
          Back to loads
        </Link>
      </div>
    );
  }

  // Calculate current status after null check
  const currentLoadStatus = load.loadStatus || load.status || "OPEN";
  const canNotify = ["OPEN", "WORKING", "AT_RISK", "MAYBE"].includes(currentLoadStatus) && !load.carrier;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">
              {load.reference || `Load #${load.id}`}
            </h1>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium border ${
                STATUS_COLORS[currentLoadStatus] || "bg-gray-100"
              }`}
            >
              {currentLoadStatus}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {load.venture.name}
            {load.office && ` / ${load.office.name}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canNotify && (
            <Link
              href={`/freight/loads/${id}/find-carriers`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
              title="Find and queue carriers for this load"
            >
              📋 Queue Carriers
            </Link>
          )}
          <Link href="/freight/loads" className="text-sm text-gray-600 hover:underline">
            Back to loads
          </Link>
        </div>
      </div>

      {notifyResult && (
        <div
          className={`p-4 rounded-lg ${
            notifyResult.error && notifyResult.sent === 0
              ? "bg-red-50 border border-red-200 text-red-700"
              : "bg-green-50 border border-green-200 text-green-700"
          }`}
        >
          {notifyResult.sent > 0 ? (
            <span>Queued {notifyResult.sent} carrier(s) for dispatcher follow-up.</span>
          ) : notifyResult.error ? (
            <span>{notifyResult.error}</span>
          ) : (
            <span>No carriers were queued.</span>
          )}
          <button
            onClick={() => setNotifyResult(null)}
            className="ml-4 text-sm underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-lg mb-4">Load Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Lane</div>
                <div className="font-medium">
                  {load.pickupCity}, {load.pickupState} {load.pickupZip || ""}
                </div>
                <div className="text-gray-500">to</div>
                <div className="font-medium">
                  {load.dropCity}, {load.dropState} {load.dropZip || ""}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Pickup Date</div>
                <div className="font-medium">
                  {new Date(load.pickupDate).toLocaleDateString()}
                </div>
                {load.dropDate && (
                  <>
                    <div className="text-gray-500 mt-2">Drop Date</div>
                    <div className="font-medium">
                      {new Date(load.dropDate).toLocaleDateString()}
                    </div>
                  </>
                )}
              </div>
              <div>
                <div className="text-gray-500">Equipment</div>
                <div className="font-medium">{load.equipmentType}</div>
              </div>
              <div>
                <div className="text-gray-500">Weight</div>
                <div className="font-medium">
                  {load.weightLbs ? `${load.weightLbs.toLocaleString()} lbs` : "-"}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Rate</div>
                <div className="font-medium text-lg text-green-700">
                  {load.rate ? `$${load.rate.toLocaleString()}` : "-"}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Location</div>
                <div className="font-medium">{load.shipperName || "-"}</div>
              </div>
            </div>
            {load.notes && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="text-gray-500 text-sm">Notes</div>
                <div className="text-sm mt-1">{load.notes}</div>
              </div>
            )}
          </div>

          <StatusActionsCard
            load={load}
            updating={updating}
            onUpdateLoad={updateLoad}
          />

          {load.carrier && (
            <div className="bg-green-50 rounded-xl border border-green-200 p-6">
              <h2 className="font-semibold text-lg mb-2">Assigned Carrier</h2>
              <div className="flex items-center justify-between">
                <div>
                  <Link
                    href={`/freight/carriers/${load.carrier.id}`}
                    className="font-medium text-green-800 hover:underline"
                  >
                    {load.carrier.name}
                  </Link>
                  {load.carrier.mcNumber && (
                    <span className="text-sm text-green-600 ml-2">MC# {load.carrier.mcNumber}</span>
                  )}
                  <div className="text-sm text-green-700 mt-1">
                    {load.carrier.email && <span>{load.carrier.email}</span>}
                    {load.carrier.phone && <span className="ml-3">{load.carrier.phone}</span>}
                  </div>
                </div>
                <button
                  onClick={() => updateLoad({ carrierId: null, status: "OPEN" })}
                  className="text-sm text-red-600 hover:underline"
                >
                  Unassign
                </button>
              </div>
            </div>
          )}

          {load.contacts.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-lg mb-4">Contact History</h2>
              <div className="space-y-3">
                {load.contacts.map((contact) => (
                  <div key={contact.id} className="border-l-2 border-gray-200 pl-4 py-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{contact.carrier.name}</span>
                      <span className="text-gray-400">via {contact.channel}</span>
                      {contact.outcome && (
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                          {contact.outcome}
                        </span>
                      )}
                    </div>
                    {contact.subject && (
                      <div className="text-sm text-gray-600 mt-1">{contact.subject}</div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      by {contact.madeBy.name} on {new Date(contact.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-lg mb-4">Carrier Matching</h2>
            {matchedCarriers.length === 0 ? (
              <p className="text-sm text-gray-500">No matching carriers found.</p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {matchedCarriers.map((carrier) => (
                  <div
                    key={carrier.id}
                    className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <Link
                          href={`/freight/carriers/${carrier.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {carrier.name}
                        </Link>
                        {carrier.mcNumber && (
                          <span className="text-xs text-gray-500 ml-2">MC# {carrier.mcNumber}</span>
                        )}
                        {carrier.rating != null && (
                          <div className="text-xs text-yellow-600 mt-0.5">
                            {"★".repeat(Math.max(0, Math.min(5, Math.round(carrier.rating))))}{"☆".repeat(Math.max(0, 5 - Math.max(0, Math.min(5, Math.round(carrier.rating)))))}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Score: {carrier.score}</div>
                        <div className="text-xs text-gray-400">{carrier.loadCount} loads</div>
                      </div>
                    </div>
                    {carrier.matchReason.length > 0 && (
                      <div className="text-xs text-gray-500 mt-2">
                        {carrier.matchReason.join(" | ")}
                      </div>
                    )}
                    <div className="flex gap-2 mt-2">
                      {carrier.email && (
                        <a
                          href={`mailto:${carrier.email}`}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Email
                        </a>
                      )}
                      {carrier.phone && (
                        <a
                          href={`tel:${carrier.phone}`}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Call
                        </a>
                      )}
                      <button
                        onClick={() => openBreakdown(carrier)}
                        className="text-xs text-indigo-600 hover:underline ml-2"
                      >
                        View Breakdown
                      </button>
                      <button
                        onClick={() => assignCarrier(carrier.id)}
                        className="text-xs text-green-600 hover:underline ml-auto"
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link
              href="/freight/carriers"
              className="text-sm text-blue-600 hover:underline mt-4 inline-block"
            >
              Browse all carriers
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

LoadDetailPage.title = "Load Detail";

