import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { canCreateTasks, isSuperAdmin } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

type Load = {
  id: number;
  pickupCity: string | null;
  pickupState: string | null;
  dropCity: string | null;
  dropState: string | null;
  status: string;
  rate: number | null;
  createdAt: string;
};

type Shipper = {
  id: number;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  notes: string | null;
  isActive: boolean;
  venture: { id: number; name: string };
  loads: Load[];
};

export default function ShipperDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [shipper, setShipper] = useState<Shipper | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    country: "",
    notes: "",
  });

  const { effectiveUser } = useEffectiveUser();
  const role = (effectiveUser?.role || "EMPLOYEE") as UserRole;
  const canEdit = canCreateTasks(role);
  const canDelete = isSuperAdmin(role);

  useEffect(() => {
    if (!id) return;

    async function loadShipper() {
      try {
        setLoading(true);
        const res = await fetch(`/api/logistics/shippers/${id}`);
        if (!res.ok) throw new Error("Failed to load shipper");
        const data = await res.json();
        setShipper(data);
        setForm({
          name: data.name || "",
          contactName: data.contactName || "",
          email: data.email || "",
          phone: data.phone || "",
          city: data.city || "",
          state: data.state || "",
          country: data.country || "",
          notes: data.notes || "",
        });
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    loadShipper();
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/logistics/shippers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          contactName: form.contactName.trim() || null,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          city: form.city.trim() || null,
          state: form.state.trim() || null,
          country: form.country.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update shipper");
      }

      const updated = await res.json();
      setShipper((s) => (s ? { ...s, ...updated } : s));
      setEditing(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirm("Are you sure you want to deactivate this shipper?")) return;

    try {
      const res = await fetch(`/api/logistics/shippers/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to deactivate shipper");

      router.push("/logistics/shippers");
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!shipper) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🏭</div>
          <h2 className="text-xl font-semibold text-gray-700">Shipper Not Found</h2>
          <Link href="/logistics/shippers" className="text-blue-600 hover:underline mt-2 inline-block">
            Back to Shippers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <Link href="/logistics/shippers" className="text-sm text-blue-600 hover:underline">
          &larr; Back to Shippers
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
      )}

      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">{shipper.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {shipper.venture.name} &bull;{" "}
              {shipper.isActive ? (
                <span className="text-green-600">Active</span>
              ) : (
                <span className="text-red-600">Inactive</span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/admin/freight/shippers/${id}/preferred-lanes`}
              className="px-4 py-2 text-sm border border-emerald-500 text-emerald-600 rounded-lg hover:bg-emerald-50"
            >
              Preferred Lanes
            </Link>
            {canEdit && !editing && (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
                >
                  Edit
                </button>
                {canDelete && (
                  <button
                    onClick={handleDeactivate}
                    className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                  >
                    Deactivate
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shipper Name
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  name="contactName"
                  value={form.contactName}
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  name="country"
                  value={form.country}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-6 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Contact Information</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Contact:</span>{" "}
                    <span className="text-gray-900">{shipper.contactName || "-"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>{" "}
                    <span className="text-gray-900">{shipper.email || "-"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Phone:</span>{" "}
                    <span className="text-gray-900">{shipper.phone || "-"}</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Location</h3>
                <div className="text-sm text-gray-900">
                  {[shipper.city, shipper.state, shipper.country].filter(Boolean).join(", ") || "-"}
                </div>
              </div>
            </div>

            {shipper.notes && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Notes</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{shipper.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {shipper.loads && shipper.loads.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-4">Recent Loads</h2>
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Lane
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Rate
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {shipper.loads.map((load) => (
                  <tr key={load.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <Link
                        href={`/logistics/loads/${load.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {[load.pickupCity, load.pickupState].filter(Boolean).join(", ") || "?"} →{" "}
                        {[load.dropCity, load.dropState].filter(Boolean).join(", ") || "?"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          load.status === "COVERED"
                            ? "bg-green-100 text-green-800"
                            : load.status === "OPEN"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {load.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {load.rate ? `$${load.rate.toLocaleString()}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(load.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

ShipperDetailPage.title = "Shipper Details";
