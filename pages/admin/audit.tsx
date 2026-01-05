import React, { useEffect, useState } from "react";
import { PageWithLayout } from "@/types/page";
import type { AuditRunSummary, LatestAuditResponse } from "@/lib/audit/types";
import { GetServerSideProps } from "next";
import { Skeleton } from "@/components/ui/Skeleton";

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};

function scoreClass(score: number | null | undefined): string {
  if (score == null) return "text-gray-500 dark:text-gray-400";
  if (score >= 90) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 75) return "text-yellow-600 dark:text-yellow-300";
  return "text-red-600 dark:text-red-400";
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
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Command Center Audit
          </h1>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Internal health & data quality checks for Freight, Hotels, BPO &
            Security.
          </p>
        </div>
        <button
          onClick={runAuditNow}
          disabled={running}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            running
              ? "bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-500 text-white"
          }`}
        >
          {running ? "Running…" : "Run Audit Now"}
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/50 rounded-lg px-3 py-2 bg-red-50 dark:bg-red-950/40">
          {error}
        </div>
      )}

      {loading && !latestRun && (
       <Skeleton className="w-full h-[85vh]" />
      )}

      {latestRun && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950/70 p-4 flex items-center justify-between shadow-sm">
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Overall Audit Score</div>
              <div
                className={`text-3xl font-semibold ${scoreClass(latestRun.overallScore)}`}
              >
                {latestRun.overallScore ?? "--"}
              </div>
              <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-500">
                Run started:{" "}
                {new Date(latestRun.startedAt).toLocaleString()}{" "}
                {latestRun.finishedAt &&
                  `· Finished: ${new Date(
                    latestRun.finishedAt
                  ).toLocaleString()}`}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-600 dark:text-gray-400">Issues Open</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
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
                    className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950/70 p-3 shadow-sm"
                  >
                    <div className="text-[11px] text-gray-600 dark:text-gray-400 mb-1">
                      {label}
                    </div>
                    <div
                      className={`text-2xl font-semibold ${scoreClass(s?.score)}`}
                    >
                      {s?.score ?? "--"}
                    </div>
                    <div className="mt-1 text-[11px] text-gray-600 dark:text-gray-500">
                      {s?.totalIssues ?? 0} open ·{" "}
                      <span className="text-red-600 dark:text-red-400 font-medium">{s?.critical ?? 0}C</span>{" "}
                      <span className="text-orange-600 dark:text-orange-300 font-medium">{s?.high ?? 0}H</span>{" "}
                      <span className="text-yellow-600 dark:text-yellow-300 font-medium">{s?.medium ?? 0}M</span>{" "}
                      <span className="text-gray-600 dark:text-gray-300 font-medium">{s?.low ?? 0}L</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950/70 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Issues
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-[11px] text-left">
                <thead>
                  <tr className="text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                    <th className="py-2 pr-3 font-semibold">Module</th>
                    <th className="py-2 pr-3 font-semibold">Severity</th>
                    <th className="py-2 pr-3 font-semibold">Message</th>
                    <th className="py-2 pr-3 font-semibold">Target</th>
                    <th className="py-2 pr-3 font-semibold">Detected</th>
                  </tr>
                </thead>
                <tbody>
                  {latestRun.issues.map((i) => (
                    <tr
                      key={i.id}
                      className="border-b border-gray-100 dark:border-gray-900/60 hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors"
                    >
                      <td className="py-1.5 pr-3 text-gray-900 dark:text-gray-200">
                        {i.module}
                      </td>
                      <td className="py-1.5 pr-3">
                        <span
                          className={`font-medium ${
                            i.severity === "CRITICAL"
                              ? "text-red-600 dark:text-red-400"
                              : i.severity === "HIGH"
                              ? "text-orange-600 dark:text-orange-300"
                              : i.severity === "MEDIUM"
                              ? "text-yellow-600 dark:text-yellow-300"
                              : "text-gray-600 dark:text-gray-300"
                          }`}
                        >
                          {i.severity}
                        </span>
                      </td>
                      <td className="py-1.5 pr-3 text-gray-900 dark:text-gray-200 max-w-xs truncate">
                        {i.message}
                      </td>
                      <td className="py-1.5 pr-3 text-gray-600 dark:text-gray-400">
                        {i.targetType} · {i.targetId}
                      </td>
                      <td className="py-1.5 pr-3 text-gray-500 dark:text-gray-500">
                        {new Date(i.detectedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {latestRun.issues.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-3 text-center text-gray-600 dark:text-gray-500"
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
        <div className="text-xs text-gray-600 dark:text-gray-500">
          No audits have been run yet. Click &quot;Run Audit Now&quot; to create
          the first one.
        </div>
      )}
    </div>
  );
};

AuditPage.title = "Audit";

export default AuditPage;
