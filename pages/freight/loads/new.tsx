import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

type Venture = { id: number; name: string };
type Office = { id: number; name: string; ventureId: number };

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
  "Other",
];

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

export default function NewLoadPage() {
  const router = useRouter();
  const [ventures, setVentures] = useState<Venture[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    ventureId: "",
    officeId: "",
    reference: "",
    shipperName: "",
    shipperRef: "",
    customerName: "",
    pickupCity: "",
    pickupState: "",
    pickupZip: "",
    pickupDate: "",
    dropCity: "",
    dropState: "",
    dropZip: "",
    dropDate: "",
    equipmentType: "",
    weightLbs: "",
    rate: "",
    notes: "",
  });

  useEffect(() => {
    fetch("/api/freight/meta")
      .then((r) => r.json())
      .then((data) => {
        setVentures(data.ventures || []);
        setOffices(data.offices || []);
        if (data.ventures?.length === 1) {
          setForm((prev) => ({ ...prev, ventureId: String(data.ventures[0].id) }));
        }
      });
  }, []);

  const onChange = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const filteredOffices = form.ventureId
    ? offices.filter((o) => o.ventureId === parseInt(form.ventureId, 10))
    : offices;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/freight/loads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          weightLbs: form.weightLbs || null,
          rate: form.rate || null,
        }),
      });

      if (res.ok) {
        const load = await res.json();
        router.push(`/freight/loads/${load.id}`);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create load");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">New Load</h1>
          <p className="text-sm text-gray-500 mt-1">
            Fast manual entry for loads from email / 3PI
          </p>
        </div>
        <Link href="/freight/loads" className="text-sm text-gray-600 hover:underline">
          Back to loads
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Venture *
            </label>
            <select
              className="border border-gray-300 rounded-lg px-3 py-2 w-full"
              required
              value={form.ventureId}
              onChange={(e) => onChange("ventureId", e.target.value)}
            >
              <option value="">Select venture</option>
              {ventures.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Office
            </label>
            <select
              className="border border-gray-300 rounded-lg px-3 py-2 w-full"
              value={form.officeId}
              onChange={(e) => onChange("officeId", e.target.value)}
            >
              <option value="">Select office (optional)</option>
              {filteredOffices.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h3 className="font-medium text-gray-900 mb-3">Location Info</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location Name
              </label>
              <input
                type="text"
                className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                value={form.shipperName}
                onChange={(e) => onChange("shipperName", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reference
              </label>
              <input
                type="text"
                className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                placeholder="Customer / 3PI ref"
                value={form.reference}
                onChange={(e) => onChange("reference", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name
              </label>
              <input
                type="text"
                className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                value={form.customerName}
                onChange={(e) => onChange("customerName", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h3 className="font-medium text-gray-900 mb-3">Pickup</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City *
              </label>
              <input
                type="text"
                className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                required
                value={form.pickupCity}
                onChange={(e) => onChange("pickupCity", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State *
              </label>
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                required
                value={form.pickupState}
                onChange={(e) => onChange("pickupState", e.target.value)}
              >
                <option value="">Select</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zip
              </label>
              <input
                type="text"
                className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                value={form.pickupZip}
                onChange={(e) => onChange("pickupZip", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                required
                value={form.pickupDate}
                onChange={(e) => onChange("pickupDate", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h3 className="font-medium text-gray-900 mb-3">Drop</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City *
              </label>
              <input
                type="text"
                className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                required
                value={form.dropCity}
                onChange={(e) => onChange("dropCity", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State *
              </label>
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                required
                value={form.dropState}
                onChange={(e) => onChange("dropState", e.target.value)}
              >
                <option value="">Select</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zip
              </label>
              <input
                type="text"
                className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                value={form.dropZip}
                onChange={(e) => onChange("dropZip", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                value={form.dropDate}
                onChange={(e) => onChange("dropDate", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h3 className="font-medium text-gray-900 mb-3">Load Details</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Equipment Type *
              </label>
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                required
                value={form.equipmentType}
                onChange={(e) => onChange("equipmentType", e.target.value)}
              >
                <option value="">Select</option>
                {EQUIPMENT_TYPES.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weight (lbs)
              </label>
              <input
                type="number"
                className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                value={form.weightLbs}
                onChange={(e) => onChange("weightLbs", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rate ($)
              </label>
              <input
                type="number"
                step="0.01"
                className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                value={form.rate}
                onChange={(e) => onChange("rate", e.target.value)}
              />
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
            href="/freight/loads"
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Load"}
          </button>
        </div>
      </form>
    </div>
  );
}

NewLoadPage.title = "New Load";
