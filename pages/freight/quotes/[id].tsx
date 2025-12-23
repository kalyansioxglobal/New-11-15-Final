import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { GetServerSideProps } from "next";

type Quote = {
  id: number;
  status: string;
  sellRate: number | null;
  buyRateEstimate: number | null;
  marginEstimate: number | null;
  counterOfferRate: number | null;
  origin: string | null;
  destination: string | null;
  equipmentType: string | null;
  notes: string | null;
  createdAt: string;
  sentAt: string | null;
  respondedAt: string | null;
  bookedAt: string | null;
  expiresAt: string | null;
  rejectionReasonCode: string | null;
  rejectionReasonText: string | null;
  customerTypeAtQuote: string;
  loadId: number | null;
  customer: { id: number; name: string; email: string | null; phone: string | null };
  shipper: { id: number; name: string } | null;
  salesperson: { id: number; fullName: string; email: string };
  venture: { id: number; name: string };
  load: { id: number; tmsLoadId: string | null; status: string } | null;
};

function QuoteDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [tmsLoadId, setTmsLoadId] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");

  useEffect(() => {
    if (!id) return;
    
    async function fetchQuote() {
      try {
        setLoading(true);
        const res = await fetch(`/api/freight/quotes/${id}`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setQuote(data);
      } catch (err: any) {
        setError(err.message ?? "Failed to load quote");
      } finally {
        setLoading(false);
      }
    }
    fetchQuote();
  }, [id]);

  const formatCurrency = (val: number | null) => {
    if (val == null) return "-";
    return `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (val: string | null) => {
    if (!val) return "-";
    return new Date(val).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: "bg-gray-100 text-gray-700",
      SENT: "bg-blue-100 text-blue-700",
      NO_RESPONSE: "bg-yellow-100 text-yellow-700",
      REJECTED: "bg-red-100 text-red-700",
      COUNTERED: "bg-purple-100 text-purple-700",
      ACCEPTED: "bg-green-100 text-green-700",
      BOOKED: "bg-emerald-100 text-emerald-700",
      EXPIRED: "bg-gray-100 text-gray-500",
    };
    return (
      <span className={`px-2 py-1 text-xs rounded font-medium ${colors[status] || "bg-gray-100 text-gray-700"}`}>
        {status}
      </span>
    );
  };

  const canConvert = quote && (quote.status === "ACCEPTED" || quote.status === "BOOKED") && !quote.loadId;
  const alreadyConverted = quote?.loadId;

  const refetchQuote = async () => {
    try {
      const res = await fetch(`/api/freight/quotes/${id}`);
      if (res.ok) {
        const data = await res.json();
        setQuote(data);
      }
    } catch {
    }
  };

  const handleConvert = async () => {
    if (!quote) return;
    
    setConverting(true);
    setConvertError(null);
    
    try {
      const res = await fetch(`/api/freight/quotes/${quote.id}/convert-to-load`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmsLoadId: tmsLoadId || undefined,
          pickupDate: pickupDate || undefined,
          deliveryDate: deliveryDate || undefined,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to convert quote");
      }
      
      await refetchQuote();
      setShowConvertModal(false);
      setTmsLoadId("");
      setPickupDate("");
      setDeliveryDate("");
    } catch (err: any) {
      setConvertError(err.message);
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-gray-500">Loading...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }

  if (!quote) {
    return <div className="p-6 text-gray-500">Quote not found.</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">Quote #{quote.id}</h1>
            {getStatusBadge(quote.status)}
          </div>
          <p className="text-gray-600 mt-1">
            {quote.venture.name} &middot; Created {formatDate(quote.createdAt)}
          </p>
        </div>
        <div className="flex gap-2">
          {canConvert && (
            <button
              onClick={() => setShowConvertModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Convert to Load
            </button>
          )}
          {alreadyConverted && quote.load && (
            <Link
              href={`/freight/loads/${quote.load.id}`}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              View Load #{quote.load.id}
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-lg p-4">
          <h2 className="font-semibold text-lg mb-3 border-b pb-2">Quote Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Customer:</span>
              <Link href={`/logistics/customers/${quote.customer.id}`} className="text-blue-600 hover:underline">
                {quote.customer.name}
              </Link>
            </div>
            {quote.shipper && (
              <div className="flex justify-between">
                <span className="text-gray-600">Shipper:</span>
                <span>{quote.shipper.name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Salesperson:</span>
              <span>{quote.salesperson.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Customer Type:</span>
              <span>{quote.customerTypeAtQuote}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <h2 className="font-semibold text-lg mb-3 border-b pb-2">Rate & Margin</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Sell Rate:</span>
              <span className="font-medium">{formatCurrency(quote.sellRate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Buy Rate (Est.):</span>
              <span>{formatCurrency(quote.buyRateEstimate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Margin (Est.):</span>
              <span className="font-medium text-green-600">{formatCurrency(quote.marginEstimate)}</span>
            </div>
            {quote.counterOfferRate && (
              <div className="flex justify-between">
                <span className="text-gray-600">Counter Offer:</span>
                <span className="text-orange-600">{formatCurrency(quote.counterOfferRate)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <h2 className="font-semibold text-lg mb-3 border-b pb-2">Lane Information</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Origin:</span>
              <span>{quote.origin || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Destination:</span>
              <span>{quote.destination || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Equipment:</span>
              <span>{quote.equipmentType || "-"}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <h2 className="font-semibold text-lg mb-3 border-b pb-2">Timeline</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Created:</span>
              <span>{formatDate(quote.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Sent:</span>
              <span>{formatDate(quote.sentAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Responded:</span>
              <span>{formatDate(quote.respondedAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Booked:</span>
              <span>{formatDate(quote.bookedAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Expires:</span>
              <span>{formatDate(quote.expiresAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {quote.notes && (
        <div className="mt-6 bg-white border rounded-lg p-4">
          <h2 className="font-semibold text-lg mb-2">Notes</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
        </div>
      )}

      {quote.rejectionReasonText && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="font-semibold text-lg mb-2 text-red-700">Rejection Reason</h2>
          {quote.rejectionReasonCode && (
            <p className="text-sm text-red-600 mb-1">Code: {quote.rejectionReasonCode}</p>
          )}
          <p className="text-sm text-red-700">{quote.rejectionReasonText}</p>
        </div>
      )}

      {showConvertModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Convert Quote to Load</h3>
            {convertError && (
              <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-sm">{convertError}</div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">TMS Load ID (optional)</label>
                <input
                  type="text"
                  value={tmsLoadId}
                  onChange={(e) => setTmsLoadId(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Enter TMS reference"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Pickup Date (optional)</label>
                <input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Delivery Date (optional)</label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowConvertModal(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
                disabled={converting}
              >
                Cancel
              </button>
              <button
                onClick={handleConvert}
                disabled={converting}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {converting ? "Converting..." : "Convert to Load"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

QuoteDetailPage.title = "Quote Details";

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};

export default QuoteDetailPage;
