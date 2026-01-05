import { useRouter } from "next/router";
import useSWR from "swr";
import { useState } from "react";
import Link from "next/link";
import { useTestMode } from "@/contexts/TestModeContext";
import { Skeleton } from "@/components/ui/Skeleton";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Summary = {
  ventureId: number;
  ventureName: string;
  ventureType: string;
  windowDays: number;
  headcountApprox: number;
  headcountFte: number;
  utilizationPct: number | null;
  presencePct: number | null;
  tasksPerFtePerDay: number | null;
  loadsPerFtePerDay: number | null;
  ticketsPerFtePerDay: number | null;
  contactsPerFtePerDay: number | null;
  callsPerFtePerDay: number | null;
};

type Employee = {
  userId: number;
  name: string | null;
  role: string;
  officeName?: string;
  days: number;
  hoursPlanned: number;
  hoursWorked: number;
  tasksCompleted: number;
  loadsTouched: number;
  loadsCovered: number;
  contactsMade: number;
  callsMade: number;
  ticketsClosed: number;
  revenueGenerated: number;
  utilization: number | null;
  loadsPerDay: number | null;
  tasksPerDay: number | null;
  qaAvg: number | null;
  attendance: {
    present: number;
    absent: number;
    late: number;
    half_day: number;
  };
};

function SummaryTile({
  label,
  value,
  sub,
  danger,
}: {
  label: string;
  value: string;
  sub?: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 flex flex-col justify-between">
      <div className="text-[11px] text-gray-500">{label}</div>
      <div
        className={`text-lg font-semibold ${danger ? "text-red-600" : "text-gray-900"}`}
      >
        {value}
      </div>
      {sub && <div className="text-[11px] text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

export default function VenturePeoplePage() {
  const router = useRouter();
  const { id } = router.query;
  const { testMode } = useTestMode();
  const [days, setDays] = useState("7");

  const { data, isLoading } = useSWR<{
    windowDays: number;
    summary: Summary;
    employees: Employee[];
  }>(
    id ? `/api/ventures/${id}/people?days=${days}&includeTest=${testMode ? "true" : "false"}` : null,
    fetcher
  );

  if (isLoading || !data) {
    return <Skeleton className="w-full h-[85vh]" />;
  }

  const { employees, windowDays, summary } = data;

  return (
    <div className="p-6 space-y-4 text-sm">
      <div className="text-xs text-gray-500 mb-1">
        <Link href="/overview" className="hover:underline">
          Overview
        </Link>{" "}
        /{" "}
        <Link href={`/ventures/${id}`} className="hover:underline">
          Venture
        </Link>{" "}
        / <span>People</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">People KPIs</h1>
          <div className="text-xs text-gray-500">
            {summary?.ventureName} · last {windowDays} days
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500">Window:</span>
          <select
            className="border border-gray-300 rounded-lg px-2 py-1"
            value={days}
            onChange={(e) => setDays(e.target.value)}
          >
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-5 gap-3 text-xs">
          <SummaryTile
            label="Headcount (approx FTE)"
            value={summary.headcountFte ? summary.headcountFte.toFixed(1) : "—"}
            sub={summary.headcountApprox ? `${summary.headcountApprox} employees` : ""}
          />
          <SummaryTile
            label="Utilization"
            value={summary.utilizationPct != null ? `${summary.utilizationPct}%` : "—"}
            danger={summary.utilizationPct != null && summary.utilizationPct < 80}
          />
          <SummaryTile
            label="Presence rate"
            value={summary.presencePct != null ? `${summary.presencePct}%` : "—"}
            danger={summary.presencePct != null && summary.presencePct < 90}
          />
          <SummaryTile
            label="Tasks / FTE / day"
            value={
              summary.tasksPerFtePerDay != null
                ? summary.tasksPerFtePerDay.toFixed(1)
                : "—"
            }
          />
          {summary.ventureType === "LOGISTICS" ? (
            <SummaryTile
              label="Loads / FTE / day"
              value={
                summary.loadsPerFtePerDay != null
                  ? summary.loadsPerFtePerDay.toFixed(1)
                  : "—"
              }
              sub={
                summary.contactsPerFtePerDay != null
                  ? `${summary.contactsPerFtePerDay.toFixed(1)} contacts/FTE/day`
                  : ""
              }
            />
          ) : summary.ventureType === "BPO" || summary.ventureType === "SAAS" ? (
            <SummaryTile
              label="Tickets / FTE / day"
              value={
                summary.ticketsPerFtePerDay != null
                  ? summary.ticketsPerFtePerDay.toFixed(1)
                  : "—"
              }
              sub={
                summary.callsPerFtePerDay != null
                  ? `${summary.callsPerFtePerDay.toFixed(1)} calls/FTE/day`
                  : ""
              }
            />
          ) : (
            <SummaryTile
              label="Loads / Tickets / day"
              value={
                summary.loadsPerFtePerDay != null
                  ? summary.loadsPerFtePerDay.toFixed(1)
                  : summary.ticketsPerFtePerDay != null
                  ? summary.ticketsPerFtePerDay.toFixed(1)
                  : "—"
              }
            />
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-auto text-xs">
        <table className="w-full min-w-[900px]">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="p-2 text-left font-semibold">Employee</th>
              <th className="p-2 text-left font-semibold">Role</th>
              <th className="p-2 text-left font-semibold">Office</th>
              <th className="p-2 text-right font-semibold">
                Hours Planned / Worked
                <br />
                <span className="font-normal text-gray-400">Utilization</span>
              </th>
              <th className="p-2 text-right font-semibold">
                Tasks / day
                <br />
                <span className="font-normal text-gray-400">Total tasks</span>
              </th>
              <th className="p-2 text-right font-semibold">
                Loads / day
                <br />
                <span className="font-normal text-gray-400">Covered</span>
              </th>
              <th className="p-2 text-right font-semibold">
                Contacts / Calls
                <br />
                <span className="font-normal text-gray-400">(total)</span>
              </th>
              <th className="p-2 text-right font-semibold">
                QA avg
                <br />
                <span className="font-normal text-gray-400">%</span>
              </th>
              <th className="p-2 text-right font-semibold">
                Presence
                <br />
                <span className="font-normal text-gray-400">P / A / L</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {employees.map((e) => {
              const util = e.utilization != null ? `${e.utilization}%` : "—";
              const tasksDay = e.tasksPerDay != null ? e.tasksPerDay : "—";
              const loadsDay = e.loadsPerDay != null ? e.loadsPerDay : "—";
              const qa = e.qaAvg != null ? e.qaAvg : "—";
              const contactsTotal = e.contactsMade || 0;
              const callsTotal = e.callsMade || 0;
              const presence = e.attendance || { present: 0, absent: 0, late: 0 };

              return (
                <tr key={e.userId} className="hover:bg-gray-50">
                  <td className="p-2 font-medium">{e.name || "Unknown"}</td>
                  <td className="p-2 text-gray-600">{e.role}</td>
                  <td className="p-2 text-gray-600">{e.officeName || "—"}</td>
                  <td className="p-2 text-right">
                    {Math.round(e.hoursPlanned || 0)} / {Math.round(e.hoursWorked || 0)}
                    <br />
                    <span
                      className={
                        e.utilization != null && e.utilization < 80 ? "text-red-600" : "text-gray-500"
                      }
                    >
                      {util}
                    </span>
                  </td>
                  <td className="p-2 text-right">
                    {tasksDay}
                    <br />
                    <span className="text-gray-400">{e.tasksCompleted || 0}</span>
                  </td>
                  <td className="p-2 text-right">
                    {loadsDay}
                    <br />
                    <span className="text-gray-400">{e.loadsCovered || 0}</span>
                  </td>
                  <td className="p-2 text-right">
                    {contactsTotal}
                    <br />
                    <span className="text-gray-400">{callsTotal} calls</span>
                  </td>
                  <td className="p-2 text-right">{qa}</td>
                  <td className="p-2 text-right">
                    {presence.present || 0} / {presence.absent || 0} / {presence.late || 0}
                  </td>
                </tr>
              );
            })}

            {!employees.length && (
              <tr>
                <td colSpan={9} className="p-4 text-center text-gray-400">
                  No employee KPIs recorded for the last {windowDays} days.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-[11px] text-gray-400">
        Window: last {windowDays} days. Utilization = hours worked / hours planned. Tasks & loads
        per day are averages over days with KPI entries.
      </div>
    </div>
  );
}

VenturePeoplePage.title = "People KPIs";
