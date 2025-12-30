import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
// import { Alert } from "@/components/ui/Alert";
import { Skeleton } from "@/components/ui/Skeleton";

type User = {
  id: number;
  name?: string; // Legacy field, may not always be present
  fullName: string | null; // API returns fullName from database
  email?: string;
};

type Asset = {
  id: number;
  tag: string;
  type?: string;
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
  const [searchQuery, setSearchQuery] = useState<string>("");

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
  const [assigningIncidents, setAssigningIncidents] = useState<Set<number>>(new Set());
  const [updatingStatus, setUpdatingStatus] = useState<Set<number>>(new Set());

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
    const res = await fetch(`/api/it-assets/list?${params.toString()}`);
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
    setAssigningIncidents((prev) => new Set(prev).add(incidentId));
    try {
      const res = await fetch("/api/it-incidents/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: incidentId,
          assignedToId: userId ? Number(userId) : null,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        loadIncidents();
        if (selectedIncident?.id === incidentId) {
          setSelectedIncident(updated);
        }
      } else {
        const error = await res.json().catch(() => ({ error: "Failed to assign incident" }));
        console.error("Assignment error:", error);
        alert(error.error || "Failed to assign incident");
      }
    } catch (err) {
      console.error("Assignment error:", err);
      alert("Failed to assign incident. Please try again.");
    } finally {
      setAssigningIncidents((prev) => {
        const next = new Set(prev);
        next.delete(incidentId);
        return next;
      });
    }
  };

  const handleStatusChange = async (incidentId: number, status: string) => {
    setUpdatingStatus((prev) => new Set(prev).add(incidentId));
    try {
      const res = await fetch(`/api/it-incidents/${incidentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        const updated = await res.json();
        loadIncidents();
        if (selectedIncident?.id === incidentId) {
          setSelectedIncident(updated);
        }
      } else {
        const error = await res.json().catch(() => ({ error: "Failed to update status" }));
        console.error("Status update error:", error);
        alert(error.error || "Failed to update status");
      }
    } catch (err) {
      console.error("Status update error:", err);
      alert("Failed to update status. Please try again.");
    } finally {
      setUpdatingStatus((prev) => {
        const next = new Set(prev);
        next.delete(incidentId);
        return next;
      });
    }
  };

  // Filter incidents based on search query
  const filteredIncidents = incidents.filter((inc) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      inc.title.toLowerCase().includes(query) ||
      inc.asset?.tag?.toLowerCase().includes(query) ||
      inc.assetId?.toString().includes(query)
    );
  });

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
        {/* <Alert variant="info" message="Loading incidents…" /> */}
        <Skeleton className="w-full h-[80vh]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">IT Incidents</h2>
          <p className="text-sm text-gray-500">
            Track and manage incidents across IT assets and users.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Incident
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-gray-900">{openCounts.total}</div>
          <div className="text-sm text-gray-600 font-medium mt-1">Total Incidents</div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl border border-blue-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-blue-600">{openCounts.open}</div>
          <div className="text-sm text-blue-700 font-medium mt-1">Open</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl border border-purple-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-purple-600">
            {openCounts.inProgress}
          </div>
          <div className="text-sm text-purple-700 font-medium mt-1">In Progress</div>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-xl border border-red-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-red-600">{openCounts.critical}</div>
          <div className="text-sm text-red-700 font-medium mt-1">Critical (Unresolved)</div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Row 1, Col 1: Search bar */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-2 uppercase tracking-wide">
              Search
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by title or asset"
                className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                  }}
                  className="inline-flex items-center px-3 py-2 bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-600 dark:text-slate-300 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                  title="Clear search"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Row 1, Col 2: Status Group Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-2 uppercase tracking-wide">
              Status Group
            </label>
            <div className="inline-flex items-center gap-1 bg-gray-100 dark:bg-slate-700 p-1 rounded-lg w-full">
              <button
                type="button"
                onClick={() => {
                  setStatusGroup("");
                  setStatusFilter("");
                }}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  statusGroup === ""
                    ? "bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusGroup("open");
                  setStatusFilter("");
                }}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  statusGroup === "open"
                    ? "bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
                }`}
              >
                Open
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusGroup("closed");
                  setStatusFilter("");
                }}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  statusGroup === "closed"
                    ? "bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
                }`}
              >
                Closed
              </button>
            </div>
          </div>

          {/* Row 2, Col 1: My Incidents Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-2 uppercase tracking-wide">
              My Incidents
            </label>
            <div className="inline-flex items-center gap-1 bg-gray-100 dark:bg-slate-700 p-1 rounded-lg w-full">
              <button
                type="button"
                onClick={() => setMeFilter("")}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${
                  meFilter === ""
                    ? "bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setMeFilter("reported")}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${
                  meFilter === "reported"
                    ? "bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
                }`}
              >
                Reported
              </button>
              <button
                type="button"
                onClick={() => setMeFilter("assigned")}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${
                  meFilter === "assigned"
                    ? "bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
                }`}
              >
                Assigned
              </button>
            </div>
          </div>

          {/* Row 2, Col 2: Status and Severity Filters */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-2 uppercase tracking-wide">
                Status
              </label>
              <Select
                className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
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
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-2 uppercase tracking-wide">
                Severity
              </label>
              <Select
                className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
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
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">ID</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Title</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Asset</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Severity</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Assigned To</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Created</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredIncidents.map((inc) => (
              <tr key={inc.id} className="hover:bg-blue-50/50 transition-colors">
                <td className="px-4 py-3 font-mono text-gray-500 text-xs">#{inc.id}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => {
                      setSelectedIncident(inc);
                      setShowDetailModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-700 hover:underline text-left text-sm font-semibold"
                  >
                    {inc.title}
                  </button>
                </td>
                <td className="px-4 py-3">
                  {inc.assetId ? (
                    <a
                      href={`/it-assets/${inc.assetId}`}
                      className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium"
                    >
                      {inc.asset?.tag || `Asset #${inc.assetId}`}
                    </a>
                  ) : (
                    <span className="text-gray-400 text-sm">No asset</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{inc.category || "-"}</td>
                <td className="px-4 py-3">
                  <Badge variant="severity" value={inc.severity} />
                </td>
                <td className="px-4 py-3">
                  <div className="relative">
                    <Select
                      value={inc.status}
                      onChange={(e) => handleStatusChange(inc.id, e.target.value)}
                      disabled={updatingStatus.has(inc.id)}
                      className={`w-40 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 ${
                        updatingStatus.has(inc.id) ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace("_", " ")}
                        </option>
                      ))}
                    </Select>
                    {updatingStatus.has(inc.id) && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="relative">
                    <Select
                      value={inc.assignedToUserId || ""}
                      onChange={(e) => handleAssign(inc.id, e.target.value)}
                      disabled={assigningIncidents.has(inc.id)}
                      className={`w-full max-w-[200px] border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                        assigningIncidents.has(inc.id)
                          ? "opacity-50 cursor-not-allowed border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800"
                          : inc.assignedToUserId
                          ? "border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 font-medium"
                          : "border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                      }`}
                    >
                      <option value="">Unassigned</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </Select>
                    {assigningIncidents.has(inc.id) && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    )}
                    {!assigningIncidents.has(inc.id) && inc.assignedToUserId && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {new Date(inc.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedIncident(inc);
                      setShowDetailModal(true);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}

            {filteredIncidents.length === 0 && (
              <tr>
                <td colSpan={9} className="p-12 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm font-medium">
                    {searchQuery.trim() ? "No incidents match your search" : "No incidents found"}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    {searchQuery.trim() 
                      ? "Try adjusting your search terms or filters." 
                      : 'Click "New Incident" to create one.'}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
            <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl flex items-center justify-between">
              <h2 className="text-xl font-bold">Log New Incident</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-5">
              {formError && (
                <div className="p-4 rounded-xl bg-red-50 border-l-4 border-red-500 text-red-700 text-sm flex items-start gap-3">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Asset Name<span className="text-red-500">*</span>
                </label>
                <Select
                  required
                  value={formData.assetId}
                  onChange={(e) =>
                    setFormData({ ...formData, assetId: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select an asset</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.tag}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Brief description of the issue"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Detailed description of the problem..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Category
                  </label>
                  <Select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {INCIDENT_CATEGORIES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Severity
                  </label>
                  <Select
                    value={formData.severity}
                    onChange={(e) =>
                      setFormData({ ...formData, severity: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Assign To
                </label>
                <Select
                  value={formData.assignedToUserId}
                  onChange={(e) =>
                    setFormData({ ...formData, assignedToUserId: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  size="sm" 
                  disabled={submitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Log Incident
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && selectedIncident && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
            <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  Incident #{selectedIncident.id}
                </h2>
                <p className="text-sm text-blue-100 mt-1">{selectedIncident.title}</p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Asset
                  </label>
                  {selectedIncident.assetId ? (
                    <a
                      href={`/it-assets/${selectedIncident.assetId}`}
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      {selectedIncident.asset?.tag ||
                        `Asset #${selectedIncident.assetId}`}
                    </a>
                  ) : (
                    <span className="text-gray-400 text-sm">No asset</span>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Reported By
                  </label>
                  <span className="text-sm text-gray-900">
                    {selectedIncident.reporterUser?.fullName || selectedIncident.reporterUser?.name || "Unknown"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Type
                  </label>
                  <span className="text-sm text-gray-600">{selectedIncident.category || "-"}</span>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Severity
                  </label>
                  <Badge variant="severity" value={selectedIncident.severity} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Status
                  </label>
                  <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                    {selectedIncident.status.replace("_", " ")}
                  </span>
                </div>
                {selectedIncident.status === "RESOLVED" && selectedIncident.resolvedAt && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Resolved At
                    </label>
                    <span className="text-sm text-gray-600">
                      {new Date(selectedIncident.resolvedAt).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                        timeZoneName: 'short'
                      })}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedIncident.description || "No description provided."}
                  </p>
                </div>
              </div>

              {selectedIncident.resolution && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Resolution
                  </label>
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {selectedIncident.resolution}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetailModal(false)}
                  className="px-5 py-2.5"
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
