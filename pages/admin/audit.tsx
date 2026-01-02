import React, { useEffect, useState } from "react";
import { PageWithLayout } from "@/types/page";
import type { AuditRunSummary, LatestAuditResponse } from "@/lib/audit/types";
import { GetServerSideProps } from "next";
import { Skeleton } from "@/components/ui/Skeleton";

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};

function scoreClass(score: number | null | undefined): string {
  if (score == null) return "text-slate-400";
  if (score >= 90) return "text-emerald-400";
  if (score >= 75) return "text-yellow-300";
  return "text-red-400";
}


const AuditPage: PageWithLayout = () => {
  const [latestRun, setLatestRun] = useState<AuditRunSummary | null>(null);
  const [summary, setSummary] = useState<LatestAuditResponse["moduleSummary"]>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchLatest() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/audit/latest");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: LatestAuditResponse = await res.json();
      setLatestRun(json.run ?? null);
      setSummary(json.moduleSummary ?? null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load audit data");
    } finally {
      setLoading(false);
    }
  }

  async function runAuditNow() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/audit/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchLatest();
    } catch (e: any) {
      setError(e?.message ?? "Failed to run audit");
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    fetchLatest();
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">
            Command Center Audit
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Internal health & data quality checks for Freight, Hotels, BPO &
            Security.
          </p>
        </div>
        <button
          onClick={runAuditNow}
          disabled={running}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
            running
              ? "bg-slate-700 text-slate-300"
              : "bg-indigo-600 hover:bg-indigo-500 text-white"
          }`}
        >
          {running ? "Running…" : "Run Audit Now"}
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-400 border border-red-500/50 rounded-lg px-3 py-2 bg-red-950/40">
          {error}
        </div>
      )}

      {loading && !latestRun && (
       <Skeleton className="w-full h-[85vh]" />
      )}

      {latestRun && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">Overall Audit Score</div>
              <div
                className={`text-3xl font-semibold ${scoreClass(latestRun.overallScore)}`}
              >
                {latestRun.overallScore ?? "--"}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Run started:{" "}
                {new Date(latestRun.startedAt).toLocaleString()}{" "}
                {latestRun.finishedAt &&
                  `· Finished: ${new Date(
                    latestRun.finishedAt
                  ).toLocaleString()}`}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">Issues Open</div>
              <div className="text-lg font-semibold text-slate-100">
                {latestRun.issues.length}
              </div>
            </div>
          </div>

          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {(
                [
                  ["FREIGHT", "Freight & Logistics"],
                  ["HOTEL", "Hotels"],
                  ["BPO", "BPO"],
                  ["GLOBAL", "Security & Global"],
                ] as const
              ).map(([key, label]) => {
                const s = summary[key];
                return (
                  <div
                    key={key}
                    className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3"
                  >
                    <div className="text-[11px] text-slate-400 mb-1">
                      {label}
                    </div>
                    <div
                      className={`text-2xl font-semibold ${scoreClass(s?.score)}`}
                    >
                      {s?.score ?? "--"}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      {s?.totalIssues ?? 0} open ·{" "}
                      <span className="text-red-400">{s?.critical ?? 0}C</span>{" "}
                      <span className="text-orange-300">{s?.high ?? 0}H</span>{" "}
                      <span className="text-yellow-300">{s?.medium ?? 0}M</span>{" "}
                      <span className="text-slate-300">{s?.low ?? 0}L</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                Issues
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-[11px] text-left">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800">
                    <th className="py-2 pr-3">Module</th>
                    <th className="py-2 pr-3">Severity</th>
                    <th className="py-2 pr-3">Message</th>
                    <th className="py-2 pr-3">Target</th>
                    <th className="py-2 pr-3">Detected</th>
                  </tr>
                </thead>
                <tbody>
                  {latestRun.issues.map((i) => (
                    <tr
                      key={i.id}
                      className="border-b border-slate-900/60 hover:bg-slate-900/40"
                    >
                      <td className="py-1.5 pr-3 text-slate-200">
                        {i.module}
                      </td>
                      <td className="py-1.5 pr-3">
                        <span
                          className={
                            i.severity === "CRITICAL"
                              ? "text-red-400"
                              : i.severity === "HIGH"
                              ? "text-orange-300"
                              : i.severity === "MEDIUM"
                              ? "text-yellow-300"
                              : "text-slate-300"
                          }
                        >
                          {i.severity}
                        </span>
                      </td>
                      <td className="py-1.5 pr-3 text-slate-200 max-w-xs truncate">
                        {i.message}
                      </td>
                      <td className="py-1.5 pr-3 text-slate-400">
                        {i.targetType} · {i.targetId}
                      </td>
                      <td className="py-1.5 pr-3 text-slate-500">
                        {new Date(i.detectedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {latestRun.issues.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-3 text-center text-slate-500"
                      >
                        No issues detected in last audit.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!loading && !latestRun && !error && (
        <div className="text-xs text-slate-500">
          No audits have been run yet. Click &quot;Run Audit Now&quot; to create
          the first one.
        </div>
      )}
    </div>
  );
};

AuditPage.title = "Audit";

export default AuditPage;
