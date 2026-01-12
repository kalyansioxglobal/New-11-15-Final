import { useState } from "react";
import { GetServerSideProps } from "next";
import Link from "next/link";
import { getEffectiveUser } from "@/lib/effectiveUser";
import useSWR from "swr";
import Layout from "@/components/Layout";
import { Skeleton } from "@/components/ui/Skeleton";
import toast from "react-hot-toast";

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
  const [submitting, setSubmitting] = useState(false);

  const { data: tasksData, isLoading: tasksLoading, error: tasksApiError } = useSWR<{ tasks: Task[] }>(
    `/api/tasks?limit=20&assignedToId=${userId}`,
    fetcher,
    {
      onError: () => toast.error("Unable to load tasks"),
    }
  );

  const { data: attendanceData, mutate: mutateAttendance } = useSWR<{ data: AttendanceData }>(
    "/api/attendance/my",
    fetcher
  );

  const { data: eodData } = useSWR(
    "/api/eod-reports/my-status",
    fetcher
  );

  const tasks = tasksData?.tasks || [];
  const attendance = attendanceData?.data;
  const eodStatus = eodData?.streak;


  const myTasks = tasks.filter((t) => t.status !== "COMPLETED");
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED" || t.status === "DONE");
  const overdueTasks = myTasks.filter((t) => {
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < new Date();
  });

  const handleMarkAttendance = async (status: string) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/attendance/my", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(`Attendance marked as ${status.replace(/_/g, " ")}`);
        mutateAttendance();
      } else {
        const errorMessage = data?.error?.message || "Failed to mark attendance";
        toast.error(errorMessage);
      }
    } catch (err) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT": return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300";
      case "HIGH": return "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300";
      case "MEDIUM": return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300";
      default: return "bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-300";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED": return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300";
      case "IN_PROGRESS": return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300";
      case "PENDING": return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300";
      default: return "bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-300";
    }
  };

  const getAttendanceColor = (status: string) => {
    switch (status) {
      case "PRESENT": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800 hover:bg-green-200 dark:hover:bg-green-900/50";
      case "REMOTE": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/50";
      case "PTO": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-200 dark:hover:bg-purple-900/50";
      case "HALF_DAY": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800 hover:bg-yellow-200 dark:hover:bg-yellow-900/50";
      case "SICK": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-200 dark:hover:bg-red-900/50";
      case "LATE": return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800 hover:bg-orange-200 dark:hover:bg-orange-900/50";
      default: return "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-900/50";
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">My Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">My Tasks</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{myTasks.length}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">Open items</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Completed</div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{completedTasks.length}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">This period</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Overdue</div>
          <div className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">{overdueTasks.length}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">Past due date</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">EOD Streak</div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">{eodStatus || 0}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">Days in a row</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Today&apos;s Attendance</h2>
          {attendance?.today ? (
            <div className="text-center py-4">
              <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getAttendanceColor(attendance.today.status)}`}>
                {attendance.today.status.replace(/_/g, " ")}
              </span>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">You&apos;ve marked your attendance for today</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Mark your attendance for today:</p>
              <div className="grid grid-cols-3 gap-2">
                {["PRESENT", "REMOTE", "PTO", "HALF_DAY", "SICK", "LATE"].map((status) => (
                  <button
                    key={status}
                    onClick={() => handleMarkAttendance(status)}
                    disabled={submitting}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all duration-150 ${getAttendanceColor(
                      status
                    )} hover:shadow-md hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none`}
                  >
                    {status.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">EOD Report</h2>
          {eodStatus?.submittedToday ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-2">✓</div>
              <span className="px-4 py-2 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
                Submitted Today
              </span>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">Great job! Your EOD report is in.</p>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="text-4xl mb-2">📝</div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">You haven&apos;t submitted your EOD report yet.</p>
              <Link
                href="/eod-reports/submit"
                className="btn"
                >
                Submit EOD Report
              </Link>
            </div>
          )}
        </div>
      </div>

      {overdueTasks.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <h2 className="font-semibold text-red-800 dark:text-red-300 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 dark:bg-red-400 rounded-full animate-pulse"></span>
            Overdue Tasks ({overdueTasks.length})
          </h2>
          <div className="space-y-2">
            {overdueTasks.slice(0, 3).map((task) => (
              <div key={task.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{task.title}</div>
                  <div className="text-sm text-red-600 dark:text-red-400">
                    Due: {new Date(task.dueDate!).toLocaleDateString()}
                  </div>
                </div>
                <Link 
                  href={`/tasks/${task.id}`}
                  className="px-3 py-1 text-sm bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">My Tasks</h2>
        </div>
        
        {tasksLoading ? (
          <Skeleton className="w-full h-[85vh]" />
        ) : myTasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-2">🎉</div>
            <p>All caught up! No open tasks.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {myTasks.map((task) => (
              <div key={task.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 dark:text-white">{task.title}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{task.description}</p>
                    )}
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                      {task.dueDate ? (
                        <span className={new Date(task.dueDate) < new Date() ? "text-red-500 dark:text-red-400" : ""}>
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
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium ml-4 transition-colors"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            href="/tasks"
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-center transition-colors"
          >
            <div className="text-2xl mb-2">📋</div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">All Tasks</div>
          </Link>
          <Link
            href="/eod-reports"
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-center transition-colors"
          >
            <div className="text-2xl mb-2">📝</div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">EOD Report</div>
          </Link>
          <Link
            href="/attendance"
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-center transition-colors"
          >
            <div className="text-2xl mb-2">📅</div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Attendance</div>
          </Link>
          <Link
            href="/profile"
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-center transition-colors"
          >
            <div className="text-2xl mb-2">👤</div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">My Profile</div>
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
