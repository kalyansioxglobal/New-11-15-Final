import { callFreightAssistant } from "@/lib/ai/aiClient";
import { findTemplateById, findToneById } from "@/lib/ai/templates";

export type CarrierOutreachDraftType =
  | "inquiry"
  | "coverage_request"
  | "relationship";

export type GenerateCarrierDraftOptions = {
  draftType: CarrierOutreachDraftType;
  carrierName: string;
  lane: { origin: string; destination: string };
  load: {
    pickupDate?: string;
    weight?: number;
    equipment?: string;
    commodity?: string;
  };
  contextNotes?: string;
  templateId?: string;
  toneId?: string;
  contactRole?: "carrier_owner" | "dispatcher";
  dispatcherName?: string;
  dispatcherEmail?: string;
  userId: string | number;
  requestId?: string;
};

function buildCarrierDraftPrompt(opts: GenerateCarrierDraftOptions): string {
  const {
    draftType,
    carrierName,
    lane,
    load,
    contextNotes,
    templateId,
    toneId,
    contactRole,
    dispatcherName,
    dispatcherEmail,
  } = opts;

  const template = findTemplateById(templateId);
  const tone = findToneById(toneId);

  const lines: string[] = [];

  lines.push("You are drafting an internal-only carrier outreach message.");
  lines.push(
    "This text will be reviewed and edited by a human dispatcher/CSR before sending.",
  );
  lines.push("\nSafety rules (must follow exactly):");
  lines.push("- Do NOT tell me what I 'should send'. Simply draft the message text.");
  lines.push("- Do NOT mention that you are an AI or model.");
  lines.push("- Do NOT propose discounts, rates, promises, or contractual commitments.");
  lines.push(
    "- Do NOT include any wording that implies an offer is guaranteed or binding.",
  );
  lines.push(
    "- Do NOT automatically email or send anything; this text is for human review only.",
  );

  const effectiveContactRole = contactRole || "carrier_owner";

  if (effectiveContactRole === "dispatcher") {
    lines.push("\nContact target:");
    if (dispatcherName) {
      lines.push(
        `- This message is addressed to the dispatcher ${dispatcherName} at the carrier.`,
      );
    } else {
      lines.push("- This message is addressed to the dispatcher at the carrier.");
    }
    if (dispatcherEmail) {
      lines.push(`- Dispatcher email (for context only): ${dispatcherEmail}`);
    }
  } else {
    lines.push("\nContact target:");
    lines.push("- This message is addressed to the carrier owner or primary contact.");
  }

  if (template && template.domain === "freight") {
    lines.push("\nTemplate guidance:");
    lines.push(`- Template: ${template.label}`);
    lines.push(`- Hint: ${template.hint}`);
  }

  if (tone) {
    lines.push("\nTone:");
    lines.push(`- ${tone.modifier}`);
  }

  lines.push("\nContext:");
  lines.push(`draftType: ${draftType}`);
  lines.push(`carrierName: ${carrierName}`);
  lines.push(`lane: ${lane.origin} -> ${lane.destination}`);

  const loadParts: string[] = [];
  if (load.pickupDate) loadParts.push(`pickupDate: ${load.pickupDate}`);
  if (load.weight != null) loadParts.push(`weight: ${load.weight}`);
  if (load.equipment) loadParts.push(`equipment: ${load.equipment}`);
  if (load.commodity) loadParts.push(`commodity: ${load.commodity}`);
  if (loadParts.length > 0) {
    lines.push("loadDetails: " + loadParts.join(", "));
  }

  if (contextNotes) {
    lines.push("\nInternal notes (for tone/context, not to be copied verbatim if sensitive):");
    lines.push(contextNotes);
  }

  lines.push("\nInstructions for the draft:");
  lines.push("- Keep it concise (3–6 sentences).\n- Be professional, clear, and friendly.");

  if (draftType === "inquiry") {
    lines.push(
      "- This is a lane availability inquiry. Ask if they have capacity on this lane and timing.",
    );
  } else if (draftType === "coverage_request") {
    lines.push(
      "- This is a coverage request for a specific load. Mention basic details (date, lane, equipment) without quoting rates.",
    );
  } else if (draftType === "relationship") {
    lines.push(
      "- This is a relationship follow-up. Thank them for prior work if applicable and express interest in future collaboration.",
    );
  }

  lines.push(
    "- Do not add any pricing or rate amounts. If you need to refer to pricing, use generic wording like 'competitive pricing'.",
  );

  lines.push("\nNow draft the message body only (no subject line).");

  return lines.join("\n");
}

export async function generateCarrierOutreachDraft(
  opts: GenerateCarrierDraftOptions,
): Promise<string> {
  const prompt = buildCarrierDraftPrompt(opts);

  const text = await callFreightAssistant({
    prompt,
    context: opts,
    userId: String(opts.userId),
    requestId: opts.requestId,
  });

  return text;
}

export { buildCarrierDraftPrompt };
