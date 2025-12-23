import React, { useState } from "react";

export default function RunTab() {
  const today = new Date();
  const yesterday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - 1
  );

  const [date, setDate] = useState<string>(
    yesterday.toISOString().slice(0, 10)
  );
  const [scope, setScope] = useState<"freight" | "bpo" | "both">("both");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    setLoading(true);
    setStatus("Running incentives…");
    try {
      const res = await fetch("/api/incentives/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, scope }),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus(`Error: ${json.error || "Failed to run incentives"}`);
      } else {
        setStatus(
          `Success: Ran incentives for ${json.date} [${json.scope}] – rowsWritten=${json.rowsWritten}.`
        );
      }
    } catch (e: any) {
      setStatus(`Error: ${e?.message || "Failed to run incentives"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-gray-500">
          Admin-only tool to trigger daily incentive calculations for Freight and BPO.
        </p>
      </div>

      <div className="rounded border border-gray-200 bg-white p-4 space-y-3 max-w-md">
        <div className="space-y-1">
          <div className="text-xs text-gray-600">Date</div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </div>

        <div className="space-y-1">
          <div className="text-xs text-gray-600">Scope</div>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as any)}
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
          >
            <option value="freight">Freight</option>
            <option value="bpo">BPO</option>
            <option value="both">Both</option>
          </select>
        </div>

        <button
          onClick={handleRun}
          disabled={loading}
          className="px-3 py-1.5 rounded bg-black text-white text-xs disabled:opacity-60"
        >
          {loading ? "Running…" : "Run incentives"}
        </button>

        {status && (
          <div className="text-xs text-gray-700 mt-2">{status}</div>
        )}
      </div>
    </div>
  );
}
