import { useState } from "react";
import { GetServerSideProps } from "next";
import { getEffectiveUser } from "@/lib/effectiveUser";
import toast from "react-hot-toast";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { req, res } = ctx;
  const user = await getEffectiveUser(req, res);

  if (!user) {
    return {
      redirect: { destination: "/login", permanent: false },
    };
  }

  if (user.role !== "CEO" && user.role !== "ADMIN") {
    return {
      redirect: { destination: "/overview", permanent: false },
    };
  }

  return { props: {} };
};

type CleanupResult = {
  success: boolean;
  message: string;
  details?: Record<string, number>;
  error?: string;
};

export default function AdminCleanupPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CleanupResult | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [preview, setPreview] = useState<Record<string, number> | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const handleCleanup = async () => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    if (confirmText !== "DELETE_ALL_TEST_DATA") {
      toast.error("Confirmation text must be exactly: DELETE_ALL_TEST_DATA");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/cleanup-test-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE_ALL_TEST_DATA" }),
      });

      const data = await res.json();

      if (res.ok) {
        const totalDeleted = data.details ? Object.values(data.details).reduce((a: number, b: number) => a + b, 0) : 0;
        
        // Check if anything was actually deleted
        if (totalDeleted === 0) {
          setResult({
            success: true,
            message: "Cleanup completed, but no test data was found to delete. The database may already be clean.",
            details: data.details,
          });
          toast.success("No test data found to clean. Database is already clean.");
        } else {
          setResult({
            success: true,
            message: data.message,
            details: data.details,
          });
          toast.success(data.message || "Test data cleanup completed successfully");
        }
        setShowConfirm(false);
        setConfirmText("");
      } else {
        // Show clear error message
        const errorMsg = data.error || data.message || "Cleanup failed";
        setResult({
          success: false,
          message: errorMsg,
          error: errorMsg,
        });
        toast.error(errorMsg);
        
        // If disabled in production, show helpful message
        if (res.status === 403 && errorMsg.includes("production")) {
          console.error("Cleanup blocked: Running in production environment");
        }
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to cleanup test data";
      setResult({
        success: false,
        message: errorMessage,
        error: errorMessage,
      });
      toast.error(errorMessage);
      console.error("Cleanup error:", err);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setShowConfirm(false);
    setConfirmText("");
    setResult(null);
    setPreview(null);
  };

  const loadPreview = async () => {
    setLoadingPreview(true);
    try {
      const res = await fetch("/api/admin/cleanup-test-data?preview=true");
      const data = await res.json();
      if (res.ok && data.preview) {
        setPreview(data.preview);
      } else {
        toast.error("Failed to load preview");
      }
    } catch (err: any) {
      toast.error("Failed to load preview: " + err.message);
    } finally {
      setLoadingPreview(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          Database Cleanup
        </h1>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          Permanently delete all test data from the database. This action cannot be undone.
        </p>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-yellow-600 dark:text-yellow-400 text-lg">⚠️</div>
          <div className="flex-1 space-y-2 text-sm text-yellow-800 dark:text-yellow-200">
            <p className="font-semibold">Warning: Destructive Operation</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>This will permanently delete ALL records with <code className="bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded">isTest: true</code> or <code className="bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded">isTestUser: true</code></li>
              <li>All production data (isTest: false) will be preserved</li>
              <li>This action cannot be undone</li>
              <li>Make sure you have a database backup before proceeding</li>
            </ul>
          </div>
        </div>
      </div>

      {!showConfirm ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Cleanup Test Data
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This will delete all test data including:
              </p>
              <ul className="mt-2 text-sm text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1 ml-2">
                <li>Test ventures, offices, and users</li>
                <li>Test policies, tasks, and attendance records</li>
                <li>Test loads, customers, and logistics data</li>
                <li>Test incentives, gamification, and BPO data</li>
                <li>Test hotel properties and related data</li>
                <li>All related test records across all tables</li>
              </ul>
            </div>

            {preview && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
                  Preview: Test data that will be deleted
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  {Object.entries(preview)
                    .filter(([_, count]) => count > 0)
                    .map(([key, count]) => (
                      <div
                        key={key}
                        className="bg-white dark:bg-gray-800 rounded border border-blue-200 dark:border-blue-700 p-2"
                      >
                        <div className="font-medium text-gray-900 dark:text-white">
                          {key}
                        </div>
                        <div className="text-blue-600 dark:text-blue-400">
                          {count} records
                        </div>
                      </div>
                    ))}
                </div>
                {Object.values(preview).reduce((a, b) => a + b, 0) === 0 && (
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                    No test data found. Database is already clean.
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={loadPreview}
                disabled={loadingPreview || loading}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingPreview ? "Loading..." : "Preview Test Data"}
              </button>
              <button
                onClick={handleCleanup}
                disabled={loading}
                className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-colors ${
                  loading
                    ? "bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700 dark:hover:bg-red-500 text-white"
                }`}
              >
                {loading ? "Cleaning up..." : "Start Cleanup"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-800 p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
                Confirm Cleanup
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Type <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-mono text-sm">DELETE_ALL_TEST_DATA</code> to confirm:
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE_ALL_TEST_DATA"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                disabled={loading}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCleanup}
                disabled={loading || confirmText !== "DELETE_ALL_TEST_DATA"}
                className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-colors ${
                  loading || confirmText !== "DELETE_ALL_TEST_DATA"
                    ? "bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700 dark:hover:bg-red-500 text-white"
                }`}
              >
                {loading ? "Cleaning up..." : "Confirm & Cleanup"}
              </button>
              <button
                onClick={reset}
                disabled={loading}
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div
          className={`rounded-xl border p-6 ${
            result.success
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`text-lg ${
                result.success
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {result.success ? "✅" : "❌"}
            </div>
            <div className="flex-1">
              <h3
                className={`font-semibold mb-2 ${
                  result.success
                    ? "text-green-800 dark:text-green-200"
                    : "text-red-800 dark:text-red-200"
                }`}
              >
                {result.success ? "Cleanup Completed" : "Cleanup Failed"}
              </h3>
              <p
                className={`text-sm mb-3 ${
                  result.success
                    ? "text-green-700 dark:text-green-300"
                    : "text-red-700 dark:text-red-300"
                }`}
              >
                {result.message}
              </p>

              {result.details && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Deleted Records:
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
                    {Object.entries(result.details).map(([key, count]) => (
                      <div
                        key={key}
                        className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-2"
                      >
                        <div className="font-medium text-gray-900 dark:text-white">
                          {key}
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">
                          {count} deleted
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Total:{" "}
                      {Object.values(result.details).reduce(
                        (a, b) => a + b,
                        0
                      )}{" "}
                      records deleted
                    </p>
                  </div>
                </div>
              )}

              {result.error && (
                <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                  Error: {result.error}
                </p>
              )}

              <button
                onClick={reset}
                className="mt-4 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

