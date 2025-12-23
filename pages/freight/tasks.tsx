import { useEffect, useState } from "react";
import Link from "next/link";
import { GetServerSideProps } from "next";
import { useTestMode } from "@/contexts/TestModeContext";

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};

type Task = {
  id: number;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: string;
  completedAt: string | null;
  customer: { id: number; name: string } | null;
  quote: { id: number; status: string } | null;
  load: { id: number; tmsLoadId: string | null; loadStatus: string } | null;
  assignedUser: { id: number; fullName: string } | null;
};

function TasksPage() {
  const { testMode } = useTestMode();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [ventureId, setVentureId] = useState<number | null>(null);
  const [ventures, setVentures] = useState<{ id: number; name: string }[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("OPEN");
  const [typeFilter, setTypeFilter] = useState<string>("");

  useEffect(() => {
    fetch(`/api/ventures?types=LOGISTICS,TRANSPORT&includeTest=${testMode}`)
      .then((r) => r.json())
      .then((data) => {
        setVentures(data);
        if (data.length > 0 && !ventureId) {
          setVentureId(data[0].id);
        }
      })
      .catch(() => {});
  }, [testMode]);

  useEffect(() => {
    if (!ventureId) return;

    async function fetchTasks() {
      try {
        setLoading(true);
        let url = `/api/freight/tasks?ventureId=${ventureId}&mineOnly=true`;
        if (statusFilter) url += `&status=${statusFilter}`;
        if (typeFilter) url += `&type=${typeFilter}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setTasks(data.tasks);
        setTotal(data.total);
      } catch (err: any) {
        setError(err.message ?? "Failed to load tasks");
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
  }, [ventureId, statusFilter, typeFilter]);

  const updateTaskStatus = async (taskId: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/freight/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? updated : t))
      );
    } catch (err: any) {
      alert(err.message || "Failed to update task");
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      LOW: "bg-gray-100 text-gray-600",
      MEDIUM: "bg-blue-100 text-blue-700",
      HIGH: "bg-orange-100 text-orange-700",
      CRITICAL: "bg-red-100 text-red-700",
    };
    return (
      <span className={`px-2 py-1 text-xs rounded ${colors[priority] || "bg-gray-100"}`}>
        {priority}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      OPEN: "bg-yellow-100 text-yellow-700",
      IN_PROGRESS: "bg-blue-100 text-blue-700",
      DONE: "bg-green-100 text-green-700",
      CANCELED: "bg-gray-100 text-gray-500",
    };
    return (
      <span className={`px-2 py-1 text-xs rounded ${colors[status] || "bg-gray-100"}`}>
        {status}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      QUOTE_FOLLOWUP: "Quote Follow-up",
      QUOTE_EXPIRING: "Quote Expiring",
      DORMANT_CUSTOMER_FOLLOWUP: "Dormant Customer",
      CHURN_AT_RISK_FOLLOWUP: "Churn Risk",
      OTHER: "Other",
    };
    return (
      <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
        {labels[type] || type}
      </span>
    );
  };

  const formatDate = (val: string | null) => {
    if (!val) return "-";
    const date = new Date(val);
    const now = new Date();
    const isOverdue = date < now;
    const formatted = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return (
      <span className={isOverdue ? "text-red-600 font-medium" : ""}>
        {formatted}
      </span>
    );
  };

  const getEntityLink = (task: Task) => {
    if (task.customer) {
      return (
        <Link href={`/logistics/customers/${task.customer.id}`} className="text-blue-600 hover:underline text-sm">
          {task.customer.name}
        </Link>
      );
    }
    if (task.quote) {
      return (
        <Link href={`/freight/quotes/${task.quote.id}`} className="text-blue-600 hover:underline text-sm">
          Quote #{task.quote.id}
        </Link>
      );
    }
    if (task.load) {
      return (
        <Link href={`/freight/loads/${task.load.id}`} className="text-blue-600 hover:underline text-sm">
          {task.load.tmsLoadId || `Load #${task.load.id}`}
        </Link>
      );
    }
    return "-";
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-2xl font-semibold">My Tasks</h1>
          <p className="text-gray-600 mt-1">
            Tasks assigned to you for follow-up actions.
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <div>
            <label className="text-sm text-gray-600 mr-2">Venture:</label>
            <select
              value={ventureId ?? ""}
              onChange={(e) => setVentureId(Number(e.target.value))}
              className="border rounded px-2 py-1 text-sm"
            >
              {ventures.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600 mr-2">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="">All</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
              <option value="CANCELED">Canceled</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600 mr-2">Type:</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="">All</option>
              <option value="DORMANT_CUSTOMER_FOLLOWUP">Dormant Customer</option>
              <option value="QUOTE_EXPIRING">Quote Expiring</option>
              <option value="QUOTE_FOLLOWUP">Quote Follow-up</option>
              <option value="CHURN_AT_RISK_FOLLOWUP">Churn Risk</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>
      </div>

      {loading && <div className="text-gray-500">Loading...</div>}
      {error && <div className="text-red-500 mb-2">{error}</div>}

      {!loading && !error && (
        <>
          <div className="mb-4 text-sm text-gray-600">
            Showing {tasks.length} of {total} tasks
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 border text-left">Due</th>
                  <th className="px-3 py-2 border text-left">Priority</th>
                  <th className="px-3 py-2 border text-left">Type</th>
                  <th className="px-3 py-2 border text-left">Title</th>
                  <th className="px-3 py-2 border text-left">Entity</th>
                  <th className="px-3 py-2 border text-left">Status</th>
                  <th className="px-3 py-2 border text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 border">{formatDate(t.dueDate)}</td>
                    <td className="px-3 py-2 border">{getPriorityBadge(t.priority)}</td>
                    <td className="px-3 py-2 border">{getTypeBadge(t.type)}</td>
                    <td className="px-3 py-2 border">
                      <div className="font-medium">{t.title}</div>
                      {t.description && (
                        <div className="text-xs text-gray-500 truncate max-w-xs">
                          {t.description}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 border">{getEntityLink(t)}</td>
                    <td className="px-3 py-2 border">{getStatusBadge(t.status)}</td>
                    <td className="px-3 py-2 border text-center">
                      <div className="flex gap-1 justify-center">
                        {t.status === "OPEN" && (
                          <button
                            onClick={() => updateTaskStatus(t.id, "IN_PROGRESS")}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Start
                          </button>
                        )}
                        {(t.status === "OPEN" || t.status === "IN_PROGRESS") && (
                          <button
                            onClick={() => updateTaskStatus(t.id, "DONE")}
                            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            Done
                          </button>
                        )}
                        {t.status === "OPEN" && (
                          <button
                            onClick={() => updateTaskStatus(t.id, "CANCELED")}
                            className="px-2 py-1 text-xs bg-gray-400 text-white rounded hover:bg-gray-500"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {tasks.length === 0 && (
                  <tr>
                    <td className="px-3 py-4 border text-center text-gray-500" colSpan={7}>
                      No tasks found for the selected criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

TasksPage.title = "My Tasks";

export default TasksPage;
