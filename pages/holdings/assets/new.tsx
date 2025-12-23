import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";

interface Venture {
  id: number;
  name: string;
}

const ASSET_TYPES = [
  { value: "real_estate", label: "Real Estate" },
  { value: "vehicle", label: "Vehicle" },
  { value: "equipment", label: "Equipment" },
  { value: "investment", label: "Investment" },
  { value: "intellectual_property", label: "Intellectual Property" },
  { value: "other", label: "Other" },
];

function NewAssetPage() {
  const router = useRouter();
  const [holdingsVentures, setHoldingsVentures] = useState<Venture[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    if (!form.name || !form.type) {
      setError("Asset name and type are required.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/holdings/assets", {
        method: "POST",
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
        throw new Error(data.error || "Failed to create asset");
      }

      router.push("/holdings/assets");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
        <h1 className="text-xl font-semibold mb-1">Add New Asset</h1>
        <p className="text-sm text-gray-500 mb-4">
          Record a new company asset in the holdings portfolio.
        </p>

        {error && (
          <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-sm text-gray-500">Loading...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="E.g. Atlanta Office Building"
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
                <label className="block text-sm font-medium mb-1">
                  Venture (optional)
                </label>
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
                placeholder="Address or location description"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Estimated Value
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    name="valueEstimate"
                    value={form.valueEstimate}
                    onChange={handleChange}
                    className="w-full rounded border pl-7 pr-3 py-2 text-sm"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Acquired Date
                </label>
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
                placeholder="Additional details about this asset..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => router.push("/holdings/assets")}
                className="rounded border px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Asset"}
              </button>
            </div>
          </form>
        )}
    </div>
  );
}

NewAssetPage.title = "New Asset";

export default NewAssetPage;
