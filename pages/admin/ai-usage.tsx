import { useState, useEffect } from "react";
import { GetServerSideProps } from "next";
import { Skeleton } from "@/components/ui/Skeleton";

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};

type UsageStat = {
  userId: number;
  userEmail: string;
  userName: string;
  endpoint: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  totalTokens: number;
  lastUsed: string;
};

type DailyStat = {
  date: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  uniqueUsers: number;
};

type ErrorStat = {
  errorType: string;
  count: number;
};

export default function AiUsagePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userStats, setUserStats] = useState<UsageStat[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [errorStats, setErrorStats] = useState<ErrorStat[]>([]);
  const [activeTab, setActiveTab] = useState<"users" | "daily" | "errors">("users");

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ai-usage");
      if (!res.ok) throw new Error("Failed to fetch AI usage stats");
      const data = await res.json();
      setUserStats(data.userStats || []);
      setDailyStats(data.dailyStats || []);
      setErrorStats(data.errorStats || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "users", label: "By User" },
    { id: "daily", label: "Daily Trends" },
    { id: "errors", label: "Errors" },
  ];

  return (
    <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Usage & Guardrails</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor AI API usage, rate limiting, and security events
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {userStats.reduce((sum, s) => sum + s.totalCalls, 0)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total AI Calls</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {userStats.reduce((sum, s) => sum + s.successfulCalls, 0)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Successful</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {userStats.reduce((sum, s) => sum + s.failedCalls, 0)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Failed / Blocked</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {userStats.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Active Users</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`px-4 py-3 text-sm font-medium ${
                    activeTab === tab.id
                      ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
          <Skeleton className="w-full h-[85vh]" />
          ) : (
            <div className="p-4">
              {activeTab === "users" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-2 text-gray-700 dark:text-gray-300">User</th>
                        <th className="text-left py-3 px-2 text-gray-700 dark:text-gray-300">Endpoint</th>
                        <th className="text-right py-3 px-2 text-gray-700 dark:text-gray-300">Total</th>
                        <th className="text-right py-3 px-2 text-gray-700 dark:text-gray-300">Success</th>
                        <th className="text-right py-3 px-2 text-gray-700 dark:text-gray-300">Failed</th>
                        <th className="text-right py-3 px-2 text-gray-700 dark:text-gray-300">Tokens</th>
                        <th className="text-right py-3 px-2 text-gray-700 dark:text-gray-300">Last Used</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userStats.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-gray-500 dark:text-gray-400">
                            No AI usage recorded yet
                          </td>
                        </tr>
                      ) : (
                        userStats.map((stat, i) => (
                          <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                            <td className="py-2 px-2 text-gray-900 dark:text-white">
                              <div className="font-medium">{stat.userName || "Unknown"}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{stat.userEmail}</div>
                            </td>
                            <td className="py-2 px-2 text-gray-700 dark:text-gray-300 font-mono text-xs">
                              {stat.endpoint}
                            </td>
                            <td className="py-2 px-2 text-right text-gray-900 dark:text-white">{stat.totalCalls}</td>
                            <td className="py-2 px-2 text-right text-green-600 dark:text-green-400">{stat.successfulCalls}</td>
                            <td className="py-2 px-2 text-right text-red-600 dark:text-red-400">{stat.failedCalls}</td>
                            <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-300">{stat.totalTokens.toLocaleString()}</td>
                            <td className="py-2 px-2 text-right text-gray-500 dark:text-gray-400 text-xs">
                              {new Date(stat.lastUsed).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === "daily" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-2 text-gray-700 dark:text-gray-300">Date</th>
                        <th className="text-right py-3 px-2 text-gray-700 dark:text-gray-300">Total Calls</th>
                        <th className="text-right py-3 px-2 text-gray-700 dark:text-gray-300">Successful</th>
                        <th className="text-right py-3 px-2 text-gray-700 dark:text-gray-300">Failed</th>
                        <th className="text-right py-3 px-2 text-gray-700 dark:text-gray-300">Unique Users</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyStats.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-500 dark:text-gray-400">
                            No daily stats available
                          </td>
                        </tr>
                      ) : (
                        dailyStats.map((stat, i) => (
                          <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                            <td className="py-2 px-2 text-gray-900 dark:text-white font-medium">
                              {new Date(stat.date).toLocaleDateString()}
                            </td>
                            <td className="py-2 px-2 text-right text-gray-900 dark:text-white">{stat.totalCalls}</td>
                            <td className="py-2 px-2 text-right text-green-600 dark:text-green-400">{stat.successfulCalls}</td>
                            <td className="py-2 px-2 text-right text-red-600 dark:text-red-400">{stat.failedCalls}</td>
                            <td className="py-2 px-2 text-right text-blue-600 dark:text-blue-400">{stat.uniqueUsers}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === "errors" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-2 text-gray-700 dark:text-gray-300">Error Type</th>
                        <th className="text-right py-3 px-2 text-gray-700 dark:text-gray-300">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {errorStats.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="py-8 text-center text-gray-500 dark:text-gray-400">
                            No errors recorded - great news!
                          </td>
                        </tr>
                      ) : (
                        errorStats.map((stat, i) => (
                          <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                            <td className="py-2 px-2 text-gray-900 dark:text-white font-mono">
                              {stat.errorType}
                            </td>
                            <td className="py-2 px-2 text-right text-red-600 dark:text-red-400 font-medium">
                              {stat.count}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
          <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">AI Guardrails Active</h3>
          <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
            <li>Rate Limiting: 10 requests per user per minute per endpoint</li>
            <li>Daily Limit: 100 AI calls per user per day</li>
            <li>Input Sanitization: Prompt injection patterns blocked</li>
            <li>Output Filtering: Sensitive data redacted from responses</li>
            <li>Audit Logging: All AI calls tracked with user, tokens, and outcome</li>
          </ul>
        </div>
    </div>
  );
}

AiUsagePage.title = "AI Usage & Guardrails";
