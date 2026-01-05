import { useState } from "react";
import { GetServerSideProps } from "next";
import Link from "next/link";
import { getEffectiveUser } from "@/lib/effectiveUser";
import useSWR from "swr";
import Layout from "@/components/Layout";
import PersonalPerformance from "@/components/PersonalPerformance";
import { Skeleton } from "@/components/ui/Skeleton";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Customer = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  lastContactDate: string | null;
  totalLoads: number;
  activeLoads: number;
};

type Quote = {
  id: number;
  reference: string | null;
  customerName: string | null;
  origin: string | null;
  destination: string | null;
  status: string;
  createdAt: string;
  expiresAt: string | null;
};

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

type CSRDashboardProps = {
  userId: number;
};

export default function CSRDashboard({ userId }: CSRDashboardProps) {
  const [activeTab, setActiveTab] = useState<"customers" | "tasks">("tasks");
  const [dataError, setDataError] = useState<string | null>(null);

  const { data: tasksData, isLoading: tasksLoading, error: tasksApiError } = useSWR<{ tasks: Task[] }>(
    `/api/tasks?limit=20&status=IN_PROGRESS,PENDING&assignedToId=${userId}`,
    fetcher,
    {
      onError: () => setDataError("Unable to load tasks"),
    }
  );

  const { data: customersData, error: customersApiError } = useSWR(
    "/api/logistics/customers?limit=10",
    fetcher,
    {
      onError: () => setDataError("Unable to load customers"),
    }
  );

  const rawTasks = tasksData?.tasks || [];
  const tasks = rawTasks.filter((t) => t.assignedToId === userId);
  const customers = customersData?.items || [];
  const hasError = dataError || tasksApiError || customersApiError;

  const myTasks = tasks.filter((t) => t.status !== "COMPLETED");
  const urgentTasks = myTasks.filter((t) => t.priority === "HIGH" || t.priority === "URGENT");
  const dueTodayTasks = myTasks.filter((t) => {
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    const today = new Date();
    return due.toDateString() === today.toDateString();
  });

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">CSR Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Customer service and quote management</p>
        </div>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </div>
      </div>

      {hasError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-yellow-800 text-sm">
            Some data may not be available. Please refresh or contact support if the issue persists.
          </p>
        </div>
      )}

      <PersonalPerformance />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Open Tasks</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{myTasks.length}</div>
          <div className="text-xs text-gray-400 mt-1">Assigned to you</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Urgent</div>
          <div className="text-3xl font-bold text-red-600 mt-1">{urgentTasks.length}</div>
          <div className="text-xs text-gray-400 mt-1">High priority items</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Due Today</div>
          <div className="text-3xl font-bold text-amber-600 mt-1">{dueTodayTasks.length}</div>
          <div className="text-xs text-gray-400 mt-1">Complete by EOD</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Active Customers</div>
          <div className="text-3xl font-bold text-blue-600 mt-1">{customers.length}</div>
          <div className="text-xs text-gray-400 mt-1">Recent activity</div>
        </div>
      </div>

      {urgentTasks.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h2 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            Urgent Tasks ({urgentTasks.length})
          </h2>
          <div className="space-y-2">
            {urgentTasks.slice(0, 3).map((task) => (
              <div key={task.id} className="bg-white rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{task.title}</div>
                  <div className="text-sm text-gray-500">
                    {task.dueDate ? `Due: ${new Date(task.dueDate).toLocaleDateString()}` : "No due date"}
                    {task.ventureName && ` · ${task.ventureName}`}
                  </div>
                </div>
                <a 
                  href={`/tasks/${task.id}`}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  View
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex gap-4 p-4">
            <button
              onClick={() => setActiveTab("tasks")}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                activeTab === "tasks"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              My Tasks
            </button>
            <button
              onClick={() => setActiveTab("customers")}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                activeTab === "customers"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Customers
            </button>
          </div>
        </div>

        {activeTab === "tasks" && (
          <div className="p-4">
            {tasksLoading ? (
              // <div className="text-center text-gray-500 py-8">Loading tasks...</div>
              <Skeleton className="w-full h-[85vh]" />
            ) : myTasks.length === 0 ? (
              <div className="text-center text-gray-500 py-8">No open tasks</div>
            ) : (
              <div className="space-y-3">
                {myTasks.map((task) => (
                  <div key={task.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
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
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                        )}
                        <div className="text-xs text-gray-400 mt-2">
                          {task.dueDate && `Due: ${new Date(task.dueDate).toLocaleDateString()}`}
                          {task.ventureName && ` · ${task.ventureName}`}
                        </div>
                      </div>
                      <a
                        href={`/tasks/${task.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium ml-4"
                      >
                        View
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "customers" && (
          <div className="p-4">
            {customers.length === 0 ? (
              <div className="text-center text-gray-500 py-8">No customers found</div>
            ) : (
              <div className="space-y-3">
                {customers.map((customer: any) => (
                  <div key={customer.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{customer.name}</div>
                        <div className="text-sm text-gray-500">
                          {customer.email || customer.phone || "No contact info"}
                        </div>
                      </div>
                      <a
                        href={`/logistics/customers/${customer.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/tasks/new"
              className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-center"
            >
              <div className="text-2xl mb-1">+</div>
              <div className="text-sm text-gray-600">New Task</div>
            </Link>
            <Link
              href="/logistics/customers"
              className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-center"
            >
              <div className="text-2xl mb-1">👥</div>
              <div className="text-sm text-gray-600">Customers</div>
            </Link>
            <Link
              href="/eod"
              className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-center"
            >
              <div className="text-2xl mb-1">📝</div>
              <div className="text-sm text-gray-600">Submit EOD</div>
            </Link>
            <Link
              href="/attendance"
              className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-center"
            >
              <div className="text-2xl mb-1">✓</div>
              <div className="text-sm text-gray-600">Attendance</div>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Today&apos;s Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Tasks Completed</span>
              <span className="font-medium text-gray-900">
                {tasks.filter((t) => t.status === "COMPLETED").length}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">In Progress</span>
              <span className="font-medium text-gray-900">
                {tasks.filter((t) => t.status === "IN_PROGRESS").length}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Pending</span>
              <span className="font-medium text-gray-900">
                {tasks.filter((t) => t.status === "PENDING").length}
              </span>
            </div>
          </div>
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

  const allowedRoles = ["CSR", "DISPATCHER", "CEO", "ADMIN", "COO", "VENTURE_HEAD", "TEAM_LEAD"];
  if (!allowedRoles.includes(user.role)) {
    return { redirect: { destination: "/overview", permanent: false } };
  }

  return { props: { userId: user.id } };
};

CSRDashboard.getLayout = (page: React.ReactElement) => <Layout>{page}</Layout>;
CSRDashboard.title = "CSR Dashboard";
