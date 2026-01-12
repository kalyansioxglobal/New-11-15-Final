import useSWR from "swr";
import Link from "next/link";
import { useTestMode } from "@/contexts/TestModeContext";
import OverdueTaskAlert from "@/components/OverdueTaskAlert";
import { Skeleton } from "@/components/ui/Skeleton";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type EodStatus = {
  submittedToday: boolean;
  todayReportId: number | null;
  streak: number;
};

type TaskItem = {
  id: number;
  title: string;
  status: string;
  dueDate: string | null;
  venture: { id: number; name: string } | null;
};

type LoadItem = {
  id: number;
  reference: string | null;
  status: string;
  pickupDate: string | null;
  pickupCity: string | null;
  pickupState: string | null;
  dropCity: string | null;
  dropState: string | null;
  venture: { id: number; name: string } | null;
};

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  description: string;
};

type KpiData = {
  windowDays: number;
  hoursPlanned: number;
  hoursWorked: number;
  utilizationPct: number | null;
  tasksCompleted: number;
  loadsTouched: number;
  loadsCovered: number;
  contactsMade: number;
  callsMade: number;
  ticketsClosed: number;
};

type MyDayData = {
  user: {
    id: number;
    name: string | null;
    email: string;
    role: string;
  };
  tasks: {
    overdue: TaskItem[];
    today: TaskItem[];
    upcoming: TaskItem[];
  };
  loads: LoadItem[];
  kpi: KpiData;
  notifications: NotificationItem[];
};

function MyDayPage() {
  const { testMode } = useTestMode();
  const { data, isLoading } = useSWR<MyDayData>(
    `/api/my-day?includeTest=${testMode ? "true" : "false"}`,
    fetcher
  );

  const { data: eodStatus } = useSWR<EodStatus>(
    `/api/eod-reports/my-status`,
    fetcher
  );

  if (isLoading || !data) {
    return <Skeleton className="w-full h-[85vh]" />
  }

  const { user, tasks, loads, kpi, notifications } = data;

  if (!user) {
    return <div className="p-6 text-sm text-gray-500">Unable to load user data. Please try logging in again.</div>;
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="p-6 space-y-6 text-sm">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {getGreeting()}, {user.name?.split(" ")[0] || "there"}
          </h1>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Your tasks, loads, and performance in one view.
          </div>
        </div>
        <div className="flex items-center gap-4">
          {eodStatus && (
            <Link
              href="/eod-reports/submit"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                eodStatus.submittedToday
                  ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                  : "bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50"
              }`}
            >
              <span>{eodStatus.submittedToday ? "✓" : "○"}</span>
              <span>{eodStatus.submittedToday ? "EOD Submitted" : "Submit EOD"}</span>
              {eodStatus.streak > 0 && (
                <span className="text-xs">🔥 {eodStatus.streak}</span>
              )}
            </Link>
          )}
          <Link href="/overview" className="text-xs text-gray-600 dark:text-gray-400 hover:underline">
            Back to Overview
          </Link>
        </div>
      </div>

      <OverdueTaskAlert />

      <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-4">
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-4 space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-sm text-gray-900 dark:text-white">My Tasks</div>
            <Link href="/tasks" className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline">
              Open full tasks board
            </Link>
          </div>
          <TaskSection title="Overdue" tasks={tasks.overdue} highlight="red" />
          <TaskSection title="Today" tasks={tasks.today} highlight="orange" />
          <TaskSection title="Upcoming" tasks={tasks.upcoming} />
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-4 text-xs space-y-3">
          <div className="font-semibold text-sm text-gray-900 dark:text-white">My 7-day Snapshot</div>
          <div className="grid grid-cols-2 gap-3">
            <KpiTile
              label="Utilization"
              value={kpi.utilizationPct != null ? `${kpi.utilizationPct}%` : "—"}
            />
            <KpiTile label="Tasks completed" value={String(kpi.tasksCompleted || 0)} />
            <KpiTile label="Loads touched" value={String(kpi.loadsTouched || 0)} />
            <KpiTile label="Loads covered" value={String(kpi.loadsCovered || 0)} />
            <KpiTile label="Contacts made" value={String(kpi.contactsMade || 0)} />
            <KpiTile label="Calls made" value={String(kpi.callsMade || 0)} />
            <KpiTile label="Tickets closed" value={String(kpi.ticketsClosed || 0)} />
            <KpiTile
              label="Hours (plan/work)"
              value={`${Math.round(kpi.hoursPlanned || 0)} / ${Math.round(kpi.hoursWorked || 0)}`}
            />
          </div>
          <div className="text-[11px] text-gray-400 dark:text-gray-500">
            Window: last {kpi.windowDays} days. Utilization = hours worked / planned.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-4 text-xs">
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-sm text-gray-900 dark:text-white">Today&apos;s Loads (my ventures)</div>
            <Link href="/freight/loads" className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline">
              Open loads board
            </Link>
          </div>

          {loads.length ? (
            <div className="space-y-2 max-h-[260px] overflow-auto">
              {loads.map((l) => (
                <div
                  key={l.id}
                  className="border border-gray-100 dark:border-zinc-700 rounded-lg px-3 py-2 flex justify-between items-start"
                >
                  <div>
                    <div className="font-semibold text-[11px] text-gray-900 dark:text-white">
                      {l.reference ||
                        `${l.pickupCity}, ${l.pickupState} → ${l.dropCity}, ${l.dropState}`}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">
                      {l.pickupCity}, {l.pickupState} → {l.dropCity}, {l.dropState}
                    </div>
                    <div className="text-[11px] text-gray-400 dark:text-gray-500">
                      Venture: {l.venture?.name}
                    </div>
                  </div>
                  <div className="text-[11px] uppercase text-gray-500 dark:text-gray-400">{l.status}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
              No open/working loads for your ventures today.
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-4 space-y-2">
          <div className="font-semibold text-sm text-gray-900 dark:text-white">Notifications</div>
          {notifications.length ? (
            <div className="space-y-2 max-h-[260px] overflow-auto">
              {notifications.map((n) => (
                <div key={n.id} className="border border-gray-100 dark:border-zinc-700 rounded-lg px-3 py-2">
                  <div className="font-semibold text-gray-900 dark:text-white">{n.title}</div>
                  <div className="text-gray-500 dark:text-gray-400">{n.description}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">Nothing urgent right now.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskSection({
  title,
  tasks,
  highlight,
}: {
  title: string;
  tasks: TaskItem[];
  highlight?: "red" | "orange";
}) {
  const color =
    highlight === "red"
      ? "text-red-600 dark:text-red-400"
      : highlight === "orange"
      ? "text-orange-600 dark:text-orange-400"
      : "text-gray-600 dark:text-gray-400";

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{title}</div>
        <div className={`text-[11px] font-semibold ${color}`}>{tasks.length}</div>
      </div>

      {tasks.length ? (
        <div className="space-y-1 max-h-28 overflow-auto">
          {tasks.map((t) => (
            <Link
              key={t.id}
              href={`/tasks/${t.id}`}
              className="border border-gray-100 dark:border-zinc-700 rounded-lg px-3 py-2 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-zinc-700 transition block"
            >
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">{t.title}</div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                  {t.venture?.name}
                  {t.dueDate &&
                    ` · Due ${new Date(t.dueDate).toLocaleDateString(undefined, {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                    }`}
                </div>
              </div>
              <div className="text-[11px] uppercase text-gray-400 dark:text-gray-500">{t.status}</div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-[11px] text-gray-400 dark:text-gray-500">No {title.toLowerCase()} tasks.</div>
      )}
    </div>
  );
}

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 dark:border-zinc-700 px-3 py-2 bg-gray-50 dark:bg-zinc-900">
      <div className="text-[11px] text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-sm font-semibold text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}

MyDayPage.title = "My Day";

export default MyDayPage;
