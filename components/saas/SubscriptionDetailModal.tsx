import { useState } from "react";

type SubscriptionDetailModalProps = {
  subscription: {
    id: number;
    planName: string;
    mrr: number;
    startedAt: string;
    cancelledAt: string | null;
    cancelReason: string | null;
    cancelFeedback: string | null;
    saveOfferMade: string | null;
    saveOfferAccepted: boolean | null;
    isActive: boolean;
    notes: string | null;
    createdAt?: string;
    updatedAt?: string;
  };
  onClose: () => void;
};

export default function SubscriptionDetailModal({
  subscription,
  onClose,
}: SubscriptionDetailModalProps) {
  // Determine status
  const getStatus = () => {
    if (subscription.cancelledAt) return "CANCELLED";
    if (!subscription.isActive) return "PAUSED";
    return "ACTIVE";
  };

  const status = getStatus();
  const statusColors = {
    ACTIVE: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
    CANCELLED: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600",
    PAUSED: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="text-white p-6 rounded-t-2xl flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-xl font-bold">Subscription Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 dark:hover:bg-white/30 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusColors[status as keyof typeof statusColors]}`}>
              {status}
            </span>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Plan Name
              </label>
              <p className="text-sm text-gray-900 dark:text-white font-medium">{subscription.planName}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Monthly Recurring Revenue (MRR)
              </label>
              <p className="text-sm text-gray-900 dark:text-white font-medium">${subscription.mrr.toLocaleString()}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Start Date
              </label>
              <p className="text-sm text-gray-900 dark:text-white">
                {new Date(subscription.startedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            {subscription.cancelledAt && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Cancelled Date
                </label>
                <p className="text-sm text-gray-900 dark:text-white">
                  {new Date(subscription.cancelledAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            )}
            {subscription.createdAt && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Created At
                </label>
                <p className="text-sm text-gray-900 dark:text-white">
                  {new Date(subscription.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            )}
            {subscription.updatedAt && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Last Updated
                </label>
                <p className="text-sm text-gray-900 dark:text-white">
                  {new Date(subscription.updatedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            )}
          </div>

          {/* Cancellation Details */}
          {(subscription.cancelReason || subscription.cancelFeedback || subscription.saveOfferMade) && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Cancellation Details</h3>
              <div className="space-y-3">
                {subscription.cancelReason && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                      Cancellation Reason
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                      {subscription.cancelReason}
                    </p>
                  </div>
                )}
                {subscription.cancelFeedback && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                      Customer Feedback
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                      {subscription.cancelFeedback}
                    </p>
                  </div>
                )}
                {subscription.saveOfferMade && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                      Save Offer Made
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                      {subscription.saveOfferMade}
                    </p>
                    {subscription.saveOfferAccepted !== null && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Offer {subscription.saveOfferAccepted ? "Accepted" : "Not Accepted"}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {subscription.notes && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Notes
              </label>
              <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg whitespace-pre-wrap">
                {subscription.notes}
              </p>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

