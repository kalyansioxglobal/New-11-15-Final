import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

type Load = {
  id: number;
  reference: string | null;
  pickupCity: string;
  pickupState: string;
  dropCity: string;
  dropState: string;
  pickupDate: string;
  status: string;
  rate: number | null;
};

type Contact = {
  id: number;
  channel: string;
  subject: string | null;
  outcome: string | null;
  createdAt: string;
  madeBy: { id: number; name: string };
  load: { id: number; reference: string | null } | null;
};

type CarrierDispatcher = {
  userId: number;
  name: string;
  email: string | null;
};

type DispatcherContact = {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  isPrimary: boolean;
  isBackup: boolean;
  preferredContactMethod: string | null;
  notes: string | null;
};

type Carrier = {
  id: number;
  name: string;
  mcNumber: string | null;
  dotNumber: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  equipmentTypes: string | null;
  lanesJson: string | null;
  rating: number | null;
  active: boolean;
  notes: string | null;
  loads: Load[];
  contacts: Contact[];
  dispatchers?: CarrierDispatcher[];
};

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

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  WORKING: "bg-yellow-100 text-yellow-800",
  COVERED: "bg-green-100 text-green-800",
  LOST: "bg-red-100 text-red-800",
  DORMANT: "bg-gray-100 text-gray-800",
  MAYBE: "bg-purple-100 text-purple-800",
};

export default function CarrierDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [carrier, setCarrier] = useState<Carrier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

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
    active: true,
  });

  const [dispatcherQuery, setDispatcherQuery] = useState("");
  const [dispatcherOptions, setDispatcherOptions] = useState<CarrierDispatcher[]>([]);

  const [contactForm, setContactForm] = useState({
    channel: "phone",
    subject: "",
    outcome: "",
    notes: "",
  });
  const [loggingContact, setLoggingContact] = useState(false);

  const [dispatcherContacts, setDispatcherContacts] = useState<DispatcherContact[]>([]);
  const [showDispatcherModal, setShowDispatcherModal] = useState(false);
  const [editingDispatcher, setEditingDispatcher] = useState<DispatcherContact | null>(null);
  const [dispatcherForm, setDispatcherForm] = useState({
    name: "",
    role: "",
    email: "",
    phone: "",
    mobile: "",
    isPrimary: false,
    isBackup: false,
    preferredContactMethod: "",
    notes: "",
  });
  const [savingDispatcher, setSavingDispatcher] = useState(false);

  const fetchDispatchers = async (carrierId: string) => {
    try {
      const res = await fetch(`/api/freight/carriers/${carrierId}/dispatchers`);
      if (res.ok) {
        const data = await res.json();
        setDispatcherContacts(data.dispatchers || []);
      }
    } catch (e) {
      console.error("Failed to fetch dispatchers", e);
    }
  };

  useEffect(() => {
    if (!id) return;

    fetch(`/api/freight/carriers/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Carrier not found");
        return r.json();
      })
      .then((data) => {
        setCarrier(data.carrier);
        setForm({
          name: data.carrier.name,
          mcNumber: data.carrier.mcNumber || "",
          dotNumber: data.carrier.dotNumber || "",
          email: data.carrier.email || "",
          phone: data.carrier.phone || "",
          city: data.carrier.city || "",
          state: data.carrier.state || "",
          equipmentTypes: data.carrier.equipmentTypes
            ? data.carrier.equipmentTypes.split(", ")
            : [],
          rating: data.carrier.rating ? String(data.carrier.rating) : "",
          notes: data.carrier.notes || "",
          active: data.carrier.active,
        });
        setLoading(false);
        fetchDispatchers(String(id));
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  const toggleEquipment = (eq: string) => {
    setForm((prev) => ({
      ...prev,
      equipmentTypes: prev.equipmentTypes.includes(eq)
        ? prev.equipmentTypes.filter((e) => e !== eq)
        : [...prev.equipmentTypes, eq],
    }));
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/freight/carriers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          equipmentTypes: form.equipmentTypes.join(", "),
          rating: form.rating || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCarrier((prev) => (prev ? { ...prev, ...data.carrier } : prev));
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const logContact = async () => {
    setLoggingContact(true);
    try {
      const res = await fetch(`/api/freight/carriers/${id}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm),
      });
      if (res.ok) {
        const data = await res.json();
        setCarrier((prev) =>
          prev
            ? { ...prev, contacts: [data.contact, ...prev.contacts] }
            : prev
        );
        setContactForm({ channel: "phone", subject: "", outcome: "", notes: "" });
      }
    } finally {
      setLoggingContact(false);
    }
  };

  const openDispatcherModal = (dispatcher?: DispatcherContact) => {
    if (dispatcher) {
      setEditingDispatcher(dispatcher);
      setDispatcherForm({
        name: dispatcher.name,
        role: dispatcher.role || "",
        email: dispatcher.email || "",
        phone: dispatcher.phone || "",
        mobile: dispatcher.mobile || "",
        isPrimary: dispatcher.isPrimary,
        isBackup: dispatcher.isBackup,
        preferredContactMethod: dispatcher.preferredContactMethod || "",
        notes: dispatcher.notes || "",
      });
    } else {
      setEditingDispatcher(null);
      setDispatcherForm({
        name: "",
        role: "",
        email: "",
        phone: "",
        mobile: "",
        isPrimary: false,
        isBackup: false,
        preferredContactMethod: "",
        notes: "",
      });
    }
    setShowDispatcherModal(true);
  };

  const closeDispatcherModal = () => {
    setShowDispatcherModal(false);
    setEditingDispatcher(null);
  };

  const saveDispatcher = async () => {
    if (!dispatcherForm.name.trim()) return;
    setSavingDispatcher(true);
    try {
      const method = editingDispatcher ? "PUT" : "POST";
      const body = editingDispatcher
        ? { dispatcherId: editingDispatcher.id, ...dispatcherForm }
        : dispatcherForm;

      const res = await fetch(`/api/freight/carriers/${id}/dispatchers`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await fetchDispatchers(String(id));
        closeDispatcherModal();
      }
    } finally {
      setSavingDispatcher(false);
    }
  };

  const deleteDispatcher = async (dispatcherId: string) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;
    try {
      const res = await fetch(`/api/freight/carriers/${id}/dispatchers`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dispatcherId }),
      });
      if (res.ok) {
        await fetchDispatchers(String(id));
      }
    } catch (e) {
      console.error("Failed to delete dispatcher", e);
    }
  };

  if (loading) {
    return <div className="p-6 text-gray-500">Loading carrier...</div>;
  }

  if (error || !carrier) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error || "Carrier not found"}</p>
        <Link href="/freight/carriers" className="text-blue-600 underline text-sm mt-2 inline-block">
          Back to carriers
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{carrier.name}</h1>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                carrier.active
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {carrier.active ? "Active" : "Inactive"}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {carrier.mcNumber && `MC# ${carrier.mcNumber}`}
            {carrier.mcNumber && carrier.dotNumber && " | "}
            {carrier.dotNumber && `DOT# ${carrier.dotNumber}`}
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/admin/freight/carriers/${id}/preferred-lanes`}
            className="px-4 py-2 rounded-lg border border-emerald-500 text-emerald-600 hover:bg-emerald-50 text-sm"
          >
            Preferred Lanes
          </Link>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm"
            >
              Edit
            </button>
          )}
          <Link
            href="/freight/carriers"
            className="text-sm text-gray-600 hover:underline py-2"
          >
            Back to carriers
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-lg mb-4">
              {editing ? "Edit Carrier" : "Carrier Details"}
            </h2>

            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                      value={form.name}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                      value={form.active ? "true" : "false"}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          active: e.target.value === "true",
                        }))
                      }
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      MC Number
                    </label>
                    <input
                      type="text"
                      className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                      value={form.mcNumber}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, mcNumber: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      DOT Number
                    </label>
                    <input
                      type="text"
                      className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                      value={form.dotNumber}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, dotNumber: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                      value={form.email}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, email: e.target.value }))
                      }
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
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, phone: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                      value={form.city}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, city: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    <select
                      className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                      value={form.state}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, state: e.target.value }))
                      }
                    >
                      <option value="">Select state</option>
                      {US_STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rating
                    </label>
                    <select
                      className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                      value={form.rating}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, rating: e.target.value }))
                      }
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Equipment Types
                  </label>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                    rows={3}
                    value={form.notes}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, notes: e.target.value }))
                    }
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setEditing(false)}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveChanges}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Location</div>
                  <div className="font-medium">
                    {carrier.city && carrier.state
                      ? `${carrier.city}, ${carrier.state}`
                      : carrier.state || "-"}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Email</div>
                  <div className="font-medium">{carrier.email || "-"}</div>
                </div>
                <div>
                  <div className="text-gray-500">Phone</div>
                  <div className="font-medium">{carrier.phone || "-"}</div>
                </div>
                <div>
                  <div className="text-gray-500">Rating</div>
                  <div className="font-medium">
                    {carrier.rating && carrier.rating > 0 ? (
                      <span className="text-yellow-600">
                        {"★".repeat(Math.min(Math.max(carrier.rating, 0), 5))}
                        {"☆".repeat(Math.max(5 - Math.min(Math.max(carrier.rating, 0), 5), 0))}
                      </span>
                    ) : (
                      "-"
                    )}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-gray-500">Equipment</div>
                  <div className="font-medium">{carrier.equipmentTypes || "-"}</div>
                </div>
                {carrier.notes && (
                  <div className="col-span-2">
                    <div className="text-gray-500">Notes</div>
                    <div className="font-medium">{carrier.notes}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-lg mb-4">Assigned Dispatchers</h2>
            <div className="space-y-3 text-sm">
              {carrier.dispatchers && carrier.dispatchers.length > 0 ? (
                <ul className="space-y-1">
                  {carrier.dispatchers.map((d) => (
                    <li key={d.userId} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{d.name}</div>
                        {d.email && (
                          <div className="text-xs text-gray-500">{d.email}</div>
                        )}
                      </div>
                      {editing && (
                        <button
                          type="button"
                          className="text-xs text-red-600 hover:underline"
                          onClick={async () => {
                            try {
                              const res = await fetch("/api/carriers/dispatchers/remove", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ carrierId: carrier.id, userId: d.userId }),
                              });
                              if (res.ok) {
                                const data = await res.json();
                                setCarrier((prev) =>
                                  prev ? { ...prev, dispatchers: data.dispatchers || [] } : prev,
                                );
                              }
                            } catch (e) {
                              // TODO: surface error via toast once global toast system is available
                              console.error("Failed to remove dispatcher", e);
                            }
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm">No dispatchers assigned yet.</p>
              )}

              {editing && (
                <div className="space-y-2 pt-3 border-t border-gray-100 mt-3">
                  <label className="block text-xs font-medium text-gray-700">
                    Add dispatcher
                  </label>
                  <input
                    type="text"
                    className="border border-gray-300 rounded-lg px-3 py-1.5 w-full text-sm"
                    placeholder="Search users..."
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
                          onClick={async () => {
                            try {
                              const res = await fetch("/api/carriers/dispatchers/add", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ carrierId: carrier.id, userId: d.userId }),
                              });
                              if (res.ok) {
                                const data = await res.json();
                                setCarrier((prev) =>
                                  prev ? { ...prev, dispatchers: data.dispatchers || [] } : prev,
                                );
                              }
                              setDispatcherQuery("");
                              setDispatcherOptions([]);
                            } catch (e) {
                              console.error("Failed to add dispatcher", e);
                              setDispatcherOptions([]);
                            }
                          }}
                        >
                          <div className="font-medium">{d.name}</div>
                          {d.email && (
                            <div className="text-xs text-gray-500 truncate">
                              {d.email}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Dispatcher Contacts</h2>
              <button
                onClick={() => openDispatcherModal()}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                + Add Contact
              </button>
            </div>
            {dispatcherContacts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 font-medium text-gray-600">Name</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-600">Role</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-600">Phone / Mobile</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-600">Email</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-600">Status</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dispatcherContacts.map((d) => (
                      <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-2 font-medium">{d.name}</td>
                        <td className="py-2 px-2 text-gray-600">{d.role || "-"}</td>
                        <td className="py-2 px-2">
                          <div>{d.phone || "-"}</div>
                          {d.mobile && <div className="text-xs text-gray-500">{d.mobile}</div>}
                        </td>
                        <td className="py-2 px-2 text-gray-600">{d.email || "-"}</td>
                        <td className="py-2 px-2">
                          <div className="flex gap-1">
                            {d.isPrimary && (
                              <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                                Primary
                              </span>
                            )}
                            {d.isBackup && (
                              <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">
                                Backup
                              </span>
                            )}
                            {d.preferredContactMethod && (
                              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium capitalize">
                                {d.preferredContactMethod}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right">
                          <button
                            onClick={() => openDispatcherModal(d)}
                            className="text-blue-600 hover:underline text-xs mr-2"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteDispatcher(d.id)}
                            className="text-red-600 hover:underline text-xs"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No dispatcher contacts yet. Add one to track who to call at this carrier.</p>
            )}
          </div>

          {carrier.loads.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-lg mb-4">Load History</h2>
              <div className="space-y-2">
                {carrier.loads.map((load) => (
                  <Link
                    key={load.id}
                    href={`/freight/loads/${load.id}`}
                    className="block rounded-lg border border-gray-100 px-4 py-3 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">
                          {load.reference || `#${load.id}`}
                        </span>
                        <span className="text-gray-500 ml-2">
                          {load.pickupCity}, {load.pickupState} → {load.dropCity},{" "}
                          {load.dropState}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_COLORS[load.status] || "bg-gray-100"
                        }`}
                      >
                        {load.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {new Date(load.pickupDate).toLocaleDateString()}
                      {load.rate && ` | $${load.rate.toLocaleString()}`}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-lg mb-4">Log Contact</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Channel
                </label>
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm"
                  value={contactForm.channel}
                  onChange={(e) =>
                    setContactForm((prev) => ({ ...prev, channel: e.target.value }))
                  }
                >
                  <option value="phone">Phone</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="portal">Portal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm"
                  placeholder="What was discussed?"
                  value={contactForm.subject}
                  onChange={(e) =>
                    setContactForm((prev) => ({ ...prev, subject: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Outcome
                </label>
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm"
                  value={contactForm.outcome}
                  onChange={(e) =>
                    setContactForm((prev) => ({ ...prev, outcome: e.target.value }))
                  }
                >
                  <option value="">Select outcome</option>
                  <option value="interested">Interested</option>
                  <option value="no_response">No Response</option>
                  <option value="declined">Declined</option>
                  <option value="bad_fit">Bad Fit</option>
                  <option value="sent">Message Sent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm"
                  rows={2}
                  value={contactForm.notes}
                  onChange={(e) =>
                    setContactForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                />
              </div>
              <button
                onClick={logContact}
                disabled={loggingContact}
                className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {loggingContact ? "Logging..." : "Log Contact"}
              </button>
            </div>
          </div>

          {carrier.contacts.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-lg mb-4">Contact History</h2>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {carrier.contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="border-l-2 border-gray-200 pl-3 py-1"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium capitalize">{contact.channel}</span>
                      {contact.outcome && (
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                          {contact.outcome}
                        </span>
                      )}
                    </div>
                    {contact.subject && (
                      <div className="text-sm text-gray-600">{contact.subject}</div>
                    )}
                    {contact.load && (
                      <Link
                        href={`/freight/loads/${contact.load.id}`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Load: {contact.load.reference || `#${contact.load.id}`}
                      </Link>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      by {contact.madeBy.name} on{" "}
                      {new Date(contact.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showDispatcherModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-lg w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingDispatcher ? "Edit Dispatcher Contact" : "Add Dispatcher Contact"}
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm"
                    value={dispatcherForm.name}
                    onChange={(e) =>
                      setDispatcherForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm"
                    value={dispatcherForm.role}
                    onChange={(e) =>
                      setDispatcherForm((prev) => ({ ...prev, role: e.target.value }))
                    }
                  >
                    <option value="">Select role</option>
                    <option value="Dispatcher">Dispatcher</option>
                    <option value="Owner">Owner</option>
                    <option value="Owner Operator">Owner Operator</option>
                    <option value="After Hours">After Hours</option>
                    <option value="Safety Manager">Safety Manager</option>
                    <option value="Fleet Manager">Fleet Manager</option>
                    <option value="Accounting">Accounting</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm"
                    value={dispatcherForm.phone}
                    onChange={(e) =>
                      setDispatcherForm((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mobile
                  </label>
                  <input
                    type="tel"
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm"
                    value={dispatcherForm.mobile}
                    onChange={(e) =>
                      setDispatcherForm((prev) => ({ ...prev, mobile: e.target.value }))
                    }
                    placeholder="(555) 987-6543"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm"
                    value={dispatcherForm.email}
                    onChange={(e) =>
                      setDispatcherForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="john@carrier.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Contact
                  </label>
                  <select
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm"
                    value={dispatcherForm.preferredContactMethod}
                    onChange={(e) =>
                      setDispatcherForm((prev) => ({
                        ...prev,
                        preferredContactMethod: e.target.value,
                      }))
                    }
                  >
                    <option value="">None</option>
                    <option value="phone">Phone</option>
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                  </select>
                </div>
                <div className="flex items-center gap-4 pt-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={dispatcherForm.isPrimary}
                      onChange={(e) =>
                        setDispatcherForm((prev) => ({ ...prev, isPrimary: e.target.checked }))
                      }
                      className="rounded"
                    />
                    Primary
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={dispatcherForm.isBackup}
                      onChange={(e) =>
                        setDispatcherForm((prev) => ({ ...prev, isBackup: e.target.checked }))
                      }
                      className="rounded"
                    />
                    Backup
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm"
                  rows={2}
                  value={dispatcherForm.notes}
                  onChange={(e) =>
                    setDispatcherForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Any special notes about this contact..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={closeDispatcherModal}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={saveDispatcher}
                  disabled={savingDispatcher || !dispatcherForm.name.trim()}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  {savingDispatcher ? "Saving..." : editingDispatcher ? "Update Contact" : "Add Contact"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

CarrierDetailPage.title = "Carrier Detail";
