import { useState, useEffect } from "react";
import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};

type JobConfig = {
  id: string;
  name: string;
  description: string;
  apiPath: string;
  hasVentureFilter: boolean;
  hasDryRun: boolean;
};

type JobLog = {
  id: number;
  jobType: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  stats: Record<string, unknown> | null;
  errorMessage: string | null;
};

const JOBS: JobConfig[] = [
  {
    id: "quote-timeout",
    name: "Quote Timeout",
    description: "Marks quotes as expired/lost when they exceed the timeout threshold",
    apiPath: "/api/jobs/quote-timeout",
    hasVentureFilter: true,
    hasDryRun: true,
  },
  {
    id: "churn-recalc",
    name: "Churn Recalculation",
    description: "Recalculates shipper churn scores and risk levels",
    apiPath: "/api/jobs/churn-recalc",
    hasVentureFilter: true,
    hasDryRun: true,
  },
  {
    id: "task-generation",
    name: "Task Generation",
    description: "Auto-generates follow-up tasks based on EOD reports and customer activity",
    apiPath: "/api/jobs/task-generation",
    hasVentureFilter: true,
    hasDryRun: true,
  },
  {
    id: "incentive-daily",
    name: "Incentive Daily Commit",
    description: "Calculates and commits daily incentives for all active ventures. Idempotent - safe to run multiple times.",
    apiPath: "/api/jobs/incentive-daily",
    hasVentureFilter: true,
    hasDryRun: true,
  },
];

export default function AdminJobsPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { ok: boolean; stats?: Record<string, unknown>; error?: string; dryRun?: boolean }>>({});
  const [jobLogs, setJobLogs] = useState<JobLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [dryRun, setDryRun] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchJobLogs();
  }, []);

  const fetchJobLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch("/api/admin/jobs/logs");
      if (res.ok) {
        const data = await res.json();
        setJobLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to fetch job logs", err);
    } finally {
      setLogsLoading(false);
    }
  };

  const runJob = async (job: JobConfig) => {
    setLoading(job.id);
    setResults((prev) => ({ ...prev, [job.id]: undefined as any }));
    try {
      const res = await fetch(job.apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dryRun: dryRun[job.id] ?? false,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResults((prev) => ({ ...prev, [job.id]: { ok: true, stats: data.stats, dryRun: data.dryRun } }));
        fetchJobLogs();
      } else {
        setResults((prev) => ({ ...prev, [job.id]: { ok: false, error: data.error || "Job failed" } }));
      }
    } catch (err: unknown) {
      setResults((prev) => ({ ...prev, [job.id]: { ok: false, error: err instanceof Error ? err.message : "Network error" } }));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Jobs</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manually trigger background jobs or view recent job run history
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {JOBS.map((job) => (
          <div
            key={job.id}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">{job.name}</h3>
              <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                Manual Trigger
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{job.description}</p>

            {job.hasDryRun && (
              <label className="flex items-center gap-2 mb-4 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={dryRun[job.id] ?? false}
                  onChange={(e) => setDryRun((prev) => ({ ...prev, [job.id]: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
                />
                Dry run (preview changes without applying)
              </label>
            )}

            <button
              onClick={() => runJob(job)}
              disabled={loading === job.id}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
            >
              {loading === job.id ? "Running..." : "Run Now"}
            </button>

            {results[job.id] && (
              <div
                className={`mt-4 p-3 rounded-lg text-sm ${
                  results[job.id].ok
                    ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-300"
                    : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-300"
                }`}
              >
                {results[job.id].ok ? (
                  <div>
                    <div className="font-medium mb-1">
                      {results[job.id].dryRun ? "Dry Run Complete" : "Job Completed Successfully"}
                    </div>
                    {results[job.id].stats && (
                      <pre className="text-xs bg-white/50 dark:bg-black/20 p-2 rounded mt-2 overflow-x-auto">
                        {JSON.stringify(results[job.id].stats, null, 2)}
                      </pre>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="font-medium">Error</div>
                    <div>{results[job.id].error}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">Recent Job Runs</h2>
        </div>
        {logsLoading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading job history...</div>
        ) : jobLogs.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">No job runs recorded yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 font-medium">Job Type</th>
                  <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 font-medium">Started</th>
                  <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 font-medium">Duration</th>
                  <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 font-medium">Stats</th>
                </tr>
              </thead>
              <tbody>
                {jobLogs.map((log) => {
                  const duration =
                    log.startedAt && log.finishedAt
                      ? Math.round((new Date(log.finishedAt).getTime() - new Date(log.startedAt).getTime()) / 1000)
                      : null;
                  return (
                    <tr key={log.id} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">{log.jobType}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            log.status === "COMPLETED"
                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                              : log.status === "FAILED"
                              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                              : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400 text-xs">
                        {new Date(log.startedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {duration !== null ? `${duration}s` : "-"}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400 text-xs max-w-xs truncate">
                        {log.stats ? JSON.stringify(log.stats) : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
        <h3 className="font-medium text-amber-900 dark:text-amber-300 mb-2">Scheduled Jobs</h3>
        <p className="text-sm text-amber-800 dark:text-amber-400 mb-2">
          These jobs also run automatically on a schedule:
        </p>
        <ul className="text-sm text-amber-800 dark:text-amber-400 space-y-1 list-disc list-inside">
          <li>Churn Recalculation: Daily at 2:00 AM EST</li>
          <li>Quote Timeout: Daily at 6:00 AM EST</li>
          <li>Task Generation: Daily at 6:30 AM EST</li>
          <li>Incentive Daily Commit: Daily at 7:00 AM EST</li>
        </ul>
      </div>
    </div>
  );
}

AdminJobsPage.title = "System Jobs";
