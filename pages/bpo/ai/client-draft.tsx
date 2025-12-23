import React, { useState } from "react";
import type { NextPage } from "next";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const BpoClientDraftPage: NextPage = () => {
  const [clientName, setClientName] = useState("");
  const [contextNotes, setContextNotes] = useState("");
  const [draftType, setDraftType] = useState<
    "cold_outreach" | "warm_followup" | "monthly_kpi" | "sla_review" | "appreciation"
  >("cold_outreach");
  const [draft, setDraft] = useState("");
  const [templateId, setTemplateId] = useState<string>("");
  const [toneId, setToneId] = useState<string>("neutral");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setError(null);
    setDraft("");
    if (!clientName) {
      setError("Client name is required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/ai/bpo-client-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftType,
          clientName,
          contextNotes: contextNotes || undefined,
          templateId: templateId || undefined,
          toneId: toneId || undefined,
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
      // ignore clipboard errors
    }
  };

  return (
    
      <div className="max-w-3xl mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">BPO Client Outreach Draft</h1>
          <Badge variant="neutral" value="AI suggestion only — human must verify" />
        </div>

        <p className="text-sm text-gray-600">
          Generate a draft-only outreach message to a BPO client or prospect. This does not
          send any communication.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Client name</label>
            <Input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Acme Corp"
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
                    | "cold_outreach"
                    | "warm_followup"
                    | "monthly_kpi"
                    | "sla_review"
                    | "appreciation",
                )
              }
            >
              <option value="cold_outreach">Cold outreach</option>
              <option value="warm_followup">Warm follow-up</option>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-1">Template (optional)</label>
            <select
              className="border rounded-md px-3 py-2 text-sm w-full"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              <option value="">None</option>
              <option value="bpo_consultative_warm_followup">Consultative Warm Follow-up</option>
              <option value="bpo_monthly_kpi_recap">Monthly KPI Recap</option>
              <option value="bpo_light_outreach_casual_professional">
                Light Outreach (Casual-Professional)
              </option>
              <option value="bpo_sla_checkin">SLA Check-In</option>
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

              <option value="monthly_kpi">Monthly KPI communication</option>
              <option value="sla_review">SLA review</option>
              <option value="appreciation">Appreciation / thank-you</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Context notes</label>
          <textarea
            className="w-full border rounded-md px-3 py-2 text-sm min-h-[80px]"
            value={contextNotes}
            onChange={(e) => setContextNotes(e.target.value)}
            placeholder="Internal context for tone, recent history, etc."
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
};

export default BpoClientDraftPage;
