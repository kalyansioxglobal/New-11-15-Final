import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { isSuperAdmin } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

interface Venture {
  id: number;
  name: string;
}

interface Asset {
  id: number;
  name: string;
  type: string;
  location: string | null;
  valueEstimate: number | null;
  acquiredDate: string | null;
  notes: string | null;
  isActive: boolean;
  venture: Venture | null;
  createdAt: string;
  updatedAt: string;
}

const ASSET_TYPES = [
  { value: "real_estate", label: "Real Estate" },
  { value: "vehicle", label: "Vehicle" },
  { value: "equipment", label: "Equipment" },
  { value: "investment", label: "Investment" },
  { value: "intellectual_property", label: "Intellectual Property" },
  { value: "other", label: "Other" },
];

function AssetDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [asset, setAsset] = useState<Asset | null>(null);
  const [holdingsVentures, setHoldingsVentures] = useState<Venture[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { effectiveUser } = useEffectiveUser();
  const role = (effectiveUser?.role || "EMPLOYEE") as UserRole;
  const canEdit = isSuperAdmin(role);

  const [form, setForm] = useState({
    name: "",
    type: "real_estate",
    ventureId: "",
    location: "",
    valueEstimate: "",
    acquiredDate: "",
    notes: "",
  });

  useEffect(() => {
    fetch("/api/ventures?types=HOLDINGS")
      .then((r) => r.json())
      .then((data) => setHoldingsVentures(data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;

    async function loadAsset() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/holdings/assets/${id}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to load asset");
        }
        const data = await res.json();
        setAsset(data);
        setForm({
          name: data.name || "",
          type: data.type || "real_estate",
          ventureId: data.venture?.id?.toString() || "",
          location: data.location || "",
          valueEstimate: data.valueEstimate?.toString() || "",
          acquiredDate: data.acquiredDate ? data.acquiredDate.split("T")[0] : "",
          notes: data.notes || "",
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadAsset();
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    if (!form.name || !form.type) {
      setError("Asset name and type are required.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/holdings/assets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          ventureId: form.ventureId ? Number(form.ventureId) : null,
          location: form.location || null,
          valueEstimate: form.valueEstimate ? Number(form.valueEstimate) : null,
          acquiredDate: form.acquiredDate || null,
          notes: form.notes || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update asset");
      }

      setAsset(data);
      setEditMode(false);
      setSuccess("Asset updated successfully");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/holdings/assets/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete asset");
      }

      router.push("/holdings/assets");
    } catch (err: any) {
      setError(err.message);
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleCancel = () => {
    if (asset) {
      setForm({
        name: asset.name || "",
        type: asset.type || "real_estate",
        ventureId: asset.venture?.id?.toString() || "",
        location: asset.location || "",
        valueEstimate: asset.valueEstimate?.toString() || "",
        acquiredDate: asset.acquiredDate ? asset.acquiredDate.split("T")[0] : "",
        notes: asset.notes || "",
      });
    }
    setEditMode(false);
    setError(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!asset && !loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 border rounded-xl bg-gray-50">
          <div className="text-gray-400 text-3xl mb-3">🏠</div>
          <h3 className="text-gray-700 font-medium mb-1">Asset Not Found</h3>
          <p className="text-sm text-gray-500 mb-4">
            The asset you're looking for doesn't exist or you don't have access.
          </p>
          <Link href="/holdings/assets" className="text-blue-600 hover:underline text-sm">
            Back to Assets
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/holdings/assets" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
            ← Back to Assets
          </Link>
          <h1 className="text-2xl font-semibold">{asset?.name}</h1>
        </div>
        {canEdit && !editMode && (
          <div className="flex gap-2">
            <button
              onClick={() => setEditMode(true)}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            >
              Edit Asset
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded border border-green-300 bg-green-50 p-3 text-sm text-green-800">
          {success}
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete Asset</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete "{asset?.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded border text-sm"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded bg-red-600 text-white text-sm font-medium disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editMode ? (
        <form onSubmit={handleSave} className="space-y-4 bg-white p-6 rounded-lg border">
          <div>
            <label className="block text-sm font-medium mb-1">
              Asset Name <span className="text-red-500">*</span>
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Asset Type <span className="text-red-500">*</span>
              </label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                required
                className="w-full rounded border px-3 py-2 text-sm"
              >
                {ASSET_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Venture</label>
              <select
                name="ventureId"
                value={form.ventureId}
                onChange={handleChange}
                className="w-full rounded border px-3 py-2 text-sm"
              >
                <option value="">No specific venture</option>
                {holdingsVentures.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Estimated Value</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  name="valueEstimate"
                  value={form.valueEstimate}
                  onChange={handleChange}
                  className="w-full rounded border pl-7 pr-3 py-2 text-sm"
                  step="0.01"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Acquired Date</label>
              <input
                type="date"
                name="acquiredDate"
                value={form.acquiredDate}
                onChange={handleChange}
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded border px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white p-6 rounded-lg border space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-gray-500">Asset Type</div>
              <div className="font-medium mt-1">{asset?.type.replace(/_/g, " ")}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Venture</div>
              <div className="font-medium mt-1">{asset?.venture?.name || "Not assigned"}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Location</div>
              <div className="font-medium mt-1">{asset?.location || "Not specified"}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Estimated Value</div>
              <div className="font-medium mt-1 text-green-600">
                {asset?.valueEstimate ? `$${asset.valueEstimate.toLocaleString()}` : "Not set"}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Acquired Date</div>
              <div className="font-medium mt-1">
                {asset?.acquiredDate
                  ? new Date(asset.acquiredDate).toLocaleDateString()
                  : "Not specified"}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Status</div>
              <div className="font-medium mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs ${asset?.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                  {asset?.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>

          {asset?.notes && (
            <div className="pt-4 border-t">
              <div className="text-sm text-gray-500">Notes</div>
              <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{asset.notes}</div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-3">Documents</h2>
        <Link
          href={`/holdings/assets/${id}/documents`}
          className="inline-block px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
        >
          View Documents →
        </Link>
      </div>
    </div>
  );
}

AssetDetailPage.title = "Asset Details";

export default AssetDetailPage;
