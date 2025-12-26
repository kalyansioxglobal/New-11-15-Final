import { useState } from "react";
import { GetServerSideProps } from "next";
import Link from "next/link";
import { getEffectiveUser } from "@/lib/effectiveUser";
import useSWR from "swr";
import Layout from "@/components/Layout";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Task = {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  ventureName: string | null;
  assignedToId: number | null;
};

type AttendanceData = {
  today: { status: string; notes: string } | null;
  history: { date: string; status: string }[];
  statuses: string[];
};

type EODStatus = {
  submittedToday: boolean;
  streak: number;
  lastSubmission: string | null;
};

type EmployeeDashboardProps = {
  userId: number;
};

export default function EmployeeDashboard({ userId }: EmployeeDashboardProps) {
  const [attendanceStatus, setAttendanceStatus] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [tasksError, setTasksError] = useState<string | null>(null);

  const { data: tasksData, isLoading: tasksLoading, error: tasksApiError } = useSWR<{ tasks: Task[] }>(
    `/api/tasks?limit=20&assignedToId=${userId}`,
    fetcher,
    {
      onError: () => setTasksError("Unable to load tasks"),
    }
  );

  const { data: attendanceData, mutate: mutateAttendance } = useSWR<{ data: AttendanceData }>(
    "/api/attendance/my",
    fetcher
  );

  const { data: eodData } = useSWR<{ data: EODStatus }>(
    "/api/eod-reports/my-status",
    fetcher
  );

  const rawTasks = tasksData?.tasks || [];
  const tasks = rawTasks.filter((t) => t.assignedToId === userId);
  const attendance = attendanceData?.data;
  const eodStatus = eodData?.data;

  const myTasks = tasks.filter((t) => t.status !== "COMPLETED");
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED");
  const overdueTasks = myTasks.filter((t) => {
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < new Date();
  });

  const handleMarkAttendance = async (status: string) => {
    setSubmitting(true);
    setAttendanceError(null);
    try {
      const res = await fetch("/api/attendance/my", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        mutateAttendance();
        setAttendanceStatus("");
        setAttendanceError(null);
      } else {
        // Show error message to user
        const errorMessage = data?.error?.message || "Failed to mark attendance";
        setAttendanceError(errorMessage);
        console.error("Failed to mark attendance:", errorMessage);
      }
    } catch (err) {
      console.error("Failed to mark attendance:", err);
      setAttendanceError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT": return "bg-red-100 text-red-700";
      case "HIGH": return "bg-orange-100 text-orange-700";
      case "MEDIUM": return "bg-yellow-100 text-yellow-700";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED": return "bg-green-100 text-green-700";
      case "IN_PROGRESS": return "bg-blue-100 text-blue-700";
      case "PENDING": return "bg-yellow-100 text-yellow-700";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  const getAttendanceColor = (status: string) => {
    switch (status) {
      case "PRESENT": return "bg-green-100 text-green-700";
      case "REMOTE": return "bg-blue-100 text-blue-700";
      case "PTO": return "bg-purple-100 text-purple-700";
      case "HALF_DAY": return "bg-yellow-100 text-yellow-700";
      case "SICK": return "bg-red-100 text-red-700";
      case "LATE": return "bg-orange-100 text-orange-700";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">My Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </div>

      {(tasksError || tasksApiError) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-yellow-800 text-sm">
            Some data may not be available. Please refresh or contact support if the issue persists.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">My Tasks</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{myTasks.length}</div>
          <div className="text-xs text-gray-400 mt-1">Open items</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Completed</div>
          <div className="text-3xl font-bold text-green-600 mt-1">{completedTasks.length}</div>
          <div className="text-xs text-gray-400 mt-1">This period</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Overdue</div>
          <div className="text-3xl font-bold text-red-600 mt-1">{overdueTasks.length}</div>
          <div className="text-xs text-gray-400 mt-1">Past due date</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">EOD Streak</div>
          <div className="text-3xl font-bold text-blue-600 mt-1">{eodStatus?.streak || 0}</div>
          <div className="text-xs text-gray-400 mt-1">Days in a row</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-900 mb-4">Today&apos;s Attendance</h2>
          {attendance?.today ? (
            <div className="text-center py-4">
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${getAttendanceColor(attendance.today.status)}`}>
                {attendance.today.status.replace(/_/g, " ")}
              </span>
              <p className="text-sm text-gray-500 mt-3">You&apos;ve marked your attendance for today</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-4">Mark your attendance for today:</p>
              {attendanceError && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{attendanceError}</p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                {["PRESENT", "REMOTE", "PTO", "HALF_DAY", "SICK", "LATE"].map((status) => (
                  <button
                    key={status}
                    onClick={() => handleMarkAttendance(status)}
                    disabled={submitting}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      submitting
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-gray-50"
                    } ${getAttendanceColor(status)}`}
                  >
                    {status.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-900 mb-4">EOD Report</h2>
          {eodStatus?.submittedToday ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-2">✓</div>
              <span className="px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-700">
                Submitted Today
              </span>
              <p className="text-sm text-gray-500 mt-3">Great job! Your EOD report is in.</p>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="text-4xl mb-2">📝</div>
              <p className="text-sm text-gray-500 mb-4">You haven&apos;t submitted your EOD report yet.</p>
              <Link
                href="/eod"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Submit EOD Report
              </Link>
            </div>
          )}
        </div>
      </div>

      {overdueTasks.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h2 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            Overdue Tasks ({overdueTasks.length})
          </h2>
          <div className="space-y-2">
            {overdueTasks.slice(0, 3).map((task) => (
              <div key={task.id} className="bg-white rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{task.title}</div>
                  <div className="text-sm text-red-600">
                    Due: {new Date(task.dueDate!).toLocaleDateString()}
                  </div>
                </div>
                <Link 
                  href={`/tasks/${task.id}`}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">My Tasks</h2>
        </div>
        
        {tasksLoading ? (
          <div className="p-8 text-center text-gray-500">Loading tasks...</div>
        ) : myTasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">🎉</div>
            <p>All caught up! No open tasks.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {myTasks.map((task) => (
              <div key={task.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{task.title}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">{task.description}</p>
                    )}
                    <div className="text-xs text-gray-400 mt-2">
                      {task.dueDate ? (
                        <span className={new Date(task.dueDate) < new Date() ? "text-red-500" : ""}>
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      ) : (
                        "No due date"
                      )}
                      {task.ventureName && ` · ${task.ventureName}`}
                    </div>
                  </div>
                  <Link
                    href={`/tasks/${task.id}`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium ml-4"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            href="/tasks"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center"
          >
            <div className="text-2xl mb-2">📋</div>
            <div className="text-sm font-medium text-gray-900">All Tasks</div>
          </Link>
          <Link
            href="/eod"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center"
          >
            <div className="text-2xl mb-2">📝</div>
            <div className="text-sm font-medium text-gray-900">EOD Report</div>
          </Link>
          <Link
            href="/attendance"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center"
          >
            <div className="text-2xl mb-2">📅</div>
            <div className="text-sm font-medium text-gray-900">Attendance</div>
          </Link>
          <Link
            href="/profile"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center"
          >
            <div className="text-2xl mb-2">👤</div>
            <div className="text-sm font-medium text-gray-900">My Profile</div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const user = await getEffectiveUser(ctx.req, ctx.res);

  if (!user) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  const allowedRoles = ["EMPLOYEE", "CONTRACTOR", "CSR", "DISPATCHER", "CEO", "ADMIN", "COO", "VENTURE_HEAD", "TEAM_LEAD"];
  if (!allowedRoles.includes(user.role)) {
    return { redirect: { destination: "/overview", permanent: false } };
  }

  return { props: { userId: user.id } };
};

EmployeeDashboard.getLayout = (page: React.ReactElement) => <Layout>{page}</Layout>;
EmployeeDashboard.title = "My Dashboard";
