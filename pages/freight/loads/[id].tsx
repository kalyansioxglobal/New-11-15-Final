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
  OPEN: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  WORKING: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
  COVERED: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800",
  IN_TRANSIT: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  DELIVERED: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  LOST: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800",
  DORMANT: "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-600",
  MAYBE: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800",
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
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
      <h2 className="font-semibold text-lg mb-4 text-gray-900 dark:text-white">Status & Actions</h2>
      <div className="mb-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">Current Status: </span>
        <span className={`px-2 py-1 rounded text-xs font-medium border ${STATUS_COLORS[currentStatus] || "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-600"}`}>
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
                  ? "bg-white dark:bg-gray-700 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed"
              } disabled:opacity-50`}
              title={isCurrent ? "Current status" : isValidNext ? "Click to change status" : "Invalid transition"}
            >
              {status === "COVERED" ? "Assigned" : status === "IN_TRANSIT" ? "In Transit" : status.replace(/_/g, " ")}
            </button>
          );
        })}
      </div>

      {showLostForm && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Lost Reason Category</label>
            <select
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
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
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
              Lost Reason Details{" "}
              <span className="text-xs text-gray-400 dark:text-gray-500">(what actually happened?)</span>
            </label>
            <textarea
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full text-sm min-h-[80px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              placeholder="Example: Shipper had another carrier at $2.10/mile, we were at $2.35; they confirmed via email at 3:42 PM."
            />
          </div>
          {warning && <p className="text-sm text-red-600 dark:text-red-400">{warning}</p>}
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
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          )}
          {currentStatus === "LOST" && !pendingStatus && (
            <button
              onClick={() => onUpdateLoad({ lostReasonCategory, lostReason } as any)}
              disabled={updating}
              className="px-4 py-2 bg-gray-800 dark:bg-gray-700 text-white dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-900 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              {updating ? "Saving..." : "Update Reason"}
            </button>
          )}
        </div>
      )}

      {showDormantForm && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Dormant Reason</label>
            <textarea
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full text-sm min-h-[60px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
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
                className="px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                {updating ? "Saving..." : "Mark as Dormant"}
              </button>
              <button
                onClick={() => setPendingStatus(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          )}
          {currentStatus === "DORMANT" && !pendingStatus && (
            <button
              onClick={() => onUpdateLoad({ dormantReason } as any)}
              disabled={updating}
              className="px-4 py-2 bg-gray-800 dark:bg-gray-700 text-white dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-900 dark:hover:bg-gray-600 disabled:opacity-50"
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
      <div className="p-6 dark:bg-gray-900 min-h-screen">
        <p className="text-red-600 dark:text-red-400">{error || "Load not found"}</p>
        <Link href="/freight/loads" className="text-blue-600 dark:text-blue-400 underline text-sm mt-2 inline-block">
          Back to loads
        </Link>
      </div>
    );
  }

  // Calculate current status after null check
  const currentLoadStatus = load.loadStatus || load.status || "OPEN";
  const canNotify = ["OPEN", "WORKING", "AT_RISK", "MAYBE"].includes(currentLoadStatus) && !load.carrier;

  return (
    <div className="p-6 space-y-6 dark:bg-gray-900 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {load.reference || `Load #${load.id}`}
            </h1>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium border ${
                STATUS_COLORS[currentLoadStatus] || "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-600"
              }`}
            >
              {currentLoadStatus}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {load.venture.name}
            {load.office && ` / ${load.office.name}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canNotify && (
            <Link
              href={`/freight/loads/${id}/find-carriers`}
              className="btn"
              title="Find and queue carriers for this load"
            >
              📋 Queue Carriers
            </Link>
          )}
          <Link href="/freight/loads" className="text-sm text-gray-600 dark:text-gray-400 hover:underline">
            Back to loads
          </Link>
        </div>
      </div>

      {notifyResult && (
        <div
          className={`p-4 rounded-lg ${
            notifyResult.error && notifyResult.sent === 0
              ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
              : "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
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
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="font-semibold text-lg mb-4 text-gray-900 dark:text-white">Load Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500 dark:text-gray-400">Lane</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {load.pickupCity}, {load.pickupState} {load.pickupZip || ""}
                </div>
                <div className="text-gray-500 dark:text-gray-400">to</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {load.dropCity}, {load.dropState} {load.dropZip || ""}
                </div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Pickup Date</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {new Date(load.pickupDate).toLocaleDateString()}
                </div>
                {load.dropDate && (
                  <>
                    <div className="text-gray-500 dark:text-gray-400 mt-2">Drop Date</div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {new Date(load.dropDate).toLocaleDateString()}
                    </div>
                  </>
                )}
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Equipment</div>
                <div className="font-medium text-gray-900 dark:text-white">{load.equipmentType}</div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Weight</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {load.weightLbs ? `${load.weightLbs.toLocaleString()} lbs` : "-"}
                </div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Rate</div>
                <div className="font-medium text-lg text-green-700 dark:text-green-400">
                  {load.rate ? `$${load.rate.toLocaleString()}` : "-"}
                </div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Location</div>
                <div className="font-medium text-gray-900 dark:text-white">{load.shipperName || "-"}</div>
              </div>
            </div>
            {load.notes && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="text-gray-500 dark:text-gray-400 text-sm">Notes</div>
                <div className="text-sm mt-1 text-gray-900 dark:text-white">{load.notes}</div>
              </div>
            )}
          </div>

          <StatusActionsCard
            load={load}
            updating={updating}
            onUpdateLoad={updateLoad}
          />

          {load.carrier && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 p-6 shadow-sm">
              <h2 className="font-semibold text-lg mb-2 text-green-800 dark:text-green-300">Assigned Carrier</h2>
              <div className="flex items-center justify-between">
                <div>
                  <Link
                    href={`/freight/carriers/${load.carrier.id}`}
                    className="font-medium text-green-800 dark:text-green-300 hover:underline"
                  >
                    {load.carrier.name}
                  </Link>
                  {load.carrier.mcNumber && (
                    <span className="text-sm text-green-600 dark:text-green-400 ml-2">MC# {load.carrier.mcNumber}</span>
                  )}
                  <div className="text-sm text-green-700 dark:text-green-300 mt-1">
                    {load.carrier.email && <span>{load.carrier.email}</span>}
                    {load.carrier.phone && <span className="ml-3">{load.carrier.phone}</span>}
                  </div>
                </div>
                <button
                  onClick={() => updateLoad({ carrierId: null, status: "OPEN" })}
                  className="text-sm text-red-600 dark:text-red-400 hover:underline"
                >
                  Unassign
                </button>
              </div>
            </div>
          )}

          {load.contacts.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <h2 className="font-semibold text-lg mb-4 text-gray-900 dark:text-white">Contact History</h2>
              <div className="space-y-3">
                {load.contacts.map((contact) => (
                  <div key={contact.id} className="border-l-2 border-gray-200 dark:border-gray-600 pl-4 py-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-900 dark:text-white">{contact.carrier.name}</span>
                      <span className="text-gray-400 dark:text-gray-500">via {contact.channel}</span>
                      {contact.outcome && (
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
                          {contact.outcome}
                        </span>
                      )}
                    </div>
                    {contact.subject && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{contact.subject}</div>
                    )}
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      by {contact.madeBy.name} on {new Date(contact.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="font-semibold text-lg mb-4 text-gray-900 dark:text-white">Carrier Matching</h2>
            {matchedCarriers.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No matching carriers found.</p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {matchedCarriers.map((carrier) => (
                  <div
                    key={carrier.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <Link
                          href={`/freight/carriers/${carrier.id}`}
                          className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {carrier.name}
                        </Link>
                        {carrier.mcNumber && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">MC# {carrier.mcNumber}</span>
                        )}
                        {carrier.rating != null && (
                          <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">
                            {"★".repeat(Math.max(0, Math.min(5, Math.round(carrier.rating))))}{"☆".repeat(Math.max(0, 5 - Math.max(0, Math.min(5, Math.round(carrier.rating)))))}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Score: {carrier.score}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">{carrier.loadCount} loads</div>
                      </div>
                    </div>
                    {carrier.matchReason.length > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {carrier.matchReason.join(" | ")}
                      </div>
                    )}
                    <div className="flex gap-2 mt-2">
                      {carrier.email && (
                        <a
                          href={`mailto:${carrier.email}`}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Email
                        </a>
                      )}
                      {carrier.phone && (
                        <a
                          href={`tel:${carrier.phone}`}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Call
                        </a>
                      )}
                      <button
                        onClick={() => openBreakdown(carrier)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline ml-2"
                      >
                        View Breakdown
                      </button>
                      <button
                        onClick={() => assignCarrier(carrier.id)}
                        className="text-xs text-green-600 dark:text-green-400 hover:underline ml-auto"
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
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-4 inline-block"
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

