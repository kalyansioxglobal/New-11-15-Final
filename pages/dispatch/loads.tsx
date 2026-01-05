import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";

type Load = {
  id: number;
  referenceNumber: string;
  status: string;
  pickupCity: string;
  pickupState: string;
  pickupDate: string;
  deliveryCity: string;
  deliveryState: string;
  deliveryDate: string;
  rate: string;
  driverPay: string | null;
  driver: { id: number; firstName: string; lastName: string; phone: string } | null;
  truck: { id: number; unitNumber: string; type: string } | null;
};

const STATUS_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
  PENDING: { label: "Pending", bgColor: "bg-yellow-100", textColor: "text-yellow-800" },
  DISPATCHED: { label: "Dispatched", bgColor: "bg-blue-100", textColor: "text-blue-800" },
  IN_TRANSIT: { label: "In Transit", bgColor: "bg-purple-100", textColor: "text-purple-800" },
  DELIVERED: { label: "Delivered", bgColor: "bg-green-100", textColor: "text-green-800" },
  CANCELLED: { label: "Cancelled", bgColor: "bg-red-100", textColor: "text-red-800" },
};

function LoadsPage() {
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: "all", search: "" });
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    referenceNumber: "",
    pickupCity: "",
    pickupState: "",
    pickupDate: "",
    deliveryCity: "",
    deliveryState: "",
    deliveryDate: "",
    rate: "",
    driverPay: "",
  });

  useEffect(() => {
    fetchLoads();
  }, [filter]);

  async function fetchLoads() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(filter.status !== "all" && { status: filter.status }),
        ...(filter.search && { search: filter.search }),
      });
      const res = await fetch(`/api/dispatch/loads?${params}`);
      const data = await res.json();
      setLoads(data.loads || []);
    } catch (error) {
      console.error("Failed to fetch loads:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/dispatch/loads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          rate: parseFloat(form.rate),
          driverPay: form.driverPay ? parseFloat(form.driverPay) : null,
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setForm({ referenceNumber: "", pickupCity: "", pickupState: "", pickupDate: "", deliveryCity: "", deliveryState: "", deliveryDate: "", rate: "", driverPay: "" });
        fetchLoads();
      }
    } catch (error) {
      alert("Failed to create load");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Head>
        <title>Dispatch Loads | Dispatch Dashboard</title>
      </Head>

      <div className="space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Load Dispatch</h1>
            <p className="text-sm text-gray-500 mt-1">Manage and assign loads to drivers</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dispatch/inbox" className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Inbox</Link>
            <Link href="/dispatch/drivers" className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Drivers</Link>
            <Link href="/dispatch/settlements" className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Settlements</Link>
            <button onClick={() => setShowAddModal(true)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Add Load</button>
          </div>
        </header>

        <div className="flex gap-4 flex-wrap">
          <input type="text" placeholder="Search loads..." value={filter.search} onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))} className="px-4 py-2 border border-gray-300 rounded-lg w-64" />
          <select value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))} className="px-4 py-2 border border-gray-300 rounded-lg">
            <option value="all">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <Skeleton className="w-full h-[85vh]" />
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loads.map((load) => (
                  <tr key={load.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{load.referenceNumber}</td>
                    <td className="px-4 py-3 text-sm">
                      <div>{load.pickupCity}, {load.pickupState}</div>
                      <div className="text-gray-500">to {load.deliveryCity}, {load.deliveryState}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div>{new Date(load.pickupDate).toLocaleDateString()}</div>
                      <div className="text-gray-500">{new Date(load.deliveryDate).toLocaleDateString()}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {load.driver ? `${load.driver.firstName} ${load.driver.lastName}` : <span className="text-gray-400">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">${parseFloat(load.rate).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-lg ${STATUS_CONFIG[load.status]?.bgColor} ${STATUS_CONFIG[load.status]?.textColor}`}>
                        {STATUS_CONFIG[load.status]?.label || load.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {loads.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No loads found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold mb-4">Add New Load</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number *</label>
                <input type="text" value={form.referenceNumber} onChange={(e) => setForm((f) => ({ ...f, referenceNumber: e.target.value }))} required className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pickup City *</label>
                  <input type="text" value={form.pickupCity} onChange={(e) => setForm((f) => ({ ...f, pickupCity: e.target.value }))} required className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                  <input type="text" value={form.pickupState} onChange={(e) => setForm((f) => ({ ...f, pickupState: e.target.value }))} required maxLength={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Date *</label>
                <input type="date" value={form.pickupDate} onChange={(e) => setForm((f) => ({ ...f, pickupDate: e.target.value }))} required className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery City *</label>
                  <input type="text" value={form.deliveryCity} onChange={(e) => setForm((f) => ({ ...f, deliveryCity: e.target.value }))} required className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                  <input type="text" value={form.deliveryState} onChange={(e) => setForm((f) => ({ ...f, deliveryState: e.target.value }))} required maxLength={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date *</label>
                <input type="date" value={form.deliveryDate} onChange={(e) => setForm((f) => ({ ...f, deliveryDate: e.target.value }))} required className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate *</label>
                  <input type="number" step="0.01" value={form.rate} onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))} required className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Driver Pay</label>
                  <input type="number" step="0.01" value={form.driverPay} onChange={(e) => setForm((f) => ({ ...f, driverPay: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? "Saving..." : "Add Load"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default LoadsPage;
