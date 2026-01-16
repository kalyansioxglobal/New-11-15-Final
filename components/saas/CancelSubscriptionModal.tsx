import { useState } from "react";
import toast from "react-hot-toast";

type Subscription = {
  id: number;
  planName: string;
  mrr: number;
  isActive: boolean;
};

type CancelSubscriptionModalProps = {
  subscription: Subscription;
  onClose: () => void;
  onSuccess: () => void;
};

export default function CancelSubscriptionModal({
  subscription,
  onClose,
  onSuccess,
}: CancelSubscriptionModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    reason: "",
    feedback: "",
    saveOffer: "",
    acceptOffer: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.acceptOffer && !formData.saveOffer.trim()) {
      toast.error("Save offer is required when accepting offer");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/saas/subscriptions/${subscription.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: formData.reason.trim() || null,
          feedback: formData.feedback.trim() || null,
          saveOffer: formData.saveOffer.trim() || null,
          acceptOffer: formData.acceptOffer,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to cancel subscription");
      }

      const result = await res.json();
      if (result.saved) {
        toast.success("Customer retained with save offer!");
      } else {
        toast.success("Subscription cancelled successfully");
      }
      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to cancel subscription");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-lg">
        <div className="text-gray-900 dark:text-white p-6 rounded-t-2xl flex items-center justify-between">
          <h2 className="text-xl font-bold">Cancel Subscription</h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-2 hover:bg-white/20 dark:hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <strong>Plan:</strong> {subscription.planName}
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <strong>MRR:</strong> ${subscription.mrr.toLocaleString()}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Cancellation Reason
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={3}
                disabled={submitting}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-red-500 dark:focus:border-red-400 transition-all resize-y disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Why is the customer cancelling?"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Customer Feedback
              </label>
              <textarea
                value={formData.feedback}
                onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
                rows={3}
                disabled={submitting}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-red-500 dark:focus:border-red-400 transition-all resize-y disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Any feedback from the customer?"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Save Offer Made
              </label>
              <input
                type="text"
                value={formData.saveOffer}
                onChange={(e) => setFormData({ ...formData, saveOffer: e.target.value })}
                disabled={submitting}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-red-500 dark:focus:border-red-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="e.g., 20% discount for 6 months"
              />
            </div>

            {formData.saveOffer && (
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={formData.acceptOffer}
                    onChange={(e) => setFormData({ ...formData, acceptOffer: e.target.checked })}
                    disabled={submitting}
                    className="rounded border-gray-300 dark:border-gray-600 text-green-600 dark:text-green-500 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 bg-white dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  Customer accepted the save offer
                </label>
                {formData.acceptOffer && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1 ml-6">
                    Subscription will remain active if offer is accepted
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 dark:from-red-700 dark:to-red-800 text-white rounded-lg text-sm font-semibold hover:from-red-700 hover:to-red-800 dark:hover:from-red-800 dark:hover:to-red-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {formData.acceptOffer ? "Retain Customer" : "Cancel Subscription"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

