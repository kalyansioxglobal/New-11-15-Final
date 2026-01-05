import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";

type Truck = {
  id: number;
  unitNumber: string;
  type: string;
  make: string | null;
  model: string | null;
  year: number | null;
  vin: string | null;
  plateNumber: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  driver: { id: number; firstName: string; lastName: string; phone: string } | null;
  venture: { id: number; name: string } | null;
  _count: { dispatchLoads: number };
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const STATUS_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
  AVAILABLE: { label: "Available", bgColor: "bg-green-100", textColor: "text-green-800" },
  IN_USE: { label: "In Use", bgColor: "bg-blue-100", textColor: "text-blue-800" },
  MAINTENANCE: { label: "Maintenance", bgColor: "bg-yellow-100", textColor: "text-yellow-800" },
  OUT_OF_SERVICE: { label: "Out of Service", bgColor: "bg-red-100", textColor: "text-red-800" },
};

const TRUCK_TYPES = ["DRY_VAN", "REEFER", "FLATBED", "STEP_DECK", "BOX_TRUCK", "SPRINTER", "OTHER"];

function TrucksPage() {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: "all", search: "" });
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTruck, setEditingTruck] = useState<Truck | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    unitNumber: "",
    type: "DRY_VAN",
    make: "",
    model: "",
    year: "",
    vin: "",
    plateNumber: "",
    notes: "",
  });

  useEffect(() => {
    fetchTrucks();
  }, [filter]);

  async function fetchTrucks(page = 1) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "50",
        ...(filter.status !== "all" && { status: filter.status }),
        ...(filter.search && { search: filter.search }),
      });
      const res = await fetch(`/api/dispatch/trucks?${params}`);
      const data = await res.json();
      setTrucks(data.trucks || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Failed to fetch trucks:", error);
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setForm({ unitNumber: "", type: "DRY_VAN", make: "", model: "", year: "", vin: "", plateNumber: "", notes: "" });
    setEditingTruck(null);
    setShowAddModal(true);
  }

  function openEditModal(truck: Truck) {
    setForm({
      unitNumber: truck.unitNumber,
      type: truck.type,
      make: truck.make || "",
      model: truck.model || "",
      year: truck.year ? String(truck.year) : "",
      vin: truck.vin || "",
      plateNumber: truck.plateNumber || "",
      notes: truck.notes || "",
    });
    setEditingTruck(truck);
    setShowAddModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingTruck ? `/api/dispatch/trucks/${editingTruck.id}` : "/api/dispatch/trucks";
      const method = editingTruck ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          ventureId: 1,
          year: form.year ? parseInt(form.year) : null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || "Failed to save truck");
        return;
      }

      setShowAddModal(false);
      fetchTrucks();
    } catch (error) {
      console.error("Failed to save truck:", error);
      alert("Failed to save truck");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(truck: Truck) {
    if (!confirm(`Are you sure you want to delete truck ${truck.unitNumber}?`)) return;

    try {
      const res = await fetch(`/api/dispatch/trucks/${truck.id}`, { method: "DELETE" });
      if (!res.ok) {
        const error = await res.json();
        alert(error.error || "Failed to delete truck");
        return;
      }
      fetchTrucks();
    } catch (error) {
      console.error("Failed to delete truck:", error);
      alert("Failed to delete truck");
    }
  }

  return (
    <>
      <Head>
        <title>Trucks | Dispatch</title>
      </Head>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Trucks</h1>
            <p className="text-gray-600">Manage your fleet vehicles</p>
          </div>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            + Add Truck
          </button>
        </div>

        <div className="mb-4 flex gap-4">
          <input
            type="text"
            placeholder="Search trucks..."
            value={filter.search}
            onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg w-64"
          />
          <select
            value={filter.status}
            onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {loading ? (
      <Skeleton className="w-full h-[85vh]" />  
      ) : trucks.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No trucks found</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Make/Model</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loads</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trucks.map((truck) => {
                  const statusConfig = STATUS_CONFIG[truck.status] || { label: truck.status, bgColor: "bg-gray-100", textColor: "text-gray-800" };
                  return (
                    <tr key={truck.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium">{truck.unitNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{truck.type.replace(/_/g, " ")}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {truck.make || truck.model ? `${truck.make || ""} ${truck.model || ""}`.trim() : "-"}
                        {truck.year && <span className="text-gray-500 ml-1">({truck.year})</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {truck.driver ? `${truck.driver.firstName} ${truck.driver.lastName}` : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{truck._count.dispatchLoads}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button onClick={() => openEditModal(truck)} className="text-blue-600 hover:text-blue-800 mr-3">Edit</button>
                        <button onClick={() => handleDelete(truck)} className="text-red-600 hover:text-red-800">Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => fetchTrucks(page)}
                className={`px-3 py-1 rounded ${page === pagination.page ? "bg-blue-600 text-white" : "bg-gray-200"}`}
              >
                {page}
              </button>
            ))}
          </div>
        )}

        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">{editingTruck ? "Edit Truck" : "Add Truck"}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Unit Number *</label>
                  <input
                    type="text"
                    value={form.unitNumber}
                    onChange={(e) => setForm((f) => ({ ...f, unitNumber: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Type *</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    {TRUCK_TYPES.map((t) => (
                      <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Make</label>
                    <input
                      type="text"
                      value={form.make}
                      onChange={(e) => setForm((f) => ({ ...f, make: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Model</label>
                    <input
                      type="text"
                      value={form.model}
                      onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Year</label>
                    <input
                      type="number"
                      value={form.year}
                      onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                      min="1990"
                      max="2030"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Plate Number</label>
                    <input
                      type="text"
                      value={form.plateNumber}
                      onChange={(e) => setForm((f) => ({ ...f, plateNumber: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">VIN</label>
                  <input
                    type="text"
                    value={form.vin}
                    onChange={(e) => setForm((f) => ({ ...f, vin: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : editingTruck ? "Save Changes" : "Add Truck"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default TrucksPage;
