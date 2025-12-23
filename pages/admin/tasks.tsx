// pages/admin/tasks.tsx
import React, { useState } from "react";
import { GetServerSideProps } from "next";
import prisma from "../../lib/prisma";

// Lightweight local task-related types to avoid coupling to Prisma client types.
type TaskStatus = "OPEN" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "OVERDUE";

type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

type Venture = {
  id: number;
  name: string;
};

type Office = {
  id: number;
  name: string;
  ventureId: number | null;
};

type User = {
  id: number;
  fullName: string | null;
  email: string;
  role: string;
};

type Task = {
  id: number;
  ventureId: number | null;
  officeId: number | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assignedTo: number | null;
};
import { useRouter } from "next/router";
import { useTestMode } from "@/contexts/TestModeContext";

type TaskWithRelations = Task & {
  venture: Venture | null;
  office: Office | null;
  assignedUser: User | null;
};

type Props = {
  tasks: TaskWithRelations[];
  ventures: Venture[];
  offices: Office[];
  users: User[];
  statusOptions: TaskStatus[];
  priorityOptions: TaskPriority[];
};

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const [tasks, ventures, offices, users] = await Promise.all([
    prisma.task.findMany({
      include: { venture: true, office: true, assignedUser: true },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    }),
    prisma.venture.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.office.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      orderBy: { fullName: "asc" },
    }),
  ]);

  const statusOptions: TaskStatus[] = [
    "OPEN",
    "IN_PROGRESS",
    "BLOCKED",
    "DONE",
    "OVERDUE",
  ];
  const priorityOptions: TaskPriority[] = [
    "LOW",
    "MEDIUM",
    "HIGH",
    "CRITICAL",
  ];

  return {
    props: {
      tasks: JSON.parse(JSON.stringify(tasks)),
      ventures: JSON.parse(JSON.stringify(ventures)),
      offices: JSON.parse(JSON.stringify(offices)),
      users: JSON.parse(JSON.stringify(users)),
      statusOptions,
      priorityOptions,
    },
  };
};

function AdminTasks({
  tasks,
  ventures,
  offices,
  users,
  statusOptions,
  priorityOptions,
}: Props) {
  const router = useRouter();
  const { testMode } = useTestMode();

  const [ventureId, setVentureId] = useState<number | "">("");
  const [officeId, setOfficeId] = useState<number | "">("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("OPEN");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState<number | "">("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data: any = {
        ventureId: ventureId === "" ? null : Number(ventureId),
        officeId: officeId === "" ? null : Number(officeId),
        title,
        description: description || null,
        status,
        priority,
        dueDate: dueDate || null,
        assignedTo: assignedTo === "" ? null : Number(assignedTo),
      };

      if (testMode) data.isTest = true;

      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed with ${res.status}`);
      }

      // Reset some fields
      setTitle("");
      setDescription("");
      setDueDate("");
      // keep ventureId/officeId & status/priority filters as is

      await router.replace(router.asPath);
    } catch (err: any) {
      setError(err.message || "Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: number, newStatus: TaskStatus) => {
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update status");
      }
      await router.replace(router.asPath);
    } catch (err: any) {
      alert(err.message || "Error updating task");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this task?")) return;
    try {
      const res = await fetch(`/api/admin/tasks?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete task");
      await router.replace(router.asPath);
    } catch (err: any) {
      alert(err.message || "Error deleting task");
    }
  };

  return (
    <div>
      {/* Create form */}
      <section
        style={{
          marginBottom: "2rem",
          padding: "1rem 1.5rem",
          border: "1px solid #eee",
          borderRadius: "8px",
          background: "#fff",
          maxWidth: "900px",
        }}
      >
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>
          Create new task
        </h2>

        {error && (
          <p style={{ color: "red", marginBottom: "0.5rem" }}>{error}</p>
        )}

        <form
          onSubmit={handleCreate}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "0.75rem 1rem",
          }}
        >
          <label style={{ display: "grid", gap: "0.25rem" }}>
            <span>Venture (optional)</span>
            <select
              value={ventureId}
              onChange={(e) =>
                setVentureId(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              style={inputStyle}
            >
              <option value="">– None –</option>
              {ventures.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: "0.25rem" }}>
            <span>Office (optional)</span>
            <select
              value={officeId}
              onChange={(e) =>
                setOfficeId(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              style={inputStyle}
            >
              <option value="">– None –</option>
              {offices.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: "0.25rem" }}>
            <span>Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Call carrier X about lane Y"
              style={inputStyle}
            />
          </label>

          <label style={{ display: "grid", gap: "0.25rem" }}>
            <span>Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              style={inputStyle}
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: "0.25rem" }}>
            <span>Priority</span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              style={inputStyle}
            >
              {priorityOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: "0.25rem" }}>
            <span>Due date (optional)</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={inputStyle}
            />
          </label>

          <label style={{ display: "grid", gap: "0.25rem" }}>
            <span>Assigned to (optional)</span>
            <select
              value={assignedTo}
              onChange={(e) =>
                setAssignedTo(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              style={inputStyle}
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName || u.email} — {u.role}
                </option>
              ))}
            </select>
          </label>

          <label
            style={{
              display: "grid",
              gridColumn: "1 / -1",
              gap: "0.25rem",
            }}
          >
            <span>Description (optional)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Any extra details, carriers, hotel, client info..."
              style={{
                ...inputStyle,
                resize: "vertical",
              }}
            />
          </label>

          <div
            style={{
              gridColumn: "1 / -1",
              display: "flex",
              justifyContent: "flex-start",
            }}
          >
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "0.6rem 1rem",
                borderRadius: "4px",
                border: "none",
                background: loading ? "#999" : "#111827",
                color: "#fff",
                cursor: loading ? "default" : "pointer",
                fontWeight: 500,
              }}
            >
              {loading ? "Creating..." : "Create task"}
            </button>
          </div>
        </form>
      </section>

      {/* Tasks table */}
      <section>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "0.75rem" }}>
          Tasks
        </h2>

        {tasks.length === 0 ? (
          <p>No tasks yet.</p>
        ) : (
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              maxWidth: "1100px",
              background: "#fff",
            }}
          >
            <thead>
              <tr>
                <th style={thStyle}>Title</th>
                <th style={thStyle}>Venture</th>
                <th style={thStyle}>Office</th>
                <th style={thStyle}>Assigned To</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Priority</th>
                <th style={thStyle}>Due</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600 }}>{t.title}</div>
                    {t.description && (
                      <div
                        style={{
                          fontSize: "0.8rem",
                          color: "#6b7280",
                          marginTop: "0.15rem",
                        }}
                      >
                        {t.description}
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>{t.venture?.name ?? "–"}</td>
                  <td style={tdStyle}>{t.office?.name ?? "–"}</td>
                  <td style={tdStyle}>{t.assignedUser?.fullName || "—"}</td>
                  <td style={tdStyle}>{t.status}</td>
                  <td style={tdStyle}>{t.priority}</td>
                  <td style={tdStyle}>
                    {t.dueDate
                      ? new Date(t.dueDate).toLocaleDateString()
                      : "–"}
                  </td>
                  <td style={tdStyle}>
                    {/* Quick status buttons */}
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      {statusOptions.map((s) => (
                        <button
                          key={s}
                          onClick={() =>
                            handleStatusChange(t.id, s as TaskStatus)
                          }
                          style={{
                            padding: "0.2rem 0.4rem",
                            borderRadius: "4px",
                            border:
                              t.status === s
                                ? "1px solid #111827"
                                : "1px solid #d1d5db",
                            background:
                              t.status === s ? "#111827" : "#f9fafb",
                            color: t.status === s ? "#fff" : "#111827",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => handleDelete(t.id)}
                      style={{
                        marginTop: "0.35rem",
                        padding: "0.2rem 0.5rem",
                        borderRadius: "4px",
                        border: "none",
                        background: "#b91c1c",
                        color: "#fff",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

AdminTasks.title = "Admin – Tasks";

export default AdminTasks;

const inputStyle: React.CSSProperties = {
  padding: "0.5rem",
  borderRadius: "4px",
  border: "1px solid #ccc",
  fontSize: "0.9rem",
};

const thStyle: React.CSSProperties = {
  borderBottom: "1px solid #ddd",
  textAlign: "left",
  padding: "0.5rem 0.75rem",
  fontWeight: 600,
  fontSize: "0.9rem",
};

const tdStyle: React.CSSProperties = {
  borderBottom: "1px solid #f1f1f1",
  padding: "0.45rem 0.75rem",
  fontSize: "0.9rem",
  verticalAlign: "top",
};
