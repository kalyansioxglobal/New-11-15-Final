import { useEffect, useState } from "react";

type AgentKpi = {
  agentId: number;
  agentName: string;
  campaignName: string | null;
  totalDials: number;
  totalConnects: number;
  totalTalkSeconds: number;
  totalAppointments: number;
  totalDeals: number;
  totalRevenue: number;
};

type KpiResponse = {
  from: string;
  to: string;
  agents: AgentKpi[];
  totals: {
    totalDials: number;
    totalConnects: number;
    totalTalkSeconds: number;
    totalAppointments: number;
    totalDeals: number;
    totalRevenue: number;
  };
};

function formatSecondsToHMS(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  return parts.join(" ");
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfWeek() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + 1;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek() {
  const d = startOfWeek();
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfMonth() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

function KpiTile({
  label,
  value,
  subLabel,
}: {
  label: string;
  value: string | number;
  subLabel?: string;
}) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
      {subLabel && (
        <div className="mt-0.5 text-xs text-gray-500">{subLabel}</div>
      )}
    </div>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={
        "px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 " +
        className
      }
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={"px-4 py-2 " + className}>{children}</td>;
}

function BpoKpiPage() {
  const [from, setFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return toDateInputValue(d);
  });
  const [to, setTo] = useState<string>(() => toDateInputValue(new Date()));

  const [data, setData] = useState<KpiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedVentureId] = useState<number | undefined>(undefined);
  const [selectedOfficeId] = useState<number | undefined>(undefined);
  const [selectedCampaignId] = useState<number | undefined>(undefined);
  const [selectedAgentId] = useState<number | undefined>(undefined);

  const fetchData = () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("from", new Date(from).toISOString());
    params.set("to", new Date(to).toISOString());
    if (selectedVentureId) params.set("ventureId", String(selectedVentureId));
    if (selectedOfficeId) params.set("officeId", String(selectedOfficeId));
    if (selectedCampaignId) params.set("campaignId", String(selectedCampaignId));
    if (selectedAgentId) params.set("agentId", String(selectedAgentId));

    fetch(`/api/bpo/kpi?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`);
        }
        const json = (await res.json()) as KpiResponse;
        setData(json);
      })
      .catch((err: any) => {
        console.error(err);
        setError(err.message || "Failed to load KPI data");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleQuickRange = (type: "today" | "thisWeek" | "thisMonth" | "last7") => {
    let f: Date;
    let t: Date;

    switch (type) {
      case "today":
        f = startOfToday();
        t = endOfToday();
        break;
      case "thisWeek":
        f = startOfWeek();
        t = endOfWeek();
        break;
      case "thisMonth":
        f = startOfMonth();
        t = endOfMonth();
        break;
      case "last7":
      default:
        t = endOfToday();
        f = new Date(t);
        f.setDate(f.getDate() - 7);
        f.setHours(0, 0, 0, 0);
        break;
    }

    setFrom(toDateInputValue(f));
    setTo(toDateInputValue(t));
  };

  const totals = data?.totals;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">BPO Agent KPIs</h1>
          <p className="text-sm text-gray-500">
            Full visibility into agent activity and outcomes.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">
              From
              <input
                type="date"
                className="ml-2 rounded border px-2 py-1 text-sm"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className="text-sm text-gray-600">
              To
              <input
                type="date"
                className="ml-2 rounded border px-2 py-1 text-sm"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>

            <button
              onClick={fetchData}
              className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
            >
              Apply
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              onClick={() => handleQuickRange("today")}
              className="rounded border px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
            >
              Today
            </button>
            <button
              onClick={() => handleQuickRange("thisWeek")}
              className="rounded border px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
            >
              This Week
            </button>
            <button
              onClick={() => handleQuickRange("thisMonth")}
              className="rounded border px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
            >
              This Month
            </button>
            <button
              onClick={() => handleQuickRange("last7")}
              className="rounded border px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
            >
              Last 7 Days
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <KpiTile label="Total Dials" value={totals?.totalDials ?? 0} />
        <KpiTile
          label="Total Connects"
          value={totals?.totalConnects ?? 0}
          subLabel={
            totals && totals.totalDials > 0
              ? `${((totals.totalConnects / totals.totalDials) * 100).toFixed(1)}% CR`
              : undefined
          }
        />
        <KpiTile
          label="Talk Time"
          value={totals ? formatSecondsToHMS(totals.totalTalkSeconds) : "0s"}
        />
        <KpiTile label="Appointments" value={totals?.totalAppointments ?? 0} />
        <KpiTile label="Deals Won" value={totals?.totalDeals ?? 0} />
        <KpiTile
          label="Revenue"
          value={
            totals
              ? totals.totalRevenue.toLocaleString(undefined, {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 0,
                })
              : "$0"
          }
        />
      </div>

      {loading && (
        <div className="rounded border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Loading BPO KPIs...
        </div>
      )}

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <Th>Agent</Th>
              <Th>Campaign</Th>
              <Th className="text-right">Dials</Th>
              <Th className="text-right">Connects</Th>
              <Th className="text-right">Connect %</Th>
              <Th className="text-right">Talk Time</Th>
              <Th className="text-right">Avg Handle</Th>
              <Th className="text-right">Appts</Th>
              <Th className="text-right">Deals</Th>
              <Th className="text-right">Close %</Th>
              <Th className="text-right">Revenue</Th>
              <Th className="text-right">Rev / Dial</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(data?.agents ?? []).map((a) => {
              const connectRate =
                a.totalDials > 0
                  ? (a.totalConnects / a.totalDials) * 100
                  : 0;
              const closeRate =
                a.totalConnects > 0
                  ? (a.totalDeals / a.totalConnects) * 100
                  : 0;
              const avgHandle =
                a.totalDials > 0
                  ? Math.round(a.totalTalkSeconds / a.totalDials)
                  : 0;
              const revPerDial =
                a.totalDials > 0 ? a.totalRevenue / a.totalDials : 0;

              return (
                <tr key={a.agentId} className="hover:bg-gray-50">
                  <Td>
                    <div className="flex flex-col">
                      <span className="font-medium">{a.agentName}</span>
                      <span className="text-xs text-gray-500">
                        ID: {a.agentId}
                      </span>
                    </div>
                  </Td>
                  <Td>{a.campaignName || "-"}</Td>
                  <Td className="text-right">{a.totalDials}</Td>
                  <Td className="text-right">{a.totalConnects}</Td>
                  <Td className="text-right">
                    {a.totalDials > 0 ? `${connectRate.toFixed(1)}%` : "-"}
                  </Td>
                  <Td className="text-right">
                    {formatSecondsToHMS(a.totalTalkSeconds)}
                  </Td>
                  <Td className="text-right">
                    {avgHandle > 0 ? formatSecondsToHMS(avgHandle) : "-"}
                  </Td>
                  <Td className="text-right">{a.totalAppointments}</Td>
                  <Td className="text-right">{a.totalDeals}</Td>
                  <Td className="text-right">
                    {a.totalConnects > 0 ? `${closeRate.toFixed(1)}%` : "-"}
                  </Td>
                  <Td className="text-right">
                    {a.totalRevenue.toLocaleString(undefined, {
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 0,
                    })}
                  </Td>
                  <Td className="text-right">
                    {revPerDial > 0
                      ? revPerDial.toLocaleString(undefined, {
                          style: "currency",
                          currency: "USD",
                          maximumFractionDigits: 2,
                        })
                      : "-"}
                  </Td>
                </tr>
              );
            })}

            {!loading && ((data?.agents?.length ?? 0) === 0) && (
              <tr>
                <td
                  colSpan={12}
                  className="px-4 py-6 text-center text-sm text-gray-500"
                >
                  No BPO activity found for this range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

BpoKpiPage.title = "BPO Agent KPIs";

export default BpoKpiPage;
