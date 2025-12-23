import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { canCreateTasks } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

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
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    domain: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const { effectiveUser } = useEffectiveUser();
  const role = (effectiveUser?.role || "EMPLOYEE") as UserRole;
  const canEdit = canCreateTasks(role);

  useEffect(() => {
    if (!id) return;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/saas/customers/${id}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error("Customer not found");
          throw new Error("Failed to load customer");
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
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  async function handleSave() {
    if (!customer) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/saas/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed to save");
      const updated = await res.json();
      setCustomer((prev) => (prev ? { ...prev, ...updated } : prev));
      setEditing(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">Loading customer...</div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error || "Customer not found"}
        </div>
        <Link href="/saas/customers" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to Customers
        </Link>
      </div>
    );
  }

  const activeSubscriptions = customer.subscriptions.filter((s) => s.isActive);
  const cancelledSubscriptions = customer.subscriptions.filter((s) => !s.isActive);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/saas/customers" className="text-sm text-blue-600 hover:underline">
            &larr; Back to Customers
          </Link>
          <h1 className="text-2xl font-semibold mt-2">{customer.name}</h1>
          <p className="text-sm text-gray-500">
            {customer.venture.name} &bull; Created {new Date(customer.createdAt).toLocaleDateString()}
          </p>
        </div>
        {canEdit && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            Edit
          </button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm text-gray-500">Total MRR</div>
          <div className="text-2xl font-semibold mt-1 text-green-600">
            ${customer.totalMrr.toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm text-gray-500">Active Subscriptions</div>
          <div className="text-2xl font-semibold mt-1">{activeSubscriptions.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm text-gray-500">Cancelled</div>
          <div className="text-2xl font-semibold mt-1 text-gray-400">
            {cancelledSubscriptions.length}
          </div>
        </div>
      </div>

      {editing ? (
        <div className="bg-white p-6 rounded-lg border space-y-4">
          <h2 className="text-lg font-semibold">Edit Customer</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
              <input
                type="text"
                value={formData.domain}
                onChange={(e) => setFormData((f) => ({ ...f, domain: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-semibold mb-4">Customer Details</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm text-gray-500">Email</div>
              <div className="mt-1">{customer.email || <span className="text-gray-400">Not set</span>}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Domain</div>
              <div className="mt-1">
                {customer.domain ? (
                  <a
                    href={`https://${customer.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {customer.domain}
                  </a>
                ) : (
                  <span className="text-gray-400">Not set</span>
                )}
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="text-sm text-gray-500">Notes</div>
              <div className="mt-1 whitespace-pre-wrap">
                {customer.notes || <span className="text-gray-400">No notes</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-lg font-semibold mb-4">Subscriptions</h2>
        {customer.subscriptions.length === 0 ? (
          <p className="text-gray-500">No subscriptions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-medium">Plan</th>
                  <th className="text-left py-2 px-2 font-medium">MRR</th>
                  <th className="text-left py-2 px-2 font-medium">Started</th>
                  <th className="text-left py-2 px-2 font-medium">Status</th>
                  <th className="text-left py-2 px-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {customer.subscriptions.map((sub) => (
                  <tr key={sub.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 px-2 font-medium">{sub.planName}</td>
                    <td className="py-2 px-2">${sub.mrr.toLocaleString()}</td>
                    <td className="py-2 px-2">{new Date(sub.startedAt).toLocaleDateString()}</td>
                    <td className="py-2 px-2">
                      {sub.isActive ? (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                          Cancelled{sub.cancelledAt && ` - ${new Date(sub.cancelledAt).toLocaleDateString()}`}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-gray-500 truncate max-w-xs">
                      {sub.cancelReason || sub.notes || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
