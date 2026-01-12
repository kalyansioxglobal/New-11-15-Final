import React, { useState } from "react";
import type { NextPage } from "next";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const HotelOutreachDraftPage: NextPage = () => {
  const [propertyName, setPropertyName] = useState("");
  const [platform, setPlatform] = useState("");
  const [issueContext, setIssueContext] = useState("");
  const [notes, setNotes] = useState("");
  const [draftType, setDraftType] = useState<
    "ota_parity_issue" | "rate_update_followup" | "performance_outreach" | "thank_you" | "escalation"
  >("ota_parity_issue");
  const [draft, setDraft] = useState("");
  const [templateId, setTemplateId] = useState<string>("");
  const [toneId, setToneId] = useState<string>("neutral");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setError(null);
    setDraft("");
    if (!propertyName) {
      setError("Property name is required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/ai/hotel-outreach-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftType,
          propertyName,
          platform: platform || undefined,
          issueContext: issueContext || undefined,
          notes: notes || undefined,
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
          <h1 className="text-2xl font-semibold">Hotel Outreach Draft</h1>
          <Badge variant="neutral" value="AI suggestion only — human must verify" />
        </div>

        <p className="text-sm text-gray-600">
          Generate a draft-only outreach message to a hotel partner. This does not send any
          communication.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Property name</label>
            <Input
              value={propertyName}
              onChange={(e) => setPropertyName(e.target.value)}
              placeholder="Hotel Sunrise"
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
                    | "ota_parity_issue"
                    | "rate_update_followup"
                    | "performance_outreach"
                    | "thank_you"
                    | "escalation",
                )
              }
            >
              <option value="ota_parity_issue">OTA parity issue</option>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-1">Template (optional)</label>
            <select
              className="border rounded-md px-3 py-2 text-sm w-full"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              <option value="">None</option>
              <option value="hotel_parity_soft_escalation">Parity Issue Escalation (Soft)</option>
              <option value="hotel_ota_followup_neutral">OTA Follow-up (Neutral)</option>
              <option value="hotel_partner_appreciation_warm">Partner Appreciation (Warm)</option>
              <option value="hotel_performance_checkin">Performance Check-In</option>
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

              <option value="rate_update_followup">Rate update follow-up</option>
              <option value="performance_outreach">Performance outreach</option>
              <option value="thank_you">Thank-you / relationship</option>
              <option value="escalation">Escalation</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Platform (OTA/channel)</label>
            <Input
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              placeholder="Booking.com, Expedia, ..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Issue context</label>
            <Input
              value={issueContext}
              onChange={(e) => setIssueContext(e.target.value)}
              placeholder="Parity mismatch on weekend rates, mapping issue, etc."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Internal notes</label>
          <textarea
            className="w-full border rounded-md px-3 py-2 text-sm min-h-[80px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional internal context (not necessarily copied verbatim)."
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-3">
          <Button onClick={handleGenerate} disabled={loading} className="btn">
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

export default HotelOutreachDraftPage;
