import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";

type Settlement = {
  id: number;
  driverId: number | null;
  carrierId: number | null;
  amount: string;
  type: string;
  description: string | null;
  status: string;
  paidAt: string | null;
  createdAt: string;
  dispatchLoad: {
    id: number;
    referenceNumber: string;
    pickupCity: string;
    pickupState: string;
    deliveryCity: string;
    deliveryState: string;
  } | null;
  driver: { id: number; firstName: string; lastName: string } | null;
};

type Driver = {
  id: number;
  firstName: string;
  lastName: string;
};

type DispatchLoad = {
  id: number;
  referenceNumber: string;
  driverPay: string | null;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const STATUS_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
  PENDING: { label: "Pending", bgColor: "bg-yellow-100", textColor: "text-yellow-800" },
  APPROVED: { label: "Approved", bgColor: "bg-blue-100", textColor: "text-blue-800" },
  PAID: { label: "Paid", bgColor: "bg-green-100", textColor: "text-green-800" },
};

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  LOAD_PAY: { label: "Load Pay", color: "text-green-600" },
  BONUS: { label: "Bonus", color: "text-blue-600" },
  DEDUCTION: { label: "Deduction", color: "text-red-600" },
  ADVANCE: { label: "Advance", color: "text-orange-600" },
  FUEL: { label: "Fuel", color: "text-purple-600" },
};

function SettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: "all", type: "all" });
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loads, setLoads] = useState<DispatchLoad[]>([]);
  const [form, setForm] = useState({
    driverId: "",
    dispatchLoadId: "",
    amount: "",
    type: "LOAD_PAY",
    description: "",
  });

  useEffect(() => {
    fetchSettlements();
  }, [filter]);

  useEffect(() => {
    if (showAddModal) {
      fetchDriversAndLoads();
    }
  }, [showAddModal]);

  async function fetchSettlements(page = 1) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "50",
        ...(filter.status !== "all" && { status: filter.status }),
        ...(filter.type !== "all" && { type: filter.type }),
      });
      const res = await fetch(`/api/dispatch/settlements?${params}`);
      const data = await res.json();
      setSettlements(data.settlements || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Failed to fetch settlements:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchDriversAndLoads() {
    try {
      const [driversRes, loadsRes] = await Promise.all([
        fetch("/api/dispatch/drivers?limit=100"),
        fetch("/api/dispatch/loads?status=DELIVERED"),
      ]);
      const driversData = await driversRes.json();
      const loadsData = await loadsRes.json();
      setDrivers(driversData.drivers || []);
      setLoads(loadsData.loads || []);
    } catch (error) {
      console.error("Failed to fetch drivers/loads:", error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/dispatch/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: form.driverId ? parseInt(form.driverId) : null,
          dispatchLoadId: form.dispatchLoadId ? parseInt(form.dispatchLoadId) : null,
          amount: parseFloat(form.amount),
          type: form.type,
          description: form.description || null,
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setForm({ driverId: "", dispatchLoadId: "", amount: "", type: "LOAD_PAY", description: "" });
        fetchSettlements();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create settlement");
      }
    } catch (error) {
      alert("Failed to create settlement");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(settlementId: number, status: string) {
    try {
      await fetch(`/api/dispatch/settlements/${settlementId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchSettlements();
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  }

  const totalPending = settlements
    .filter((s) => s.status === "PENDING")
    .reduce((sum, s) => sum + parseFloat(s.amount), 0);
  const totalApproved = settlements
    .filter((s) => s.status === "APPROVED")
    .reduce((sum, s) => sum + parseFloat(s.amount), 0);
  const totalPaid = settlements
    .filter((s) => s.status === "PAID")
    .reduce((sum, s) => sum + parseFloat(s.amount), 0);

  return (
    <>
      <Head>
        <title>Settlements | Dispatch Dashboard</title>
      </Head>

      <div className="space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settlement Tracking</h1>
            <p className="text-sm text-gray-500 mt-1">Manage driver payments and deductions</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dispatch/inbox" className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Inbox</Link>
            <Link href="/dispatch/drivers" className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Drivers</Link>
            <Link href="/dispatch/loads" className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Loads</Link>
            <button onClick={() => setShowAddModal(true)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Add Settlement</button>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-sm text-yellow-600 font-medium">Pending</p>
            <p className="text-2xl font-bold text-yellow-900">${totalPending.toLocaleString()}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-600 font-medium">Approved</p>
            <p className="text-2xl font-bold text-blue-900">${totalApproved.toLocaleString()}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-sm text-green-600 font-medium">Paid</p>
            <p className="text-2xl font-bold text-green-900">${totalPaid.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex gap-4 flex-wrap">
          <select
            value={filter.status}
            onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
          <select
            value={filter.type}
            onChange={(e) => setFilter((f) => ({ ...f, type: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Types</option>
            {Object.entries(TYPE_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <p className="text-gray-500">Loading settlements...</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Load</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {settlements.map((settlement) => (
                  <tr key={settlement.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(settlement.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {settlement.driver ? (
                        <span className="font-medium text-gray-900">
                          {settlement.driver.firstName} {settlement.driver.lastName}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {settlement.dispatchLoad ? (
                        <div>
                          <div className="font-medium text-gray-900">{settlement.dispatchLoad.referenceNumber}</div>
                          <div className="text-gray-500 text-xs">
                            {settlement.dispatchLoad.pickupCity}, {settlement.dispatchLoad.pickupState} → {settlement.dispatchLoad.deliveryCity}, {settlement.dispatchLoad.deliveryState}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${TYPE_CONFIG[settlement.type]?.color || "text-gray-600"}`}>
                        {TYPE_CONFIG[settlement.type]?.label || settlement.type}
                      </span>
                      {settlement.description && (
                        <div className="text-xs text-gray-500">{settlement.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-bold ${settlement.type === "DEDUCTION" ? "text-red-600" : "text-gray-900"}`}>
                        {settlement.type === "DEDUCTION" ? "-" : ""}${parseFloat(settlement.amount).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-lg ${STATUS_CONFIG[settlement.status]?.bgColor} ${STATUS_CONFIG[settlement.status]?.textColor}`}>
                        {STATUS_CONFIG[settlement.status]?.label || settlement.status}
                      </span>
                      {settlement.paidAt && (
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(settlement.paidAt).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {settlement.status === "PENDING" && (
                        <button
                          onClick={() => updateStatus(settlement.id, "APPROVED")}
                          className="text-sm text-blue-600 hover:text-blue-800 mr-2"
                        >
                          Approve
                        </button>
                      )}
                      {settlement.status === "APPROVED" && (
                        <button
                          onClick={() => updateStatus(settlement.id, "PAID")}
                          className="text-sm text-green-600 hover:text-green-800"
                        >
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {settlements.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No settlements found
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
              onClick={() => fetchSettlements(pagination.page - 1)}
              className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchSettlements(pagination.page + 1)}
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
            <h2 className="text-lg font-semibold mb-4">Add Settlement</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driver</label>
                <select
                  value={form.driverId}
                  onChange={(e) => setForm((f) => ({ ...f, driverId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select driver (optional)</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.firstName} {driver.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Load</label>
                <select
                  value={form.dispatchLoadId}
                  onChange={(e) => {
                    const loadId = e.target.value;
                    setForm((f) => ({ ...f, dispatchLoadId: loadId }));
                    if (loadId && form.type === "LOAD_PAY") {
                      const selectedLoad = loads.find((l) => l.id === parseInt(loadId));
                      if (selectedLoad?.driverPay) {
                        setForm((f) => ({ ...f, dispatchLoadId: loadId, amount: selectedLoad.driverPay || "" }));
                      }
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select load (optional)</option>
                  {loads.map((load) => (
                    <option key={load.id} value={load.id}>
                      {load.referenceNumber}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional notes"
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
                  {saving ? "Saving..." : "Add Settlement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default SettlementsPage;
