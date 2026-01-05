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
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tasks Board</h1>
          <p className="text-sm text-gray-500 mt-1">
            Kanban view across ventures and offices
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/tasks"
            className="px-3 py-1.5 rounded border border-gray-300 text-sm hover:bg-gray-50"
          >
            List View
          </Link>
          {allowCreate && (
            <Link
              href="/tasks/new"
              className="px-3 py-1.5 rounded bg-blue-600 !text-white text-sm font-medium hover:bg-blue-700"
            >
              + New Task
            </Link>
          )}
        </div>
      </div>

      <div className="flex gap-3 text-sm items-center">
        <span className="text-gray-500">Filters:</span>
        <select
          className="border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-sm"
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
          className="border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-sm"
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
      {error && <div className="text-sm text-red-500 mb-2">{error}</div>}

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
    OPEN: "border-blue-200 bg-blue-50",
    IN_PROGRESS: "border-yellow-200 bg-yellow-50",
    BLOCKED: "border-red-200 bg-red-50",
    DONE: "border-green-200 bg-green-50",
  };

  return (
    <div
      className={`rounded-xl border-2 ${statusColors[status] || "border-gray-200 bg-gray-50"} p-3 flex flex-col max-h-[70vh]`}
    >
      <div className="flex justify-between items-center mb-3 px-1">
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">
          {tasks.length}
        </div>
      </div>

      <div className="space-y-2 overflow-y-auto flex-1">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onStatusChange={onStatusChange} />
        ))}
        {tasks.length === 0 && (
          <div className="text-xs text-gray-400 text-center py-4">
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
    LOW: "text-gray-500",
    MEDIUM: "text-yellow-600",
    HIGH: "text-orange-600",
    CRITICAL: "text-red-600 font-bold",
  };

  const nextStatus: Record<string, string> = {
    OPEN: "IN_PROGRESS",
    IN_PROGRESS: "DONE",
    BLOCKED: "IN_PROGRESS",
    DONE: "OPEN",
    OVERDUE: "IN_PROGRESS",
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start gap-2 mb-1">
        <Link
          href={`/tasks/${task.id}`}
          className="font-medium text-gray-900 hover:text-blue-600 line-clamp-2"
        >
          {task.title}
        </Link>
        <span className={`shrink-0 ${priorityColors[task.priority] || ""}`}>
          {task.priority}
        </span>
      </div>

      {(task.venture || task.office) && (
        <div className="text-gray-500 mb-1">
          {task.venture?.name}
          {task.office && ` · ${task.office.name}`}
        </div>
      )}

      <div className="flex justify-between items-center text-gray-500">
        <span>{task.assignee?.name || "Unassigned"}</span>
        <span className={isOverdue ? "text-red-600 font-semibold" : ""}>
          {due ? `Due: ${due}` : "No due date"}
        </span>
      </div>

      {task.status !== "DONE" && nextStatus[task.status] && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <button
            onClick={() => onStatusChange(task.id, nextStatus[task.status])}
            className="text-blue-600 hover:underline text-xs"
          >
            Move to {(nextStatus[task.status] || "").replace("_", " ")}
          </button>
        </div>
      )}
    </div>
  );
}

TaskBoardPage.title = "Tasks Board";
