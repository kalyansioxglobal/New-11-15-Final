import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";

type Driver = {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  licenseNumber: string | null;
  licenseExpiry: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  carrier: { id: number; name: string } | null;
  truck: { id: number; unitNumber: string; type: string } | null;
  _count: { dispatchLoads: number; conversations: number };
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const STATUS_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
  AVAILABLE: { label: "Available", bgColor: "bg-green-100", textColor: "text-green-800" },
  ON_LOAD: { label: "On Load", bgColor: "bg-blue-100", textColor: "text-blue-800" },
  OFF_DUTY: { label: "Off Duty", bgColor: "bg-gray-100", textColor: "text-gray-800" },
  INACTIVE: { label: "Inactive", bgColor: "bg-red-100", textColor: "text-red-800" },
};

function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: "all", search: "" });
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    licenseNumber: "",
    licenseExpiry: "",
    notes: "",
  });

  useEffect(() => {
    fetchDrivers();
  }, [filter]);

  async function fetchDrivers(page = 1) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "50",
        ...(filter.status !== "all" && { status: filter.status }),
        ...(filter.search && { search: filter.search }),
      });
      const res = await fetch(`/api/dispatch/drivers?${params}`);
      const data = await res.json();
      setDrivers(data.drivers || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Failed to fetch drivers:", error);
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setForm({ firstName: "", lastName: "", phone: "", email: "", licenseNumber: "", licenseExpiry: "", notes: "" });
    setEditingDriver(null);
    setShowAddModal(true);
  }

  function openEditModal(driver: Driver) {
    setForm({
      firstName: driver.firstName,
      lastName: driver.lastName,
      phone: driver.phone,
      email: driver.email || "",
      licenseNumber: driver.licenseNumber || "",
      licenseExpiry: driver.licenseExpiry ? driver.licenseExpiry.split("T")[0] : "",
      notes: driver.notes || "",
    });
    setEditingDriver(driver);
    setShowAddModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingDriver ? `/api/dispatch/drivers/${editingDriver.id}` : "/api/dispatch/drivers";
      const method = editingDriver ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setShowAddModal(false);
        fetchDrivers();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save driver");
      }
    } catch (error) {
      alert("Failed to save driver");
    } finally {
      setSaving(false);
    }
  }

  async function updateDriverStatus(driverId: number, status: string) {
    try {
      await fetch(`/api/dispatch/drivers/${driverId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchDrivers();
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  }

  return (
    <>
      <Head>
        <title>Drivers | Dispatch Dashboard</title>
      </Head>

      <div className="space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Driver Management</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your fleet drivers</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dispatch/inbox"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Inbox
            </Link>
            <Link
              href="/dispatch/settlements"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Settlements
            </Link>
            <button
              onClick={openAddModal}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Add Driver
            </button>
          </div>
        </header>

        <div className="flex gap-4 flex-wrap">
          <input
            type="text"
            placeholder="Search drivers..."
            value={filter.search}
            onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-64"
          />
          <select
            value={filter.status}
            onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Status</option>
            <option value="AVAILABLE">Available</option>
            <option value="ON_LOAD">On Load</option>
            <option value="OFF_DUTY">Off Duty</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <p className="text-gray-500">Loading drivers...</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Truck</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loads</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {drivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {driver.firstName} {driver.lastName}
                      </div>
                      {driver.carrier && (
                        <div className="text-sm text-gray-500">{driver.carrier.name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{driver.phone}</div>
                      {driver.email && (
                        <div className="text-sm text-gray-500">{driver.email}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {driver.truck ? (
                        <div className="text-sm text-gray-900">
                          {driver.truck.unitNumber} ({driver.truck.type})
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={driver.status}
                        onChange={(e) => updateDriverStatus(driver.id, e.target.value)}
                        className={`px-2 py-1 text-xs font-medium rounded-lg border-0 ${
                          STATUS_CONFIG[driver.status]?.bgColor || "bg-gray-100"
                        } ${STATUS_CONFIG[driver.status]?.textColor || "text-gray-800"}`}
                      >
                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                          <option key={key} value={key}>
                            {config.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {driver._count.dispatchLoads}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEditModal(driver)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {drivers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No drivers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchDrivers(pagination.page - 1)}
              className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchDrivers(pagination.page + 1)}
              className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">
              {editingDriver ? "Edit Driver" : "Add New Driver"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone *
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Number
                  </label>
                  <input
                    type="text"
                    value={form.licenseNumber}
                    onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Expiry
                  </label>
                  <input
                    type="date"
                    value={form.licenseExpiry}
                    onChange={(e) => setForm((f) => ({ ...f, licenseExpiry: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingDriver ? "Save Changes" : "Add Driver"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default DriversPage;
