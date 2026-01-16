import { useState, useEffect } from "react";
import toast from "react-hot-toast";

type Subscription = {
  id: number;
  planName: string;
  mrr: number;
  startedAt: string;
  cancelledAt: string | null;
  isActive: boolean;
  notes: string | null;
};

type EditSubscriptionModalProps = {
  subscription: Subscription;
  onClose: () => void;
  onSuccess: () => void;
};

export default function EditSubscriptionModal({
  subscription,
  onClose,
  onSuccess,
}: EditSubscriptionModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    planName: subscription.planName,
    mrr: subscription.mrr.toString(),
    startedAt: subscription.startedAt.split("T")[0],
    cancelledAt: subscription.cancelledAt ? subscription.cancelledAt.split("T")[0] : "",
    notes: subscription.notes || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.planName.trim()) {
      toast.error("Plan name is required");
      return;
    }

    const mrrValue = parseFloat(formData.mrr);
    if (isNaN(mrrValue) || mrrValue < 0) {
      toast.error("Valid MRR is required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/saas/subscriptions/${subscription.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planName: formData.planName.trim(),
          mrr: mrrValue,
          startedAt: formData.startedAt,
          cancelledAt: formData.cancelledAt || null,
          notes: formData.notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update subscription");
      }

      toast.success("Subscription updated successfully");
      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to update subscription");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-md">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-lg">
        <div className="text-gray-900 dark:text-white p-6 rounded-t-2xl flex items-center justify-between">
          <h2 className="text-xl font-bold">Edit Subscription</h2>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Plan Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.planName}
              onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
              disabled={submitting}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="e.g., Pro Plan"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                MRR ($) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.mrr}
                  onChange={(e) => setFormData({ ...formData, mrr: e.target.value })}
                  disabled={submitting}
                  className="w-full px-4 py-2.5 pl-7 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed inputArrow"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startedAt}
                onChange={(e) => setFormData({ ...formData, startedAt: e.target.value })}
                disabled={submitting}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {subscription.cancelledAt && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Cancelled Date
              </label>
              <input
                type="date"
                value={formData.cancelledAt}
                onChange={(e) => setFormData({ ...formData, cancelledAt: e.target.value })}
                disabled={submitting}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              disabled={submitting}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all resize-y disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className=" px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn"
            >
              {submitting ? (
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
                  Save
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

