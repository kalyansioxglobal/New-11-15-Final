import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};

interface Venture {
  id: number;
  name: string;
  type: string;
}

function NewHotelPage() {
  const router = useRouter();
  const [hotelVentures, setHotelVentures] = useState<Venture[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    code: "",
    brand: "",
    ventureId: "",
    city: "",
    state: "",
    country: "USA",
    rooms: "",
  });

  useEffect(() => {
    fetch("/api/ventures?types=HOSPITALITY")
      .then((r) => r.json())
      .then((data) => setHotelVentures(data || []))
      .catch(() => setError("Failed to load ventures"))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    if (!form.name || !form.ventureId) {
      setError("Hotel name and venture are required.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/hospitality/hotels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          code: form.code || null,
          brand: form.brand || null,
          ventureId: Number(form.ventureId),
          city: form.city || null,
          state: form.state || null,
          country: form.country || "USA",
          rooms: form.rooms ? Number(form.rooms) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create hotel");
      }

      setSuccess("Hotel created successfully!");
      router.push("/hotels");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold mb-1">Add New Hotel</h1>
      <p className="text-sm text-gray-500 mb-4">
        Add a new hotel property to your portfolio.
      </p>

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

      {loading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Hotel Name <span className="text-red-500">*</span>
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder="E.g. Red Roof Inn Atlanta Airport"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Internal Code
              </label>
              <input
                name="code"
                value={form.code}
                onChange={handleChange}
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="CHK-ATL-01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Brand</label>
              <input
                name="brand"
                value={form.brand}
                onChange={handleChange}
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Motel 6 / Independent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Venture <span className="text-red-500">*</span>
            </label>
            <select
              name="ventureId"
              value={form.ventureId}
              onChange={handleChange}
              required
              className="w-full rounded border px-3 py-2 text-sm"
            >
              <option value="">Select venture</option>
              {hotelVentures.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            {hotelVentures.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">
                No hospitality ventures found. Create a venture first.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Atlanta"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">State</label>
              <input
                name="state"
                value={form.state}
                onChange={handleChange}
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="GA"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Country</label>
              <input
                name="country"
                value={form.country}
                onChange={handleChange}
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="USA"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Room Count
            </label>
            <input
              type="number"
              name="rooms"
              value={form.rooms}
              onChange={handleChange}
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder="100"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.push("/hotels")}
              className="rounded border px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Hotel"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

NewHotelPage.title = "Add Hotel";

export default NewHotelPage;
