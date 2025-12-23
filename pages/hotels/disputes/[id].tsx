import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";

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
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
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
      if (!res.ok) throw new Error(data.error || "Failed to update");
      await fetchDispute();
    } catch (err: any) {
      setError(err.message);
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
      if (!res.ok) throw new Error(data.error || "Failed to add note");
      setNewNote("");
      await fetchDispute();
    } catch (err: any) {
      setError(err.message);
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
    setError(null);
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
      if (!res.ok) throw new Error(data.error || "Failed to resolve dispute");
      setShowResolveModal(false);
      await fetchDispute();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResolving(false);
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case "OPEN":
        return "bg-yellow-100 text-yellow-800";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800";
      case "WON":
        return "bg-green-100 text-green-800";
      case "LOST":
        return "bg-red-100 text-red-800";
      case "CLOSED_NO_ACTION":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="text-sm text-gray-500">Loading...</div>
    );
  }

  if (!dispute) {
    return (
      <div className="text-sm text-red-500">Dispute not found.</div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">Dispute #{dispute.id}</h1>
          <p className="text-sm text-gray-500">
            {dispute.property.name} - {dispute.type.replace(/_/g, " ")}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(
            dispute.status
          )}`}
        >
          {dispute.status.replace(/_/g, " ")}
        </span>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 border border-red-300 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      {(dispute.status === "OPEN" || dispute.status === "IN_PROGRESS") && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="font-medium text-amber-800 mb-2">Resolve this dispute</div>
          <div className="flex gap-3">
            <button
              onClick={() => openResolveModal("WON")}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
            >
              Mark as Won
            </button>
            <button
              onClick={() => openResolveModal("LOST")}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
            >
              Mark as Lost
            </button>
          </div>
        </div>
      )}

      {showResolveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Mark Dispute as {resolveOutcome === "WON" ? "Won" : "Lost"}
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                {resolveOutcome === "WON" ? "How was this dispute won?" : "Reason for loss"}
              </label>
              <textarea
                value={resolveReason}
                onChange={(e) => setResolveReason(e.target.value)}
                placeholder={resolveOutcome === "WON" 
                  ? "e.g., Evidence submitted, guest acknowledged error..."
                  : "e.g., Insufficient evidence, bank ruled in guest's favor..."
                }
                className="w-full border rounded-lg px-3 py-2 h-24"
              />
            </div>
            {resolveOutcome === "LOST" && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                This will count as a chargeback loss of{" "}
                <strong>
                  {dispute.currency} {dispute.disputedAmount.toFixed(2)}
                </strong>
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowResolveModal(false)}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={resolving}
                className={`px-4 py-2 text-white rounded-lg font-medium ${
                  resolveOutcome === "WON"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                } disabled:opacity-50`}
              >
                {resolving ? "Saving..." : `Confirm ${resolveOutcome === "WON" ? "Won" : "Lost"}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border rounded p-4">
            <h2 className="font-semibold mb-3">Dispute Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Type:</span>
                <div className="font-medium">{dispute.type.replace(/_/g, " ")}</div>
              </div>
              <div>
                <span className="text-gray-500">Channel:</span>
                <div className="font-medium">{dispute.channel.replace(/_/g, " ")}</div>
              </div>
              <div>
                <span className="text-gray-500">Disputed Amount:</span>
                <div className="font-medium text-red-600">
                  {dispute.currency} {dispute.disputedAmount.toFixed(2)}
                </div>
              </div>
              {dispute.originalAmount && (
                <div>
                  <span className="text-gray-500">Original Amount:</span>
                  <div className="font-medium">
                    {dispute.currency} {dispute.originalAmount.toFixed(2)}
                  </div>
                </div>
              )}
              {dispute.reservationId && (
                <div>
                  <span className="text-gray-500">Reservation ID:</span>
                  <div className="font-medium">{dispute.reservationId}</div>
                </div>
              )}
              {dispute.folioNumber && (
                <div>
                  <span className="text-gray-500">Folio:</span>
                  <div className="font-medium">{dispute.folioNumber}</div>
                </div>
              )}
              {dispute.sourceRef && (
                <div>
                  <span className="text-gray-500">Source Ref:</span>
                  <div className="font-medium">{dispute.sourceRef}</div>
                </div>
              )}
            </div>
          </div>

          {(dispute.guestName || dispute.guestEmail || dispute.guestPhone) && (
            <div className="bg-white border rounded p-4">
              <h2 className="font-semibold mb-3">Guest Information</h2>
              <div className="grid grid-cols-3 gap-4 text-sm">
                {dispute.guestName && (
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <div className="font-medium">{dispute.guestName}</div>
                  </div>
                )}
                {dispute.guestEmail && (
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <div className="font-medium">{dispute.guestEmail}</div>
                  </div>
                )}
                {dispute.guestPhone && (
                  <div>
                    <span className="text-gray-500">Phone:</span>
                    <div className="font-medium">{dispute.guestPhone}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white border rounded p-4">
            <h2 className="font-semibold mb-3">Key Dates</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Posted:</span>
                <div className="font-medium">
                  {dispute.postedDate
                    ? new Date(dispute.postedDate).toLocaleDateString()
                    : "-"}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Stay:</span>
                <div className="font-medium">
                  {dispute.stayFrom
                    ? new Date(dispute.stayFrom).toLocaleDateString()
                    : "-"}
                  {dispute.stayTo && ` - ${new Date(dispute.stayTo).toLocaleDateString()}`}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Evidence Due:</span>
                <div
                  className={`font-medium ${
                    dispute.evidenceDueDate &&
                    new Date(dispute.evidenceDueDate) < new Date()
                      ? "text-red-600"
                      : ""
                  }`}
                >
                  {dispute.evidenceDueDate
                    ? new Date(dispute.evidenceDueDate).toLocaleDateString()
                    : "-"}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Decision:</span>
                <div className="font-medium">
                  {dispute.decisionDate
                    ? new Date(dispute.decisionDate).toLocaleDateString()
                    : "-"}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded p-4">
            <h2 className="font-semibold mb-3">Activity Notes</h2>
            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
              {dispute.notes.length === 0 && (
                <div className="text-sm text-gray-400">No notes yet.</div>
              )}
              {dispute.notes.map((note) => (
                <div key={note.id} className="bg-gray-50 rounded p-3 text-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-gray-700">
                      {note.author?.name || note.author?.email || "Unknown"}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(note.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-gray-600 whitespace-pre-wrap">{note.body}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note..."
                className="flex-1 border rounded px-2 py-1.5 text-sm h-16"
              />
              <button
                onClick={handleAddNote}
                disabled={addingNote || !newNote.trim()}
                className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
              >
                {addingNote ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border rounded p-4">
            <h2 className="font-semibold mb-3">Update Status</h2>
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="border rounded px-2 py-1.5 text-sm"
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="WON">Won</option>
                  <option value="LOST">Lost</option>
                  <option value="CLOSED_NO_ACTION">Closed - No Action</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Evidence Due Date</label>
                <input
                  type="date"
                  value={evidenceDueDate}
                  onChange={(e) => setEvidenceDueDate(e.target.value)}
                  className="border rounded px-2 py-1.5 text-sm"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Submitted Date</label>
                <input
                  type="date"
                  value={submittedDate}
                  onChange={(e) => setSubmittedDate(e.target.value)}
                  className="border rounded px-2 py-1.5 text-sm"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Decision Date</label>
                <input
                  type="date"
                  value={decisionDate}
                  onChange={(e) => setDecisionDate(e.target.value)}
                  className="border rounded px-2 py-1.5 text-sm"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Internal Notes</label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  className="border rounded px-2 py-1.5 text-sm h-20"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Outcome Notes</label>
                <textarea
                  value={outcomeNotes}
                  onChange={(e) => setOutcomeNotes(e.target.value)}
                  className="border rounded px-2 py-1.5 text-sm h-20"
                  placeholder="Final resolution notes..."
                />
              </div>

              <button
                onClick={handleUpdate}
                disabled={saving}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm font-medium disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          <div className="bg-white border rounded p-4">
            <h2 className="font-semibold mb-3">Info</h2>
            <div className="text-sm space-y-2">
              <div>
                <span className="text-gray-500">Created by:</span>
                <div className="font-medium">
                  {dispute.createdBy?.name || dispute.createdBy?.email || "-"}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Created:</span>
                <div className="font-medium">
                  {new Date(dispute.createdAt).toLocaleString()}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Last Updated:</span>
                <div className="font-medium">
                  {new Date(dispute.updatedAt).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => router.push("/hotels/disputes")}
            className="w-full px-3 py-2 bg-gray-200 text-gray-700 rounded text-sm font-medium"
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
