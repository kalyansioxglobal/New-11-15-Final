import React, { useState } from "react";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function EodDraftTab() {
  const [windowLabel, setWindowLabel] = useState("today");
  const [notes, setNotes] = useState("");
  const [draftType, setDraftType] = useState<
    "daily_summary" | "csr_performance" | "freight_intelligence" | "risk_overview"
  >("daily_summary");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [templateId, setTemplateId] = useState<string>("");
  const [toneId, setToneId] = useState<string>("neutral");

  const handleGenerate = async () => {
    setError(null);
    setDraft("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/freight-eod-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftType,
          metrics: { windowLabel },
          intelligence: {},
          templateId: templateId || undefined,
          toneId: toneId || undefined,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to generate draft.");
        return;
      }

      setDraft(data.draft || "");
    } catch (err) {
      setError("Unexpected error while generating draft.");
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
        <h2 className="text-xl font-semibold">CEO EOD Draft</h2>
        <Badge variant="neutral" value="AI suggestion only — human must verify" />
      </div>

      <p className="text-sm text-gray-600">
        Generate a draft-only EOD summary for freight leadership. This endpoint does not
        send anything; it only returns text for human review.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Window label</label>
          <Input
            value={windowLabel}
            onChange={(e) => setWindowLabel(e.target.value)}
            placeholder="today / last 7 days"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Draft type</label>
          <select
            className="border rounded-md px-3 py-2 text-sm w-full"
            value={draftType}
            onChange={(e) =>
              setDraftType(
                e.target.value as
                  | "daily_summary"
                  | "csr_performance"
                  | "freight_intelligence"
                  | "risk_overview",
              )
            }
          >
            <option value="daily_summary">Daily summary</option>
            <option value="csr_performance">CSR performance notes</option>
            <option value="freight_intelligence">Freight intelligence snapshot</option>
            <option value="risk_overview">Risk overview</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Template (optional)</label>
          <select
            className="border rounded-md px-3 py-2 text-sm w-full"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
          >
            <option value="">None</option>
            <option value="freight_leadership_snapshot">Leadership Performance Snapshot</option>
            <option value="freight_risk_focus">Risk-Focused Overview</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Tone (optional)</label>
          <select
            className="border rounded-md px-3 py-2 text-sm w-full"
            value={toneId}
            onChange={(e) => setToneId(e.target.value)}
          >
            <option value="neutral">Neutral</option>
            <option value="friendly">Friendly</option>
            <option value="professional_firm">Professional &amp; Firm</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Optional notes</label>
        <textarea
          className="w-full border rounded-md px-3 py-2 text-sm min-h-[80px]"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Internal notes or emphasis points for this summary."
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <Button onClick={handleGenerate} disabled={loading}>
          {loading ? "Generating..." : "Generate Draft"}
        </Button>
        {draft && (
          <Button type="button" variant="secondary" onClick={handleCopy}>
            Copy draft
          </Button>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Draft output</label>
        <textarea
          className="w-full border rounded-md px-3 py-2 text-sm min-h-[200px] bg-gray-50"
          value={draft}
          readOnly
        />
      </div>
    </div>
  );
}
