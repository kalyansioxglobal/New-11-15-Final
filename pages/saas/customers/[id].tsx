import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { canCreateTasks } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";
import { Skeleton } from "@/components/ui/Skeleton";
import toast from "react-hot-toast";
import CreateSubscriptionModal from "@/components/saas/CreateSubscriptionModal";
import EditSubscriptionModal from "@/components/saas/EditSubscriptionModal";
import CancelSubscriptionModal from "@/components/saas/CancelSubscriptionModal";
import SubscriptionDetailModal from "@/components/saas/SubscriptionDetailModal";

type Subscription = {
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

type Customer = {
  id: number;
  name: string;
  email: string | null;
  domain: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  venture: { id: number; name: string };
  subscriptions: Subscription[];
  totalMrr: number;
};

export default function CustomerDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    domain: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [cancellingSubscription, setCancellingSubscription] = useState<Subscription | null>(null);
  const [viewingSubscription, setViewingSubscription] = useState<Subscription | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [operationLoading, setOperationLoading] = useState<Set<number>>(new Set());

  const { effectiveUser } = useEffectiveUser();
  const role = (effectiveUser?.role || "EMPLOYEE") as UserRole;
  const canEdit = canCreateTasks(role);

  const loadCustomer = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/saas/customers/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          toast.error("Customer not found");
          return;
        }
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to load customer");
      }
      const data = await res.json();
      setCustomer(data);
      setFormData({
        name: data.name || "",
        email: data.email || "",
        domain: data.domain || "",
        notes: data.notes || "",
      });
    } catch (e: any) {
      toast.error(e.message || "Failed to load customer");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubscription = (sub: Subscription) => {
    setOperationLoading((prev) => new Set(prev).add(sub.id));
    setEditingSubscription(sub);
  };

  const handleCancelSubscription = (sub: Subscription) => {
    setOperationLoading((prev) => new Set(prev).add(sub.id));
    setCancellingSubscription(sub);
  };

  const handleViewSubscription = (sub: Subscription) => {
    setViewingSubscription(sub);
  };

  const toggleRowExpansion = (subId: number) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(subId)) {
        newSet.delete(subId);
      } else {
        newSet.add(subId);
      }
      return newSet;
    });
  };

  // Get subscription status
  const getSubscriptionStatus = (sub: Subscription) => {
    if (sub.cancelledAt) return "CANCELLED";
    if (!sub.isActive) return "PAUSED";
    return "ACTIVE";
  };

  // Get status badge colors
  const getStatusBadge = (status: string) => {
    const statusColors = {
      ACTIVE: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800",
      CANCELLED: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600",
      PAUSED: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
    };
    return statusColors[status as keyof typeof statusColors] || statusColors.CANCELLED;
  };

  useEffect(() => {
    loadCustomer();
  }, [id]);

  async function handleSave() {
    if (!customer) return;

    // Validation
    if (!formData.name?.trim()) {
      toast.error("Name is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/saas/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim() || null,
          domain: formData.domain.trim() || null,
          notes: formData.notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update customer");
      }

      const updated = await res.json();
      // Reload customer to get fresh data including subscriptions and MRR
      await loadCustomer();
      setEditing(false);
      toast.success("Customer updated successfully");
    } catch (e: any) {
      toast.error(e.message || "Failed to update customer");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <Skeleton className="w-full h-[85vh]" />
      </div>
    );
  }

  if (!customer && !loading) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-lg">
          Customer not found
        </div>
        <Link
          href="/saas/customers"
          className="text-blue-600 dark:text-blue-400 hover:underline mt-4 inline-block"
        >
          Back to Customers
        </Link>
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  const activeSubscriptions = customer.subscriptions.filter((s) => s.isActive);
  const cancelledSubscriptions = customer.subscriptions.filter((s) => !s.isActive);

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/saas/customers"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            &larr; Back to Customers
          </Link>
          <h1 className="text-2xl font-semibold mt-2 text-gray-900 dark:text-white">
            {customer.name}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {customer.venture.name} &bull; Created {new Date(customer.createdAt).toLocaleDateString()}
          </p>
        </div>
        {canEdit && !editing && (
          <button
            onClick={() => setEditing(true)}
            disabled={saving}
            className="btn"
          >
            Edit
          </button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total MRR</div>
          <div className="text-2xl font-semibold mt-1 text-green-600 dark:text-green-400">
            ${customer.totalMrr.toLocaleString()}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Active Subscriptions</div>
          <div className="text-2xl font-semibold mt-1 text-gray-900 dark:text-white">
            {activeSubscriptions.length}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Cancelled</div>
          <div className="text-2xl font-semibold mt-1 text-gray-400 dark:text-gray-500">
            {cancelledSubscriptions.length}
          </div>
        </div>
      </div>

      {editing ? (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Customer</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                disabled={saving}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Customer name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                disabled={saving}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="customer@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Domain
              </label>
              <input
                type="text"
                value={formData.domain}
                onChange={(e) => setFormData((f) => ({ ...f, domain: e.target.value }))}
                disabled={saving}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="example.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all resize-y disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Additional notes..."
            />
          </div>
          <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn disabled:cursor-not-allowed flex items-center gap-2"
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
                  Save
                </>
              )}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                // Reset form data to current customer data
                setFormData({
                  name: customer.name || "",
                  email: customer.email || "",
                  domain: customer.domain || "",
                  notes: customer.notes || "",
                });
              }}
              disabled={saving}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Customer Details</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Email</div>
              <div className="mt-1 text-gray-900 dark:text-white">
                {customer.email || <span className="text-gray-400 dark:text-gray-500">Not set</span>}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Domain</div>
              <div className="mt-1">
                {customer.domain ? (
                  <a
                    href={`https://${customer.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {customer.domain}
                  </a>
                ) : (
                  <span className="text-gray-400 dark:text-gray-500">Not set</span>
                )}
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="text-sm text-gray-500 dark:text-gray-400">Notes</div>
              <div className="mt-1 whitespace-pre-wrap text-gray-900 dark:text-white">
                {customer.notes || <span className="text-gray-400 dark:text-gray-500">No notes</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Subscriptions</h2>
          {canEdit && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Subscription
            </button>
          )}
        </div>
        {customer.subscriptions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400 mb-4">No subscriptions yet.</p>
            {canEdit && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-lg bg-blue-600 dark:bg-blue-700 text-white text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
              >
                Create First Subscription
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {/* <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300 w-8"></th> */}
                  <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300">Plan</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300">MRR</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300">Started</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300">Status</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300">Notes</th>
                  {canEdit && (
                    <th className="text-right py-2 px-2 font-medium text-gray-700 dark:text-gray-300">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {customer.subscriptions.map((sub) => {
                  const status = getSubscriptionStatus(sub);
                  const isExpanded = expandedRows.has(sub.id);
                  const isLoading = operationLoading.has(sub.id);
                  return (
                    <>
                      <tr
                        key={sub.id}
                        className="border-b border-gray-200 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                        onClick={() => toggleRowExpansion(sub.id)}
                      >
                        {/* <td className="py-2 px-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRowExpansion(sub.id);
                            }}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                            title={isExpanded ? "Collapse" : "Expand details"}
                          >
                            <svg
                              className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </td> */}
                        <td className="py-2 px-2 font-medium text-gray-900 dark:text-white">{sub.planName}</td>
                        <td className="py-2 px-2 text-gray-900 dark:text-white">${sub.mrr.toLocaleString()}</td>
                        <td className="py-2 px-2 text-gray-600 dark:text-gray-400">
                          {new Date(sub.startedAt).toLocaleDateString()}
                        </td>
                        <td className="py-2 px-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(status)}`}>
                            {status}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-gray-500 dark:text-gray-400 truncate max-w-xs" title={sub.cancelReason || sub.notes || ""}>
                          {sub.cancelReason || sub.notes || "-"}
                        </td>
                        {canEdit && (
                          <td className="py-2 px-2" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleViewSubscription(sub)}
                                className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-xs font-medium transition-colors"
                                title="View full details"
                                disabled={isLoading}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleEditSubscription(sub)}
                                disabled={isLoading}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Edit subscription"
                              >
                                {isLoading ? (
                                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  "Edit"
                                )}
                              </button>
                              {sub.isActive && (
                                <button
                                  onClick={() => handleCancelSubscription(sub)}
                                  disabled={isLoading}
                                  className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Cancel subscription"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                      {isExpanded && (
                        <tr key={`${sub.id}-details`} className="bg-gray-50 dark:bg-gray-900/30 border-b border-gray-200 dark:border-gray-700">
                          <td colSpan={canEdit ? 7 : 6} className="py-4 px-2">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                  Plan Name
                                </label>
                                <p className="text-gray-900 dark:text-white">{sub.planName}</p>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                  MRR
                                </label>
                                <p className="text-gray-900 dark:text-white">${sub.mrr.toLocaleString()}</p>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                  Start Date
                                </label>
                                <p className="text-gray-900 dark:text-white">
                                  {new Date(sub.startedAt).toLocaleDateString()}
                                </p>
                              </div>
                              {sub.cancelledAt && (
                                <div>
                                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                    Cancelled Date
                                  </label>
                                  <p className="text-gray-900 dark:text-white">
                                    {new Date(sub.cancelledAt).toLocaleDateString()}
                                  </p>
                                </div>
                              )}
                              {sub.cancelReason && (
                                <div className="md:col-span-2">
                                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                    Cancellation Reason
                                  </label>
                                  <p className="text-gray-900 dark:text-white">{sub.cancelReason}</p>
                                </div>
                              )}
                              {sub.cancelFeedback && (
                                <div className="md:col-span-2">
                                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                    Customer Feedback
                                  </label>
                                  <p className="text-gray-900 dark:text-white">{sub.cancelFeedback}</p>
                                </div>
                              )}
                              {sub.saveOfferMade && (
                                <div className="md:col-span-2">
                                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                    Save Offer
                                  </label>
                                  <p className="text-gray-900 dark:text-white">{sub.saveOfferMade}</p>
                                  {sub.saveOfferAccepted !== null && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                      {sub.saveOfferAccepted ? "✓ Accepted" : "✗ Not Accepted"}
                                    </p>
                                  )}
                                </div>
                              )}
                              {sub.notes && (
                                <div className="md:col-span-3">
                                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                    Notes
                                  </label>
                                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{sub.notes}</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateModal && customer && (
        <CreateSubscriptionModal
          customerId={customer.id}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            toast.success("Subscription created successfully");
            loadCustomer();
          }}
        />
      )}

      {editingSubscription && (
        <EditSubscriptionModal
          subscription={editingSubscription}
          onClose={() => setEditingSubscription(null)}
          onSuccess={loadCustomer}
        />
      )}

      {cancellingSubscription && cancellingSubscription.isActive && (
        <CancelSubscriptionModal
          subscription={cancellingSubscription}
          onClose={() => {
            setCancellingSubscription(null);
            setOperationLoading((prev) => {
              const newSet = new Set(prev);
              newSet.delete(cancellingSubscription.id);
              return newSet;
            });
          }}
          onSuccess={() => {
            setOperationLoading((prev) => {
              const newSet = new Set(prev);
              newSet.delete(cancellingSubscription.id);
              return newSet;
            });
            loadCustomer();
          }}
        />
      )}

      {editingSubscription && (
        <EditSubscriptionModal
          subscription={editingSubscription}
          onClose={() => {
            setEditingSubscription(null);
            setOperationLoading((prev) => {
              const newSet = new Set(prev);
              newSet.delete(editingSubscription.id);
              return newSet;
            });
          }}
          onSuccess={() => {
            setOperationLoading((prev) => {
              const newSet = new Set(prev);
              newSet.delete(editingSubscription.id);
              return newSet;
            });
            loadCustomer();
          }}
        />
      )}

      {viewingSubscription && (
        <SubscriptionDetailModal
          subscription={viewingSubscription}
          onClose={() => setViewingSubscription(null)}
        />
      )}
    </div>
  );
}
