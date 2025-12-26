import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { canCreateTasks, type UserRole } from "@/lib/permissions";

// TaskRow type (unchanged)
type TaskRow = {
  id: number;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  ventureName: string | null;
  officeName: string | null;
  assignedToName: string | null;
};

function TasksPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtering state
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assignedFilter, setAssignedFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");

  const { effectiveUser } = useEffectiveUser();
  const role = (effectiveUser?.role || "EMPLOYEE") as UserRole;
  const allowCreate = canCreateTasks(role);

  // For Assigned dropdown 
  const assignedOptions = useMemo(() => {
    const names = Array.from(
      new Set(tasks.map((t) => t.assignedToName).filter(Boolean))
    ) as string[];
    return names.sort();
  }, [tasks]);

  // For Priority dropdown
  const priorityOptions = useMemo(() => {
    const priorities = Array.from(
      new Set(tasks.map((t) => t.priority).filter(Boolean))
    ) as string[];
    // Sort by priority order: LOW, MEDIUM, HIGH, URGENT
    const order = ["LOW", "MEDIUM", "HIGH", "URGENT"];
    return priorities.sort((a, b) => {
      const indexA = order.indexOf(a);
      const indexB = order.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [tasks]);

  // For "Status" tab filters
  const statusTabs = ["all", "OPEN", "IN_PROGRESS", "BLOCKED", "DONE"];

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/tasks");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load tasks");
        }
        const json = await res.json();
        if (!cancelled) setTasks(json.tasks || []);
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Failed to load tasks");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Main filtering logic
  const filteredTasks = useMemo(() => {
    let results = tasks;
    // Only filter by status if not "all"
    if (statusFilter !== "all") {
      results = results.filter((t) => t.status === statusFilter);
    }
    // Only filter by assigned name if not "all"
    if (assignedFilter !== "all") {
      results = results.filter((t) => t.assignedToName === assignedFilter);
    }
    // Only filter by priority if not "all"
    if (priorityFilter !== "all") {
      results = results.filter((t) => t.priority === priorityFilter);
    }
    // Only filter by due date if selected
    if (dateFilter) {
      results = results.filter(
        (t) =>
          t.dueDate &&
          new Date(t.dueDate).toISOString().split("T")[0] === dateFilter
      );
    }
    return results;
  }, [tasks, statusFilter, assignedFilter, priorityFilter, dateFilter]);

  const statusColors: Record<string, string> = {
    OPEN: "bg-blue-100 text-blue-800",
    IN_PROGRESS: "bg-yellow-100 text-yellow-800",
    BLOCKED: "bg-red-100 text-red-800",
    DONE: "bg-green-100 text-green-800",
    OVERDUE: "bg-orange-100 text-orange-800",
  };

  const priorityColors: Record<string, string> = {
    LOW: "text-gray-500",
    MEDIUM: "text-yellow-600",
    HIGH: "text-orange-600",
    URGENT: "text-red-600 font-semibold",
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and track your tasks</p>
        </div>
        {allowCreate && (
          <Link
            href="/tasks/new"
            className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            + New Task
          </Link>
        )}
      </div>

      {/* Filter controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Status filter: tab buttons */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600">Status</label>
            <div className="flex gap-2">
              {statusTabs.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                    statusFilter === s
                      ? "bg-gray-900 text-white shadow-sm"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {s === "all" ? "All" : s.replaceAll("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="h-8 w-px bg-gray-300"></div>

          {/* Assigned filter: dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600">Assigned To</label>
            <select
              value={assignedFilter}
              onChange={(e) => setAssignedFilter(e.target.value)}
              className="px-3 py-1.5 rounded-md border border-gray-300 text-sm bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors min-w-[150px]"
            >
              <option value="all">All People</option>
              {assignedOptions.map((name) => (
                <option value={name} key={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority filter: dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-1.5 rounded-md border border-gray-300 text-sm bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors min-w-[120px]"
            >
              <option value="all">All Priorities</option>
              {priorityOptions.map((priority) => (
                <option value={priority} key={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </div>

          {/* Due date filter: date input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600">Due Date</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-1.5 rounded-md border border-gray-300 text-sm bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                max={new Date(8640000000000000).toISOString().slice(0, 10)}
              />
              {dateFilter && (
                <button
                  className="text-xs px-2 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                  onClick={() => setDateFilter("")}
                  type="button"
                  title="Clear date filter"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Clear all filters button */}
          {(statusFilter !== "all" || assignedFilter !== "all" || priorityFilter !== "all" || dateFilter) && (
            <div className="flex items-end">
              <button
                className="text-xs px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors font-medium"
                onClick={() => {
                  setStatusFilter("all");
                  setAssignedFilter("all");
                  setPriorityFilter("all");
                  setDateFilter("");
                }}
                type="button"
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="text-sm text-gray-400">Loading tasks...</div>
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200">
          <div className="text-sm text-red-600">{error}</div>
        </div>
      )}

      {!loading && filteredTasks.length === 0 && (
        <div className="text-center py-12 border border-gray-200 rounded-xl bg-gray-50">
          <div className="text-gray-400 text-3xl mb-3">✅</div>
          <h3 className="text-gray-700 font-medium mb-1">No tasks found</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            {statusFilter === "all" && assignedFilter === "all" && priorityFilter === "all" && !dateFilter
              ? "No tasks have been created yet for your assigned ventures."
              : "No tasks match the selected filter(s)."}
          </p>
          {allowCreate && statusFilter === "all" && assignedFilter === "all" && priorityFilter === "all" && !dateFilter && (
            <Link
              href="/tasks/new"
              className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              + New Task
            </Link>
          )}
        </div>
      )}

      {/* Table section */}
      {!loading && filteredTasks.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Title</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Venture</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Office</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Priority</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Due Date</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Assigned</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTasks.map((t) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const dueDate = t.dueDate ? new Date(t.dueDate) : null;
                  if (dueDate) {
                    dueDate.setHours(0, 0, 0, 0);
                  }
                  const isOverdue = t.status === "OPEN" && dueDate && dueDate < today;
                  return (
                  <tr
                    key={t.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      isOverdue ? "bg-red-50/30 border-l-2 border-l-red-500" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{t.title}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {t.ventureName ?? <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {t.officeName ?? <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-md text-xs font-medium ${
                          statusColors[t.status] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {t.status ? t.status.replaceAll("_", " ") : "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-xs font-medium ${
                          priorityColors[t.priority] || "text-gray-600"
                        }`}
                      >
                        {t.priority || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 text-xs">
                      {t.dueDate ? (
                        <div className="flex items-center justify-center gap-1.5">
                          {isOverdue && (
                            <svg
                              className="w-4 h-4 text-red-500 flex-shrink-0"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                              xmlns="http://www.w3.org/2000/svg"
                              aria-label="Warning: Overdue task"
                            >
                              <path
                                fillRule="evenodd"
                                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                          <span className={isOverdue ? "text-red-400 font-medium" : ""}>
                            {new Date(t.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 text-xs">
                      {t.assignedToName || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/tasks/${t.id}`}
                        className="inline-block px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredTasks.length > 0 && (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
              Showing {filteredTasks.length} of {tasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

TasksPage.title = "Tasks";

export default TasksPage;
