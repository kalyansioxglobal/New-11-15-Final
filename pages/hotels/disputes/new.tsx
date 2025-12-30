import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { GetServerSideProps } from "next";
import { Skeleton } from "@/components/ui/Skeleton";

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};

interface Property {
  id: number;
  name: string;
  code?: string;
  city?: string;
}

function NewHotelDisputePage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [propertyId, setPropertyId] = useState<number | null>(null);
  const [type, setType] = useState("CHARGEBACK");
  const [channel, setChannel] = useState("CREDIT_CARD_PROCESSOR");
  const [disputedAmount, setDisputedAmount] = useState("");
  const [originalAmount, setOriginalAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [reservationId, setReservationId] = useState("");
  const [folioNumber, setFolioNumber] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [sourceRef, setSourceRef] = useState("");
  const [postedDate, setPostedDate] = useState("");
  const [stayFrom, setStayFrom] = useState("");
  const [stayTo, setStayTo] = useState("");
  const [evidenceDueDate, setEvidenceDueDate] = useState("");
  const [reason, setReason] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  const fetchProperties = async () => {
    setLoading(true);
    const res = await fetch("/api/meta/hotel-properties");
    const data = await res.json();
    setProperties(data.properties || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!propertyId || !disputedAmount) {
      setError("Property and disputed amount are required.");
      return;
    }
    setSaving(true);

    try {
      const res = await fetch("/api/hotels/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          type,
          channel,
          disputedAmount: Number(disputedAmount),
          originalAmount: originalAmount ? Number(originalAmount) : null,
          currency,
          reservationId: reservationId || null,
          folioNumber: folioNumber || null,
          guestName: guestName || null,
          guestEmail: guestEmail || null,
          guestPhone: guestPhone || null,
          postedDate: postedDate || null,
          stayFrom: stayFrom || null,
          stayTo: stayTo || null,
          evidenceDueDate: evidenceDueDate || null,
          reason: reason || null,
          internalNotes: internalNotes || null,
          sourceRef: sourceRef || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create dispute");

      router.push(`/hotels/disputes/${data.dispute.id}`);
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-semibold">New Hotel Dispute</h1>
        <p className="text-sm text-gray-500">
          Log a new chargeback, OTA dispute, or guest billing issue.
        </p>
      </div>

      {loading ? (
    <Skeleton className="w-full h-[85vh]" />  
    ) : (
        <form className="space-y-4 max-w-3xl" onSubmit={handleSubmit}>
          {error && (
            <div className="text-sm text-red-600 border border-red-300 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Property *</label>
            <select
              value={propertyId ?? ""}
              onChange={(e) => setPropertyId(Number(e.target.value))}
              className="border rounded px-2 py-1.5 text-sm"
            >
              <option value="">Select property</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.city ? `(${p.city})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="border rounded px-2 py-1.5 text-sm"
              >
                <option value="CHARGEBACK">Chargeback</option>
                <option value="OTA_DISPUTE">OTA Dispute</option>
                <option value="RATE_DISCREPANCY">Rate Discrepancy</option>
                <option value="GUEST_COMPLAINT">Guest Complaint</option>
                <option value="NO_SHOW">No Show</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Channel</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="border rounded px-2 py-1.5 text-sm"
              >
                <option value="CREDIT_CARD_PROCESSOR">Card Processor</option>
                <option value="OTA">OTA</option>
                <option value="BANK">Bank</option>
                <option value="DIRECT_GUEST">Direct Guest</option>
                <option value="CORPORATE">Corporate</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Disputed Amount *</label>
              <div className="flex gap-2">
                <input
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  className="border rounded px-2 py-1.5 text-sm w-20"
                />
                <input
                  value={disputedAmount}
                  onChange={(e) => setDisputedAmount(e.target.value)}
                  className="border rounded px-2 py-1.5 text-sm flex-1"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Original Amount</label>
              <input
                value={originalAmount}
                onChange={(e) => setOriginalAmount(e.target.value)}
                className="border rounded px-2 py-1.5 text-sm"
                type="number"
                step="0.01"
                placeholder="0.00"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Reservation ID</label>
              <input
                value={reservationId}
                onChange={(e) => setReservationId(e.target.value)}
                className="border rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Folio Number</label>
              <input
                value={folioNumber}
                onChange={(e) => setFolioNumber(e.target.value)}
                className="border rounded px-2 py-1.5 text-sm"
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-3">Guest Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Guest Name</label>
                <input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="border rounded px-2 py-1.5 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Guest Email</label>
                <input
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="border rounded px-2 py-1.5 text-sm"
                  type="email"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Guest Phone</label>
                <input
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="border rounded px-2 py-1.5 text-sm"
                  type="tel"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-3">Dates</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Posted Date</label>
                <input
                  value={postedDate}
                  onChange={(e) => setPostedDate(e.target.value)}
                  className="border rounded px-2 py-1.5 text-sm"
                  type="date"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Stay From</label>
                <input
                  value={stayFrom}
                  onChange={(e) => setStayFrom(e.target.value)}
                  className="border rounded px-2 py-1.5 text-sm"
                  type="date"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Stay To</label>
                <input
                  value={stayTo}
                  onChange={(e) => setStayTo(e.target.value)}
                  className="border rounded px-2 py-1.5 text-sm"
                  type="date"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Evidence Due</label>
                <input
                  value={evidenceDueDate}
                  onChange={(e) => setEvidenceDueDate(e.target.value)}
                  className="border rounded px-2 py-1.5 text-sm"
                  type="date"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-3">Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Source Reference</label>
                <input
                  value={sourceRef}
                  onChange={(e) => setSourceRef(e.target.value)}
                  className="border rounded px-2 py-1.5 text-sm"
                  placeholder="OTA confirmation, case ID, etc."
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Reason</label>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="border rounded px-2 py-1.5 text-sm"
                  placeholder="Processor / OTA reason"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1 mt-3">
              <label className="text-sm font-medium">Internal Notes</label>
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                className="border rounded px-2 py-1.5 text-sm h-24"
                placeholder="Quick summary for internal use..."
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Dispute"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/hotels/disputes")}
              className="px-4 py-2 rounded bg-gray-200 text-gray-700 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

NewHotelDisputePage.title = "New Hotel Dispute";

export default NewHotelDisputePage;
