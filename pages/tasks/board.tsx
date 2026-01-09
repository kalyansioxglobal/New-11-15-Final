import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { canCreateTasks } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";
import { GetServerSideProps } from "next";
import { Skeleton } from "@/components/ui/Skeleton";

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};

type Task = {
  id: number;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  venture: { id: number; name: string } | null;
  office: { id: number; name: string } | null;
  assignee: { id: number; name: string } | null;
};

type Venture = { id: number; name: string };
type Office = { id: number; name: string; ventureId: number };

const STATUS_COLUMNS = ["OPEN", "IN_PROGRESS", "BLOCKED", "DONE"] as const;

export default function TaskBoardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ventures, setVentures] = useState<Venture[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<{
    ventureId?: string;
    officeId?: string;
  }>({});

  const { effectiveUser } = useEffectiveUser();
  const role = (effectiveUser?.role || "EMPLOYEE") as UserRole;
  const allowCreate = canCreateTasks(role);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (filters.ventureId) params.set("ventureId", filters.ventureId);
        if (filters.officeId) params.set("officeId", filters.officeId);

        const res = await fetch(`/api/tasks/board?${params.toString()}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load tasks");
        }

        const json = await res.json();
        if (!cancelled) {
          setTasks(json.tasks);
          setVentures(json.ventures);
          setOffices(json.offices);
        }
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
  }, [filters]);

  const grouped = useMemo(() => {
    const base: Record<string, Task[]> = {
      OPEN: [],
      IN_PROGRESS: [],
      BLOCKED: [],
      DONE: [],
    };

    tasks.forEach((t) => {
      const key = t.status as keyof typeof base;
      if (base[key]) {
        base[key].push(t);
      } else {
        base.OPEN.push(t);
      }
    });

    return base;
  }, [tasks]);

  const onFilterChange = (field: "ventureId" | "officeId", value: string) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value || undefined,
    }));
  };

  const filteredOffices = filters.ventureId
    ? offices.filter((o) => o.ventureId === parseInt(filters.ventureId!, 10))
    : offices;

  async function updateTaskStatus(taskId: number, newStatus: string) {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
    } catch (e: any) {
      alert(e.message || "Failed to update task status");
    }
  }

  return (
    <div className="p-6 space-y-4 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Tasks Board</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Kanban view across ventures and offices
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/tasks"
            className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            List View
          </Link>
          {allowCreate && (
            <Link
              href="/tasks/new"
              className="btn px-3 py-1.5 text-sm"
            >
              + New Task
            </Link>
          )}
        </div>
      </div>

      <div className="flex gap-3 text-sm items-center">
        <span className="text-gray-500 dark:text-gray-400">Filters:</span>
        <select
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
          value={filters.ventureId || ""}
          onChange={(e) => {
            onFilterChange("ventureId", e.target.value);
            if (!e.target.value) onFilterChange("officeId", "");
          }}
        >
          <option value="">All ventures</option>
          {ventures.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>

        <select
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
          value={filters.officeId || ""}
          onChange={(e) => onFilterChange("officeId", e.target.value)}
        >
          <option value="">All offices</option>
          {filteredOffices.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        // <div className="text-sm text-gray-400">Loading tasks...</div>
        <Skeleton className="w-full h-[85vh]" />
      )}
      {error && <div className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</div>}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATUS_COLUMNS.map((status) => (
            <TaskColumn
              key={status}
              title={status.replace("_", " ")}
              status={status}
              tasks={grouped[status] || []}
              onStatusChange={updateTaskStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskColumn({
  title,
  status,
  tasks,
  onStatusChange,
}: {
  title: string;
  status: string;
  tasks: Task[];
  onStatusChange: (taskId: number, newStatus: string) => void;
}) {
  const statusColors: Record<string, string> = {
    OPEN: "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20",
    IN_PROGRESS: "border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20",
    BLOCKED: "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20",
    DONE: "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20",
  };

  return (
    <div
      className={`rounded-xl border-2 ${statusColors[status] || "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"} p-3 flex flex-col max-h-[70vh]`}
    >
      <div className="flex justify-between items-center mb-3 px-1">
        <div className="font-semibold text-sm text-gray-900 dark:text-white">{title}</div>
        <div className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">
          {tasks.length}
        </div>
      </div>

      <div className="space-y-2 overflow-y-auto flex-1">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onStatusChange={onStatusChange} />
        ))}
        {tasks.length === 0 && (
          <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
            No tasks in this column
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCard({
  task,
  onStatusChange,
}: {
  task: Task;
  onStatusChange: (taskId: number, newStatus: string) => void;
}) {
  const due =
    task.dueDate && new Date(task.dueDate).toLocaleDateString("en-US");

  const isOverdue =
    task.dueDate &&
    task.status !== "DONE" &&
    new Date(task.dueDate) < new Date();

  const priorityColors: Record<string, string> = {
    LOW: "text-gray-500 dark:text-gray-400",
    MEDIUM: "text-yellow-600 dark:text-yellow-400",
    HIGH: "text-orange-600 dark:text-orange-400",
    CRITICAL: "text-red-600 dark:text-red-400 font-bold",
  };

  const nextStatus: Record<string, string> = {
    OPEN: "IN_PROGRESS",
    IN_PROGRESS: "DONE",
    BLOCKED: "IN_PROGRESS",
    DONE: "OPEN",
    OVERDUE: "IN_PROGRESS",
  };

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs shadow-sm dark:shadow-gray-900/50 hover:shadow-md dark:hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start gap-2 mb-1">
        <Link
          href={`/tasks/${task.id}`}
          className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 line-clamp-2 transition-colors"
        >
          {task.title}
        </Link>
        <span className={`shrink-0 ${priorityColors[task.priority] || "text-gray-600 dark:text-gray-400"}`}>
          {task.priority}
        </span>
      </div>

      {(task.venture || task.office) && (
        <div className="text-gray-500 dark:text-gray-400 mb-1">
          {task.venture?.name}
          {task.office && ` · ${task.office.name}`}
        </div>
      )}

      <div className="flex justify-between items-center text-gray-500 dark:text-gray-400">
        <span>{task.assignee?.name || "Unassigned"}</span>
        <span className={isOverdue ? "text-red-600 dark:text-red-400 font-semibold" : ""}>
          {due ? `Due: ${due}` : "No due date"}
        </span>
      </div>

      {task.status !== "DONE" && nextStatus[task.status] && (
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={() => onStatusChange(task.id, nextStatus[task.status])}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline text-xs transition-colors"
          >
            Move to {(nextStatus[task.status] || "").replace("_", " ")}
          </button>
        </div>
      )}
    </div>
  );
}

TaskBoardPage.title = "Tasks Board";
