import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { isLeadership, isSuperAdmin } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

type Load = {
  id: number;
  tmsLoadId: string | null;
  pickupCity: string | null;
  pickupState: string | null;
  dropCity: string | null;
  dropState: string | null;
  status: string | null;
  billAmount: number | null;
};

type Touch = {
  id: number;
  channel: string;
  outcome: string | null;
  notes: string | null;
  createdAt: string;
  user: { id: number; fullName: string | null; email: string | null };
};

type Customer = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  vertical: string | null;
  isActive: boolean;
  lastTouchAt: string | null;
  venture: { id: number; name: string } | null;
  salesRep: { id: number; name: string | null } | null;
  csr: { id: number; name: string | null } | null;
  dispatcher: { id: number; name: string | null } | null;
  lastTouchBy: { id: number; fullName: string | null } | null;
  loads: Load[];
};

type User = { id: number; name: string | null };

const TOUCH_CHANNELS = [
  { value: "CALL", label: "Call" },
  { value: "EMAIL", label: "Email" },
  { value: "TEXT", label: "Text" },
  { value: "MEETING", label: "Meeting" },
  { value: "OTHER", label: "Other" },
];

const CHANNEL_ICONS: Record<string, string> = {
  CALL: "📞",
  EMAIL: "✉️",
  TEXT: "💬",
  MEETING: "🤝",
  OTHER: "📌",
};

export default function CustomerDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  const [touches, setTouches] = useState<Touch[]>([]);
  const [touchesLoading, setTouchesLoading] = useState(false);
  const [showTouchModal, setShowTouchModal] = useState(false);
  const [touchSaving, setTouchSaving] = useState(false);
  const [touchForm, setTouchForm] = useState({
    channel: "CALL",
    outcome: "",
    notes: "",
  });

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    vertical: "",
    assignedSalesId: "",
    assignedCsrId: "",
    assignedDispatcherId: "",
  });

  const { effectiveUser } = useEffectiveUser();
  const role = (effectiveUser?.role || "EMPLOYEE") as UserRole;
  const canEdit = isLeadership({ role });
  const canDelete = isSuperAdmin(role);

  const loadTouches = useCallback(async () => {
    if (!id) return;
    try {
      setTouchesLoading(true);
      const res = await fetch(`/api/logistics/customers/${id}/touches?limit=20`);
      if (res.ok) {
        const data = await res.json();
        setTouches(data.touches || []);
      }
    } catch (e) {
      console.error("Failed to load touches", e);
    } finally {
      setTouchesLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch("/api/admin/users?limit=500")
      .then((r) => r.json())
      .then((data) => setUsers(data || []));
  }, []);

  useEffect(() => {
    if (id) {
      loadTouches();
    }
  }, [id, loadTouches]);

  useEffect(() => {
    if (!id) return;

    async function loadCustomer() {
      try {
        setLoading(true);
        const res = await fetch(`/api/logistics/customers/${id}`);
        if (!res.ok) throw new Error("Failed to load customer");
        const data = await res.json();
        setCustomer(data);
        setForm({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          vertical: data.vertical || "",
          assignedSalesId: data.salesRep?.id?.toString() || "",
          assignedCsrId: data.csr?.id?.toString() || "",
          assignedDispatcherId: data.dispatcher?.id?.toString() || "",
        });
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    loadCustomer();
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/logistics/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          vertical: form.vertical.trim() || null,
          assignedSalesId: form.assignedSalesId ? parseInt(form.assignedSalesId, 10) : null,
          assignedCsrId: form.assignedCsrId ? parseInt(form.assignedCsrId, 10) : null,
          assignedDispatcherId: form.assignedDispatcherId ? parseInt(form.assignedDispatcherId, 10) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update customer");
      }

      const updated = await res.json();
      setCustomer((c) => (c ? { ...c, ...updated } : c));
      setEditing(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this customer? This cannot be undone."))
      return;

    try {
      const res = await fetch(`/api/logistics/customers/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete customer");
      }
      router.push("/logistics/customers");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  };

  const handleTouchFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setTouchForm((f) => ({ ...f, [name]: value }));
  };

  const handleLogTouch = async () => {
    if (!touchForm.channel) return;
    
    setTouchSaving(true);
    try {
      const res = await fetch(`/api/logistics/customers/${id}/touches/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: touchForm.channel,
          outcome: touchForm.outcome.trim() || null,
          notes: touchForm.notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to log touch");
      }

      const data = await res.json();
      setTouches((prev) => [data.touch, ...prev]);
      setCustomer((c) => c ? { 
        ...c, 
        lastTouchAt: new Date().toISOString(),
        lastTouchBy: { id: Number(effectiveUser?.id) || 0, fullName: effectiveUser?.name || null }
      } : c);
      setTouchForm({ channel: "CALL", outcome: "", notes: "" });
      setShowTouchModal(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to log touch");
    } finally {
      setTouchSaving(false);
    }
  };

  const formatTouchDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error && !customer) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
        <Link
          href="/logistics/customers"
          className="mt-4 inline-block text-blue-600 hover:underline"
        >
          Back to Customers
        </Link>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-gray-400 text-3xl mb-3">👥</div>
          <h3 className="text-gray-700 font-medium mb-1">Customer Not Found</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500 mb-1">
            <Link href="/logistics/customers" className="hover:underline">
              Customers
            </Link>{" "}
            / {customer.name}
          </div>
          <h1 className="text-2xl font-semibold">{customer.name}</h1>
        </div>
        <div className="flex gap-2">
          {canEdit && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
            >
              Edit
            </button>
          )}
          {canDelete && (
            <button
              onClick={handleDelete}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
      )}

      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-medium mb-4">Customer Details</h2>

        {editing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="text"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vertical
              </label>
              <input
                type="text"
                name="vertical"
                value={form.vertical}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="e.g., Food & Bev, Retail, Manufacturing"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <input
                type="text"
                name="address"
                value={form.address}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assigned Sales Rep
              </label>
              <select
                name="assignedSalesId"
                value={form.assignedSalesId}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || "Unnamed User"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assigned CSR
              </label>
              <select
                name="assignedCsrId"
                value={form.assignedCsrId}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || "Unnamed User"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assigned Dispatcher
              </label>
              <select
                name="assignedDispatcherId"
                value={form.assignedDispatcherId}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || "Unnamed User"}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 flex gap-2 pt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500">Email</div>
              <div className="font-medium">{customer.email || "-"}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Phone</div>
              <div className="font-medium">{customer.phone || "-"}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Vertical</div>
              <div className="font-medium">{customer.vertical || "-"}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Venture</div>
              <div className="font-medium">{customer.venture?.name || "-"}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-sm text-gray-500">Address</div>
              <div className="font-medium">{customer.address || "-"}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Sales Rep</div>
              <div className="font-medium">
                {customer.salesRep?.name || (
                  <span className="text-gray-400">Unassigned</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">CSR</div>
              <div className="font-medium">
                {customer.csr?.name || (
                  <span className="text-gray-400">Unassigned</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Dispatcher</div>
              <div className="font-medium">
                {customer.dispatcher?.name || (
                  <span className="text-gray-400">Unassigned</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Touchpoints Card */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">
            Touchpoints ({touches.length})
          </h2>
          <button
            onClick={() => setShowTouchModal(true)}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
          >
            Log Touch
          </button>
        </div>
        
        {customer.lastTouchAt && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
            <span className="text-gray-500">Last touched:</span>{" "}
            <span className="font-medium">{formatTouchDate(customer.lastTouchAt)}</span>
            {customer.lastTouchBy?.fullName && (
              <span className="text-gray-500"> by {customer.lastTouchBy.fullName}</span>
            )}
          </div>
        )}

        {touchesLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
          </div>
        ) : touches.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No touchpoints recorded yet. Log your first interaction!
          </div>
        ) : (
          <div className="space-y-3">
            {touches.slice(0, 10).map((touch) => (
              <div key={touch.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="text-xl">{CHANNEL_ICONS[touch.channel] || "📌"}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{touch.channel}</span>
                    {touch.outcome && (
                      <span className="text-gray-500">- {touch.outcome}</span>
                    )}
                  </div>
                  {touch.notes && (
                    <p className="text-sm text-gray-600 mt-1 truncate">{touch.notes}</p>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    {formatTouchDate(touch.createdAt)} by {touch.user.fullName || "Unknown"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Log Touch Modal */}
      {showTouchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium mb-4">Log Customer Touch</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Channel *
                </label>
                <select
                  name="channel"
                  value={touchForm.channel}
                  onChange={handleTouchFormChange}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  {TOUCH_CHANNELS.map((ch) => (
                    <option key={ch.value} value={ch.value}>
                      {CHANNEL_ICONS[ch.value]} {ch.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Outcome
                </label>
                <input
                  type="text"
                  name="outcome"
                  value={touchForm.outcome}
                  onChange={handleTouchFormChange}
                  placeholder="e.g., Left voicemail, Quote sent, Meeting scheduled"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={touchForm.notes}
                  onChange={handleTouchFormChange}
                  rows={3}
                  placeholder="Additional details about the interaction..."
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleLogTouch}
                disabled={touchSaving}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {touchSaving ? "Saving..." : "Log Touch"}
              </button>
              <button
                onClick={() => setShowTouchModal(false)}
                className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-medium mb-4">
          Recent Loads ({customer.loads.length})
        </h2>
        {customer.loads.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No loads found for this customer.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Load ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Origin
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Destination
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Bill Amount
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customer.loads.map((load) => (
                <tr key={load.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/freight/loads/${load.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {load.tmsLoadId || `#${load.id}`}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {load.pickupCity || "-"}, {load.pickupState || ""}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {load.dropCity || "-"}, {load.dropState || ""}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        load.status === "COVERED"
                          ? "bg-green-100 text-green-800"
                          : load.status === "LOST"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {load.status || "UNKNOWN"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {load.billAmount
                      ? `$${load.billAmount.toLocaleString()}`
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
