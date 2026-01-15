import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import toast from "react-hot-toast";
import CreateIncidentModal from "@/components/it/incidents/CreateIncidentModal";

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

  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const [assigningIncidents, setAssigningIncidents] = useState<Set<number>>(new Set());
  const [updatingStatus, setUpdatingStatus] = useState<Set<number>>(new Set());
  const [filterLoading, setFilterLoading] = useState(false);
  const isInitialMount = useRef(true);

  const loadIncidents = useCallback(async (pageParam = page, overrides?: {
    statusGroup?: string;
    statusFilter?: string;
    severityFilter?: string;
    meFilter?: "" | "reported" | "assigned";
  }) => {
    const params = new URLSearchParams();
    params.set("page", String(pageParam));
    params.set("pageSize", String(pageSize));

    const group = overrides?.statusGroup !== undefined ? overrides.statusGroup : statusGroup;
    const status = overrides?.statusFilter !== undefined ? overrides.statusFilter : statusFilter;
    const severity = overrides?.severityFilter !== undefined ? overrides.severityFilter : severityFilter;
    const me = overrides?.meFilter !== undefined ? overrides.meFilter : meFilter;

    if (group) params.set("statusGroup", group);
    if (status) params.set("status", status);
    if (severity) params.set("severity", severity);
    if (me) params.set("me", me);

    const res = await fetch(`/api/it-incidents/list?${params.toString()}`);
    if (res.ok) {
      const payload = await res.json();
      setIncidents(payload.items || []);
      setTotal(payload.total || 0);
      setTotalPages(payload.totalPages || 1);
      setPage(payload.page || pageParam);
    }
  }, [page, pageSize, statusGroup, statusFilter, severityFilter, meFilter]);

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
    Promise.all([loadIncidents(1), loadUsers(), loadAssets()]).finally(() => {
      setLoading(false);
      isInitialMount.current = false;
    });
  }, []);

  useEffect(() => {
    if (isInitialMount.current) return;
    setPage(1);
    setFilterLoading(true);
    loadIncidents(1).finally(() => setFilterLoading(false));
  }, [statusFilter, severityFilter, meFilter, statusGroup, loadIncidents]);

  useEffect(() => {
    if (isInitialMount.current) return;
    setFilterLoading(true);
    loadIncidents(page).finally(() => setFilterLoading(false));
  }, [page, loadIncidents]);

  const handleCreateSuccess = async () => {
    // Reset filters that might hide the new incident (new incidents are typically "OPEN")
    // and reload with cleared filters to ensure it appears immediately
    const newStatusGroup = statusGroup === "closed" ? "" : statusGroup;
    const newStatusFilter = statusFilter && statusFilter !== "OPEN" ? "" : statusFilter;

    // Update filter state
    if (newStatusGroup !== statusGroup) {
      setStatusGroup(newStatusGroup);
    }
    if (newStatusFilter !== statusFilter) {
      setStatusFilter(newStatusFilter);
    }

    // Reload with cleared filters to ensure new incident appears
    await loadIncidents(1, {
      statusGroup: newStatusGroup,
      statusFilter: newStatusFilter,
    });
    setPage(1);
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
        toast.success("Incident assigned successfully!");
        loadIncidents(page);
        if (selectedIncident?.id === incidentId) {
          setSelectedIncident(updated);
        }
      } else {
        const error = await res.json().catch(() => ({ error: "Failed to assign incident" }));
        console.error("Assignment error:", error);
        toast.error(error.error || error.detail || "Failed to assign incident");
      }
    } catch (err: any) {
      console.error("Assignment error:", err);
      toast.error(err.message || "Failed to assign incident. Please try again.");
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
        toast.success("Status updated successfully!");
        loadIncidents(page);
        if (selectedIncident?.id === incidentId) {
          setSelectedIncident(updated);
        }
      } else {
        const error = await res.json().catch(() => ({ error: "Failed to update status" }));
        console.error("Status update error:", error);
        toast.error(error.error || error.detail || "Failed to update status");
      }
    } catch (err: any) {
      console.error("Status update error:", err);
      toast.error(err.message || "Failed to update status. Please try again.");
    } finally {
      setUpdatingStatus((prev) => {
        const next = new Set(prev);
        next.delete(incidentId);
        return next;
      });
    }
  };

  // Note: openCounts are calculated from current page only (not total counts)
  const openCounts = useMemo(() => ({
    total: total,
    open: incidents.filter((i) => i.status === "OPEN").length,
    inProgress: incidents.filter((i) => i.status === "IN_PROGRESS").length,
    critical: incidents.filter(
      (i) => i.severity === "CRITICAL" && i.status !== "RESOLVED",
    ).length,
  }), [incidents, total]);

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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">IT Incidents</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Track and manage incidents across IT assets and users.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="btn"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Incident
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{openCounts.total}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400 font-medium mt-1">Total Incidents</div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-800/20 rounded-xl border border-blue-200 dark:border-blue-800 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{openCounts.open}</div>
          <div className="text-sm text-blue-700 dark:text-blue-300 font-medium mt-1">Open</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/30 dark:to-purple-800/20 rounded-xl border border-purple-200 dark:border-purple-800 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {openCounts.inProgress}
          </div>
          <div className="text-sm text-purple-700 dark:text-purple-300 font-medium mt-1">In Progress</div>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/30 dark:to-red-800/20 rounded-xl border border-red-200 dark:border-red-800 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-red-600 dark:text-red-400">{openCounts.critical}</div>
          <div className="text-sm text-red-700 dark:text-red-300 font-medium mt-1">Critical (Unresolved)</div>
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
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${statusGroup === ""
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
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${statusGroup === "open"
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
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${statusGroup === "closed"
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
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${meFilter === ""
                  ? "bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
                  }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setMeFilter("reported")}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${meFilter === "reported"
                  ? "bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
                  }`}
              >
                Reported
              </button>
              <button
                type="button"
                onClick={() => setMeFilter("assigned")}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${meFilter === "assigned"
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
                className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
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
                className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
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

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">ID</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Title</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Asset</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Type</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Severity</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Assigned To</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Created</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {incidents.map((inc) => (
              <tr key={inc.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors">
                <td className="px-4 py-3 font-mono text-gray-500 dark:text-gray-400 text-xs">#{inc.id}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => {
                      setSelectedIncident(inc);
                      setShowDetailModal(true);
                    }}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline text-left text-sm font-semibold transition-colors"
                  >
                    {inc.title}
                  </button>
                </td>
                <td className="px-4 py-3">
                  {inc.assetId ? (
                    <a
                      href={`/it-assets/${inc.assetId}`}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline text-sm font-medium transition-colors"
                    >
                      {inc.asset?.tag || `Asset #${inc.assetId}`}
                    </a>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500 text-sm">No asset</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{inc.category || "-"}</td>
                <td className="px-4 py-3">
                  <Badge variant="severity" value={inc.severity} />
                </td>
                <td className="px-4 py-3">
                  <div className="relative">
                    <Select
                      value={inc.status}
                      onChange={(e) => handleStatusChange(inc.id, e.target.value)}
                      disabled={updatingStatus.has(inc.id) || inc.status === "RESOLVED" || inc.status === "CANCELLED"}
                      className={`w-40 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${updatingStatus.has(inc.id) || inc.status === "RESOLVED" || inc.status === "CANCELLED" ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      title={inc.status === "RESOLVED" || inc.status === "CANCELLED" ? "Cannot change status of resolved or cancelled incidents" : undefined}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace("_", " ")}
                        </option>
                      ))}
                    </Select>
                    {updatingStatus.has(inc.id) && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <svg className="animate-spin h-4 w-4 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                      disabled={assigningIncidents.has(inc.id) || inc.status === "RESOLVED" || inc.status === "CANCELLED"}
                      className={`w-full max-w-[200px] border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all ${assigningIncidents.has(inc.id) || inc.status === "RESOLVED" || inc.status === "CANCELLED"
                        ? "opacity-50 cursor-not-allowed border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-gray-200"
                        : inc.assignedToUserId
                          ? "border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 font-medium"
                          : "border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                        }`}
                      title={inc.status === "RESOLVED" || inc.status === "CANCELLED" ? "Cannot assign user to resolved or cancelled incidents" : undefined}
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
                        <svg className="animate-spin h-4 w-4 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                  {new Date(inc.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedIncident(inc);
                      setShowDetailModal(true);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}

            {!loading && incidents.length === 0 && (
              <tr>
                <td colSpan={9} className="p-12 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                    <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                    No incidents found
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                    Click "New Incident" to create one.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <CreateIncidentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        assets={assets}
        users={users}
        onSuccess={handleCreateSuccess}
      />

      {showDetailModal && selectedIncident && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header Card */}
            <div className=" rounded-t-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 dark:bg-white/10 rounded-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Incident #{selectedIncident.id}</h2>
                    {/* <p className="text-indigo-100 dark:text-indigo-200 text-sm mt-1">{selectedIncident.title}</p> */}
                  </div>
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
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              {/* Main Details Card */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      Asset
                    </label>
                    {selectedIncident.assetId ? (
                      <a
                        href={`/it-assets/${selectedIncident.assetId}`}
                        className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline text-base font-medium transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        {selectedIncident.asset?.tag || `Asset #${selectedIncident.assetId}`}
                      </a>
                    ) : (
                      <p className="text-base text-gray-400 dark:text-gray-500">Not specified</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Reported By
                    </label>
                    <p className="text-base text-gray-900 dark:text-white">
                      {selectedIncident.reporterUser?.fullName || selectedIncident.reporterUser?.name || "Unknown"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Type
                    </label>
                    <p className="text-base text-gray-900 dark:text-white">{selectedIncident.category || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Severity
                    </label>
                    <Badge variant="severity" value={selectedIncident.severity} />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Status
                    </label>
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                      {selectedIncident.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Created
                    </label>
                    <p className="text-base text-gray-900 dark:text-white">
                      {new Date(selectedIncident.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {selectedIncident.status === "RESOLVED" && selectedIncident.resolvedAt && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Resolved At
                    </label>
                    <p className="text-base text-gray-900 dark:text-white">
                      {new Date(selectedIncident.resolvedAt).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Description
                  </h3>
                </div>
                <div className="p-6">
                  <div className="bg-white dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {selectedIncident.description || "No description provided."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Resolution */}
              {selectedIncident.resolution && (
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="bg-gradient-to-r from-green-50 to-green-100/50 dark:from-green-900/30 dark:to-green-800/20 px-6 py-4 border-b border-green-200 dark:border-green-800">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Resolution
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                      <p className="text-sm text-gray-700 dark:text-green-300 whitespace-pre-wrap leading-relaxed">
                        {selectedIncident.resolution}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Assigned To */}
              {selectedIncident.assignedToUser && (
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a2 2 0 11-4 0 2 2 0 014 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      Assigned To
                    </label>
                    <p className="text-base text-gray-900 dark:text-white">
                      {selectedIncident.assignedToUser?.fullName || selectedIncident.assignedToUser?.name || "Unknown"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowDetailModal(false)}
                className="px-5 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
