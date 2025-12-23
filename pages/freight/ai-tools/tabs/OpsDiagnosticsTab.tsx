import React, { useState } from "react";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function OpsDiagnosticsTab() {
  const [logCount, setLogCount] = useState("100");
  const [logJson, setLogJson] = useState("[]");
  const [draftType, setDraftType] = useState<
    "sre_summary" | "error_clusters" | "slow_endpoints"
  >("sre_summary");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setError(null);
    setDraft("");

    let sample: any[] = [];
    try {
      sample = JSON.parse(logJson || "[]");
      if (!Array.isArray(sample)) throw new Error("not array");
    } catch {
      setError("recentLogSample must be valid JSON array.");
      return;
    }

    const max = Number(logCount) || 100;
    const truncated = sample.slice(0, max);

    setLoading(true);
    try {
      const res = await fetch("/api/ai/freight-ops-diagnostics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftType,
          recentLogSample: truncated,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to generate diagnostics.");
        return;
      }
      setDraft(data.diagnosticsDraft || "");
    } catch (err) {
      setError("Unexpected error while generating diagnostics.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft);
    } catch {
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Ops Diagnostics</h2>
        <Badge variant="neutral" value="AI suggestion only — human must verify" />
      </div>

      <p className="text-sm text-gray-600">
        Paste a small sample of structured freight_api-style logs to get an SRE-style
        diagnostic draft. This tool does not change any systems.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Draft type</label>
          <select
            className="border rounded-md px-3 py-2 text-sm w-full"
            value={draftType}
            onChange={(e) =>
              setDraftType(
                e.target.value as "sre_summary" | "error_clusters" | "slow_endpoints",
              )
            }
          >
            <option value="sre_summary">SRE summary</option>
            <option value="error_clusters">Error clusters</option>
            <option value="slow_endpoints">Slow endpoints</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Log count</label>
          <Input
            value={logCount}
            onChange={(e) => setLogCount(e.target.value)}
            placeholder="100"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">recentLogSample (JSON array)</label>
        <textarea
          className="w-full border rounded-md px-3 py-2 text-sm min-h-[160px]"
          value={logJson}
          onChange={(e) => setLogJson(e.target.value)}
          placeholder='[{"endpoint":"/api/x","outcome":"error","errorCode":"E123","durationMs":450}, ...]'
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <Button onClick={handleGenerate} disabled={loading}>
          {loading ? "Generating..." : "Generate Diagnostics"}
        </Button>
        {draft && (
          <Button type="button" variant="secondary" onClick={handleCopy}>
            Copy draft
          </Button>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Diagnostics draft</label>
        <textarea
          className="w-full border rounded-md px-3 py-2 text-sm min-h-[200px] bg-gray-50"
          value={draft}
          readOnly
        />
      </div>
    </div>
  );
}
