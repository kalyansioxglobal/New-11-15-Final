import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";

type User = {
  id: number;
  name: string;
  email?: string;
};

type Asset = {
  id: number;
  assetTag: string;
  category?: string;
};

type Incident = {
  id: number;
  assetId: number | null;
  asset: Asset | null;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  category?: string | null;
  resolution?: string | null;
  reporterUserId: number | null;
  reporterUser: User | null;
  assignedToUserId: number | null;
  assignedToUser: User | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};

const INCIDENT_CATEGORIES = ["HARDWARE", "SOFTWARE", "NETWORK", "ACCESS", "OTHER"];
const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_FOR_INFO", "RESOLVED", "CANCELLED"];

export default function IncidentsTab() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [meFilter, setMeFilter] = useState<"" | "reported" | "assigned">("");
  const [statusGroup, setStatusGroup] = useState<"" | "open" | "closed">("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const [formData, setFormData] = useState({
    assetId: "",
    title: "",
    description: "",
    category: "OTHER",
    severity: "LOW",
    assignedToUserId: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string>("");

  const loadIncidents = async () => {
    const params = new URLSearchParams();
    if (statusGroup) params.set("statusGroup", statusGroup);
    if (statusFilter) params.set("status", statusFilter);
    if (severityFilter) params.set("severity", severityFilter);
    if (meFilter) params.set("me", meFilter);
    const query = params.toString() ? `?${params.toString()}` : "";

    const res = await fetch(`/api/it-incidents/list${query}`);
    if (res.ok) {
      const payload = await res.json();
      setIncidents(payload.items || payload || []);
    }
  };

  const loadUsers = async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users || data || []);
    }
  };

  const loadAssets = async () => {
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("pageSize", "100");
    const res = await fetch(`/api/it/assets?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setAssets(data.items || data || []);
    }
  };

  useEffect(() => {
    Promise.all([loadIncidents(), loadUsers(), loadAssets()]).finally(() =>
      setLoading(false),
    );
  }, []);

  useEffect(() => {
    loadIncidents();
  }, [statusFilter, severityFilter, meFilter, statusGroup]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");

    try {
      const res = await fetch("/api/it-incidents/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: Number(formData.assetId),
          title: formData.title,
          description: formData.description,
          category: formData.category,
          severity: formData.severity,
          assignedToUserId: formData.assignedToUserId
            ? Number(formData.assignedToUserId)
            : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create incident");
      }

      setShowCreateModal(false);
      setFormData({
        assetId: "",
        title: "",
        description: "",
        category: "OTHER",
        severity: "LOW",
        assignedToUserId: "",
      });
      loadIncidents();
    } catch (err: any) {
      setFormError(err.message || "Failed to create incident");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssign = async (incidentId: number, userId: string) => {
    const res = await fetch("/api/it-incidents/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: incidentId,
        assignedToId: userId ? Number(userId) : null,
      }),
    });

    if (res.ok) {
      loadIncidents();
      if (selectedIncident?.id === incidentId) {
        const updated = await res.json();
        setSelectedIncident(updated);
      }
    }
  };

  const handleStatusChange = async (incidentId: number, status: string) => {
    const res = await fetch(`/api/it-incidents/${incidentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (res.ok) {
      loadIncidents();
      if (selectedIncident?.id === incidentId) {
        const updated = await res.json();
        setSelectedIncident(updated);
      }
    }
  };

  const openCounts = {
    total: incidents.length,
    open: incidents.filter((i) => i.status === "OPEN").length,
    inProgress: incidents.filter((i) => i.status === "IN_PROGRESS").length,
    critical: incidents.filter(
      (i) => i.severity === "CRITICAL" && i.status !== "RESOLVED",
    ).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Alert variant="info" message="Loading incidents…" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">
            Track and manage incidents across IT assets and users.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            + New Incident
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold">{openCounts.total}</div>
          <div className="text-sm text-gray-500">Total Incidents</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-blue-600">{openCounts.open}</div>
          <div className="text-sm text-gray-500">Open</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-purple-600">
            {openCounts.inProgress}
          </div>
          <div className="text-sm text-gray-500">In Progress</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-red-600">{openCounts.critical}</div>
          <div className="text-sm text-gray-500">Critical (Unresolved)</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="inline-flex items-center gap-2 border rounded-lg px-2 py-1 bg-white text-xs">
          <Button
            type="button"
            size="sm"
            variant={statusGroup === "" ? "primary" : "ghost"}
            className="px-2"
            onClick={() => {
              setStatusGroup("");
              setStatusFilter("");
            }}
          >
            All
          </Button>
          <Button
            type="button"
            size="sm"
            variant={statusGroup === "open" ? "primary" : "ghost"}
            className="px-2"
            onClick={() => {
              setStatusGroup("open");
              setStatusFilter("");
            }}
          >
            Open
          </Button>
          <Button
            type="button"
            size="sm"
            variant={statusGroup === "closed" ? "primary" : "ghost"}
            className="px-2"
            onClick={() => {
              setStatusGroup("closed");
              setStatusFilter("");
            }}
          >
            Closed
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="inline-flex items-center gap-2 border rounded-lg px-2 py-1 bg-white text-xs">
            <Button
              type="button"
              size="sm"
              variant={meFilter === "" ? "primary" : "ghost"}
              className="px-2"
              onClick={() => setMeFilter("")}
            >
              All
            </Button>
            <Button
              type="button"
              size="sm"
              variant={meFilter === "reported" ? "primary" : "ghost"}
              className="px-2"
              onClick={() => setMeFilter("reported")}
            >
              Reported by me
            </Button>
            <Button
              type="button"
              size="sm"
              variant={meFilter === "assigned" ? "primary" : "ghost"}
              className="px-2"
              onClick={() => setMeFilter("assigned")}
            >
              Assigned to me
            </Button>
          </div>
          <Select
            className="w-40"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </Select>
          <Select
            className="w-40"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="">All Severities</option>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-3 text-left font-medium text-gray-600">ID</th>
              <th className="p-3 text-left font-medium text-gray-600">Title</th>
              <th className="p-3 text-left font-medium text-gray-600">Asset</th>
              <th className="p-3 text-left font-medium text-gray-600">Type</th>
              <th className="p-3 text-left font-medium text-gray-600">Severity</th>
              <th className="p-3 text-left font-medium text-gray-600">Status</th>
              <th className="p-3 text-left font-medium text-gray-600">Assigned To</th>
              <th className="p-3 text-left font-medium text-gray-600">Created</th>
              <th className="p-3 text-left font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((inc) => (
              <tr key={inc.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-mono text-gray-500">#{inc.id}</td>
                <td className="p-3">
                  <button
                    onClick={() => {
                      setSelectedIncident(inc);
                      setShowDetailModal(true);
                    }}
                    className="text-indigo-600 hover:underline text-left text-sm font-medium"
                  >
                    {inc.title}
                  </button>
                </td>
                <td className="p-3">
                  {inc.assetId ? (
                    <a
                      href={`/it-assets/${inc.assetId}`}
                      className="text-indigo-600 hover:underline text-sm"
                    >
                      {inc.asset?.assetTag || `Asset #${inc.assetId}`}
                    </a>
                  ) : (
                    <span className="text-gray-400 text-sm">No asset</span>
                  )}
                </td>
                <td className="p-3 text-sm">{inc.category || "-"}</td>
                <td className="p-3">
                  <Badge variant="severity" value={inc.severity} />
                </td>
                <td className="p-3">
                  <Select
                    value={inc.status}
                    onChange={(e) => handleStatusChange(inc.id, e.target.value)}
                    className="w-40 bg-transparent border-0"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="p-3">
                  <Select
                    value={inc.assignedToUserId || ""}
                    onChange={(e) => handleAssign(inc.id, e.target.value)}
                    className="w-full max-w-[180px] text-xs"
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="p-3 text-gray-500 text-xs">
                  {new Date(inc.updatedAt || inc.createdAt).toLocaleDateString()}
                </td>
                <td className="p-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedIncident(inc);
                      setShowDetailModal(true);
                    }}
                  >
                    View
                  </Button>
                </td>
              </tr>
            ))}

            {incidents.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-gray-500 text-sm">
                  No incidents found. Click &quot;New Incident&quot; to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Log New Incident</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-4">
              {formError && (
                <Alert variant="error" message={formError} />
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asset *
                </label>
                <Select
                  required
                  value={formData.assetId}
                  onChange={(e) =>
                    setFormData({ ...formData, assetId: e.target.value })
                  }
                >
                  <option value="">Select an asset</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.assetTag}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Brief description of the issue"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Detailed description of the problem..."
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <Select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                  >
                    {INCIDENT_CATEGORIES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Severity
                  </label>
                  <Select
                    value={formData.severity}
                    onChange={(e) =>
                      setFormData({ ...formData, severity: e.target.value })
                    }
                  >
                    {SEVERITIES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign To
                </label>
                <Select
                  value={formData.assignedToUserId}
                  onChange={(e) =>
                    setFormData({ ...formData, assignedToUserId: e.target.value })
                  }
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? "Creating..." : "Log Incident"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && selectedIncident && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  Incident #{selectedIncident.id}
                </h2>
                <p className="text-sm text-gray-500">{selectedIncident.title}</p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                    Asset
                  </label>
                  <a
                    href={`/it-assets/${selectedIncident.assetId}`}
                    className="text-indigo-600 hover:underline text-sm"
                  >
                    {selectedIncident.asset?.assetTag ||
                      `Asset #${selectedIncident.assetId}`}
                  </a>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                    Reported By
                  </label>
                  <span className="text-sm">
                    {selectedIncident.reporterUser?.name || "Unknown"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                    Type
                  </label>
                  <span className="text-sm">{selectedIncident.category || "-"}</span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                    Severity
                  </label>
                  <Badge variant="severity" value={selectedIncident.severity} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                    Status
                  </label>
                  <span className="text-sm">{selectedIncident.status}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                  Description
                </label>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {selectedIncident.description || "No description provided."}
                </p>
              </div>

              {selectedIncident.resolution && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                    Resolution
                  </label>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedIncident.resolution}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetailModal(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
