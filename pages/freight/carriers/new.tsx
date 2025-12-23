import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

const EQUIPMENT_TYPES = [
  "Dry Van",
  "Reefer",
  "Flatbed",
  "Step Deck",
  "Power Only",
  "Box Truck",
  "Sprinter Van",
  "Hotshot",
  "Conestoga",
  "RGN",
];

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

export default function NewCarrierPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    mcNumber: "",
    dotNumber: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    equipmentTypes: [] as string[],
    rating: "",
    notes: "",
  });

  type DispatcherOption = { userId: number; name: string; email: string | null };

  const [dispatcherQuery, setDispatcherQuery] = useState("");
  const [dispatcherOptions, setDispatcherOptions] = useState<DispatcherOption[]>([]);
  const [selectedDispatchers, setSelectedDispatchers] = useState<DispatcherOption[]>([]);

  const onChange = (field: string, value: string | string[]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const toggleEquipment = (eq: string) => {
    setForm((prev) => ({
      ...prev,
      equipmentTypes: prev.equipmentTypes.includes(eq)
        ? prev.equipmentTypes.filter((e) => e !== eq)
        : [...prev.equipmentTypes, eq],
    }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/freight/carriers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          equipmentTypes: form.equipmentTypes.join(", "),
          rating: form.rating || null,
          dispatcherIds: selectedDispatchers.map((d) => d.userId),
        }),
      });

      if (res.ok) {
        const carrier = await res.json();
        router.push(`/freight/carriers/${carrier.id}`);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create carrier");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">New Carrier</h1>
          <p className="text-sm text-gray-500 mt-1">
            Add a new carrier to your carrier book
          </p>
        </div>
        <Link href="/freight/carriers" className="text-sm text-gray-600 hover:underline">
          Back to carriers
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="bg-white rounded-xl border border-gray-200 p-6 space-y-6"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Name *
            </label>
            <input
              type="text"
              className="border border-gray-300 rounded-lg px-3 py-2 w-full"
              required
              value={form.name}
              onChange={(e) => onChange("name", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              MC Number
            </label>
            <input
              type="text"
              className="border border-gray-300 rounded-lg px-3 py-2 w-full"
              placeholder="e.g. 123456"
              value={form.mcNumber}
              onChange={(e) => onChange("mcNumber", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              DOT Number
            </label>
            <input
              type="text"
              className="border border-gray-300 rounded-lg px-3 py-2 w-full"
              placeholder="e.g. 7654321"
              value={form.dotNumber}
              onChange={(e) => onChange("dotNumber", e.target.value)}
            />
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h3 className="font-medium text-gray-900 mb-3">Contact Info</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                value={form.email}
                onChange={(e) => onChange("email", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                value={form.phone}
                onChange={(e) => onChange("phone", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h3 className="font-medium text-gray-900 mb-3">Location</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                value={form.city}
                onChange={(e) => onChange("city", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                value={form.state}
                onChange={(e) => onChange("state", e.target.value)}
              >
                <option value="">Select state</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h3 className="font-medium text-gray-900 mb-3">Equipment Types</h3>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT_TYPES.map((eq) => (
              <button
                key={eq}
                type="button"
                onClick={() => toggleEquipment(eq)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                  form.equipmentTypes.includes(eq)
                    ? "bg-blue-100 border-blue-300 text-blue-800"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {eq}
              </button>
            ))}
          </div>
        </div>
        <div className="border-t border-gray-200 pt-4">
          <h3 className="font-medium text-gray-900 mb-3">Dispatchers (optional)</h3>
          <div className="space-y-2">
            <input
              type="text"
              className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm"
              placeholder="Search users to assign as dispatchers"
              value={dispatcherQuery}
              onChange={async (e) => {
                const value = e.target.value;
                setDispatcherQuery(value);
                if (!value.trim()) {
                  setDispatcherOptions([]);
                  return;
                }
                try {
                  const params = new URLSearchParams({ query: value.trim() });
                  const res = await fetch(
                    `/api/users/dispatcher-search?${params.toString()}`,
                  );
                  const data = await res.json();
                  setDispatcherOptions(data || []);
                } catch {
                  setDispatcherOptions([]);
                }
              }}
            />
            {dispatcherOptions.length > 0 && dispatcherQuery && (
              <div className="border border-gray-200 rounded-lg bg-white shadow-sm max-h-40 overflow-y-auto text-sm">
                {dispatcherOptions.map((d) => (
                  <button
                    key={d.userId}
                    type="button"
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-50"
                    onClick={() => {
                      setSelectedDispatchers((prev) => {
                        const exists = prev.some((p) => p.userId === d.userId);
                        if (exists) return prev;
                        return [...prev, d];
                      });
                      setDispatcherQuery("");
                      setDispatcherOptions([]);
                    }}
                  >
                    <div className="font-medium">{d.name}</div>
                    {d.email && (
                      <div className="text-xs text-gray-500 truncate">{d.email}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
            {selectedDispatchers.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1 text-xs">
                {selectedDispatchers.map((d) => (
                  <span
                    key={d.userId}
                    className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 gap-1"
                  >
                    <span className="truncate max-w-[140px]">
                      {d.name}
                      {d.email ? ` - ${d.email}` : ""}
                    </span>
                    <button
                      type="button"
                      className="ml-1 text-[10px] text-blue-700 hover:text-blue-900"
                      onClick={() =>
                        setSelectedDispatchers((prev) =>
                          prev.filter((p) => p.userId !== d.userId),
                        )
                      }
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rating (1-5)
              </label>
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                value={form.rating}
                onChange={(e) => onChange("rating", e.target.value)}
              >
                <option value="">No rating</option>
                <option value="1">1 - Poor</option>
                <option value="2">2 - Fair</option>
                <option value="3">3 - Good</option>
                <option value="4">4 - Very Good</option>
                <option value="5">5 - Excellent</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            className="border border-gray-300 rounded-lg px-3 py-2 w-full"
            rows={3}
            value={form.notes}
            onChange={(e) => onChange("notes", e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Link
            href="/freight/carriers"
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Carrier"}
          </button>
        </div>
      </form>
    </div>
  );
}

NewCarrierPage.title = "New Carrier";
