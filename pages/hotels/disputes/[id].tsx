import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Skeleton } from "@/components/ui/Skeleton";
import toast from "react-hot-toast";

interface Note {
  id: number;
  body: string;
  createdAt: string;
  author?: { name?: string; email: string };
}

interface Dispute {
  id: number;
  status: string;
  type: string;
  channel: string;
  disputedAmount: number;
  originalAmount?: number;
  currency: string;
  property: { id: number; name: string; code?: string };
  owner?: { id: number; name?: string; email: string };
  createdBy?: { name?: string; email: string };
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  reservationId?: string;
  folioNumber?: string;
  sourceRef?: string;
  postedDate?: string;
  stayFrom?: string;
  stayTo?: string;
  evidenceDueDate?: string;
  submittedDate?: string;
  decisionDate?: string;
  reason?: string;
  internalNotes?: string;
  outcomeNotes?: string;
  createdAt: string;
  updatedAt: string;
  notes: Note[];
}

function HotelDisputeDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [status, setStatus] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [evidenceDueDate, setEvidenceDueDate] = useState("");
  const [submittedDate, setSubmittedDate] = useState("");
  const [decisionDate, setDecisionDate] = useState("");

  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveOutcome, setResolveOutcome] = useState<"WON" | "LOST" | null>(null);
  const [resolveReason, setResolveReason] = useState("");
  const [resolving, setResolving] = useState(false);

  const fetchDispute = async () => {
    if (!id) return;
    setLoading(true);
    const res = await fetch(`/api/hotels/disputes/${id}`);
    const data = await res.json();
    if (data.dispute) {
      setDispute(data.dispute);
      setStatus(data.dispute.status);
      setInternalNotes(data.dispute.internalNotes || "");
      setOutcomeNotes(data.dispute.outcomeNotes || "");
      setEvidenceDueDate(data.dispute.evidenceDueDate?.split("T")[0] || "");
      setSubmittedDate(data.dispute.submittedDate?.split("T")[0] || "");
      setDecisionDate(data.dispute.decisionDate?.split("T")[0] || "");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDispute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/hotels/disputes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          internalNotes,
          outcomeNotes,
          evidenceDueDate: evidenceDueDate || null,
          submittedDate: submittedDate || null,
          decisionDate: decisionDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update");
        setSaving(false);
        return;
      }
      toast.success("Dispute updated successfully");
      await fetchDispute();
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      const res = await fetch(`/api/hotels/disputes/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: newNote }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to add note");
        setAddingNote(false);
        return;
      }
      toast.success("Note added successfully");
      setNewNote("");
      await fetchDispute();
    } catch (err: any) {
      toast.error(err.message || "Failed to add note");
    } finally {
      setAddingNote(false);
    }
  };

  const openResolveModal = (outcome: "WON" | "LOST") => {
    setResolveOutcome(outcome);
    setResolveReason("");
    setShowResolveModal(true);
  };

  const handleResolve = async () => {
    if (!resolveOutcome) return;
    setResolving(true);
    try {
      const res = await fetch(`/api/hotels/disputes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: resolveOutcome,
          outcomeNotes: resolveReason,
          decisionDate: new Date().toISOString().split("T")[0],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to resolve dispute");
        setResolving(false);
        return;
      }
      toast.success(`Dispute marked as ${resolveOutcome === "WON" ? "Won" : "Lost"}`);
      setShowResolveModal(false);
      await fetchDispute();
    } catch (err: any) {
      toast.error(err.message || "Failed to resolve dispute");
    } finally {
      setResolving(false);
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case "OPEN":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800";
      case "IN_PROGRESS":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800";
      case "WON":
        return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800";
      case "LOST":
        return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800";
      case "CLOSED_NO_ACTION":
        return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-600";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-600";
    }
  };

  if (loading) {
    return (
      <Skeleton className="w-full h-[85vh]" />
    );
  }

  if (!dispute) {
    return (
      <div className="text-sm text-red-500 dark:text-red-400">Dispute not found.</div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dispute #{dispute.id}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {dispute.property.name} - {dispute.type.replace(/_/g, " ")}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
            dispute.status
          )}`}
        >
          {dispute.status.replace(/_/g, " ")}
        </span>
      </div>

      {(dispute.status === "OPEN" || dispute.status === "IN_PROGRESS") && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="font-medium text-amber-800 dark:text-amber-300 mb-2">Resolve this dispute</div>
          <div className="flex gap-3">
            <button
              onClick={() => openResolveModal("WON")}
              className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg font-medium hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
            >
              Mark as Won
            </button>
            <button
              onClick={() => openResolveModal("LOST")}
              className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg font-medium hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
            >
              Mark as Lost
            </button>
          </div>
        </div>
      )}

      {showResolveModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 border border-gray-200 dark:border-gray-700 shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Mark Dispute as {resolveOutcome === "WON" ? "Won" : "Lost"}
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {resolveOutcome === "WON" ? "How was this dispute won?" : "Reason for loss"}
              </label>
              <textarea
                value={resolveReason}
                onChange={(e) => setResolveReason(e.target.value)}
                placeholder={resolveOutcome === "WON"
                  ? "e.g., Evidence submitted, guest acknowledged error..."
                  : "e.g., Insufficient evidence, bank ruled in guest's favor..."
                }
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 h-24 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
              />
            </div>
            {resolveOutcome === "LOST" && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
                This will count as a chargeback loss of{" "}
                <strong>
                  {dispute.currency} {dispute.disputedAmount.toFixed(2)}
                </strong>
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowResolveModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={resolving}
                className={`px-4 py-2 text-white rounded-lg font-medium transition-colors ${resolveOutcome === "WON"
                    ? "bg-green-600 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-600"
                    : "bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-600"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {resolving ? "Saving..." : `Confirm ${resolveOutcome === "WON" ? "Won" : "Lost"}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h2 className="font-semibold mb-4 text-gray-900 dark:text-white">Dispute Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Type:</span>
                <div className="font-medium text-gray-900 dark:text-white">{dispute.type.replace(/_/g, " ")}</div>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Channel:</span>
                <div className="font-medium text-gray-900 dark:text-white">{dispute.channel.replace(/_/g, " ")}</div>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Disputed Amount:</span>
                <div className="font-medium text-red-600 dark:text-red-400">
                  {dispute.currency} {dispute.disputedAmount.toFixed(2)}
                </div>
              </div>
              {dispute.originalAmount && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Original Amount:</span>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {dispute.currency} {dispute.originalAmount.toFixed(2)}
                  </div>
                </div>
              )}
              {dispute.reservationId && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Reservation ID:</span>
                  <div className="font-medium text-gray-900 dark:text-white">{dispute.reservationId}</div>
                </div>
              )}
              {dispute.folioNumber && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Folio:</span>
                  <div className="font-medium text-gray-900 dark:text-white">{dispute.folioNumber}</div>
                </div>
              )}
              {dispute.sourceRef && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Source Ref:</span>
                  <div className="font-medium text-gray-900 dark:text-white">{dispute.sourceRef}</div>
                </div>
              )}
            </div>
          </div>

          {(dispute.guestName || dispute.guestEmail || dispute.guestPhone) && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h2 className="font-semibold mb-4 text-gray-900 dark:text-white">Guest Information</h2>
              <div className="grid grid-cols-3 gap-4 text-sm">
                {dispute.guestName && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Name:</span>
                    <div className="font-medium text-gray-900 dark:text-white">{dispute.guestName}</div>
                  </div>
                )}
                {dispute.guestEmail && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Email:</span>
                    <div className="font-medium text-gray-900 dark:text-white">{dispute.guestEmail}</div>
                  </div>
                )}
                {dispute.guestPhone && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Phone:</span>
                    <div className="font-medium text-gray-900 dark:text-white">{dispute.guestPhone}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h2 className="font-semibold mb-4 text-gray-900 dark:text-white">Key Dates</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Posted:</span>
                <div className="font-medium text-gray-900 dark:text-white">
                  {dispute.postedDate
                    ? new Date(dispute.postedDate).toLocaleDateString()
                    : "-"}
                </div>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Stay:</span>
                <div className="font-medium text-gray-900 dark:text-white">
                  {dispute.stayFrom
                    ? new Date(dispute.stayFrom).toLocaleDateString()
                    : "-"}
                  {dispute.stayTo && ` - ${new Date(dispute.stayTo).toLocaleDateString()}`}
                </div>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Evidence Due:</span>
                <div
                  className={`font-medium ${dispute.evidenceDueDate &&
                      new Date(dispute.evidenceDueDate) < new Date()
                      ? "text-red-600 dark:text-red-400"
                      : "text-gray-900 dark:text-white"
                    }`}
                >
                  {dispute.evidenceDueDate
                    ? new Date(dispute.evidenceDueDate).toLocaleDateString()
                    : "-"}
                </div>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Decision:</span>
                <div className="font-medium text-gray-900 dark:text-white">
                  {dispute.decisionDate
                    ? new Date(dispute.decisionDate).toLocaleDateString()
                    : "-"}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h2 className="font-semibold mb-4 text-gray-900 dark:text-white">Activity Notes</h2>
            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
              {dispute.notes.length === 0 && (
                <div className="text-sm text-gray-400 dark:text-gray-500">No notes yet.</div>
              )}
              {dispute.notes.map((note) => (
                <div key={note.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-sm border border-gray-200 dark:border-gray-600">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {note.author?.name || note.author?.email || "Unknown"}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(note.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{note.body}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note..."
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm h-16 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all resize-none"
              />
              <button
                onClick={handleAddNote}
                disabled={addingNote || !newNote.trim()}
                className="btn"
              >
                {addingNote ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h2 className="font-semibold mb-4 text-gray-900 dark:text-white">Update Status</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="WON">Won</option>
                  <option value="LOST">Lost</option>
                  <option value="CLOSED_NO_ACTION">Closed - No Action</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Evidence Due Date
                </label>
                <input
                  type="date"
                  value={evidenceDueDate}
                  onChange={(e) => setEvidenceDueDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Submitted Date
                </label>
                <input
                  type="date"
                  value={submittedDate}
                  onChange={(e) => setSubmittedDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Decision Date
                </label>
                <input
                  type="date"
                  value={decisionDate}
                  onChange={(e) => setDecisionDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Internal Notes
                </label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 min-h-[80px] focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all resize-y"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Outcome Notes
                </label>
                <textarea
                  value={outcomeNotes}
                  onChange={(e) => setOutcomeNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 min-h-[80px] focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all resize-y"
                  placeholder="Final resolution notes..."
                />
              </div>

              <button
                onClick={handleUpdate}
                disabled={saving}
                className="btn"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h2 className="font-semibold mb-4 text-gray-900 dark:text-white">Info</h2>
            <div className="text-sm space-y-3">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Created by:</span>
                <div className="font-medium text-gray-900 dark:text-white mt-1">
                  {dispute.createdBy?.name || dispute.createdBy?.email || "-"}
                </div>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Created:</span>
                <div className="font-medium text-gray-900 dark:text-white mt-1">
                  {new Date(dispute.createdAt).toLocaleString()}
                </div>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Last Updated:</span>
                <div className="font-medium text-gray-900 dark:text-white mt-1">
                  {new Date(dispute.updatedAt).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => router.push("/hotels/disputes")}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Back to List
          </button>
        </div>
      </div>
    </div>
  );
}

HotelDisputeDetailPage.title = "Dispute Details";

export default HotelDisputeDetailPage;
