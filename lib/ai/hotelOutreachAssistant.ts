import { callFreightAssistant } from "@/lib/ai/aiClient";
import { findTemplateById, findToneById } from "@/lib/ai/templates";

export type HotelOutreachDraftType =
  | "ota_parity_issue"
  | "rate_update_followup"
  | "performance_outreach"
  | "thank_you"
  | "escalation";

export type GenerateHotelOutreachDraftOptions = {
  draftType: HotelOutreachDraftType;
  propertyName: string;
  platform?: string; // OTA / channel, optional
  issueContext?: string; // e.g. parity discrepancy, rate mapping issue
  notes?: string; // internal hints
  templateId?: string;
  toneId?: string;
  userId: string | number;
  requestId?: string;
};

function buildHotelOutreachPrompt(opts: GenerateHotelOutreachDraftOptions): string {
  const { draftType, propertyName, platform, issueContext, notes, templateId, toneId } = opts;

  const template = findTemplateById(templateId);
  const tone = findToneById(toneId);

  const lines: string[] = [];
  lines.push("You are drafting a hotel partner outreach message.");
  lines.push(
    "This is a draft for internal use by revenue/ops teams and will be reviewed before sending.",
  );

  lines.push("\nSafety rules:");
  lines.push("- Do NOT propose or confirm rates, discounts, or pricing.");
  lines.push("- Do NOT change SLA, contracts, or guarantee outcomes.");
  lines.push("- Do NOT mention that you are an AI or model.");

  if (template && template.domain === "hotel") {
    lines.push("\nTemplate guidance:");
    lines.push(`- Template: ${template.label}`);
    lines.push(`- Hint: ${template.hint}`);
  }

  if (tone) {
    lines.push("\nTone:");
    lines.push(`- ${tone.modifier}`);
  }

  lines.push("\nContext:");
  lines.push(`propertyName: ${propertyName}`);
  if (platform) lines.push(`platform: ${platform}`);
  if (issueContext) lines.push(`issueContext: ${issueContext}`);
  if (notes) {
    lines.push("internalNotes: " + notes);
  }

  lines.push("\nInstructions for this draft:");

  switch (draftType) {
    case "ota_parity_issue":
      lines.push(
        "- This is an OTA parity issue outreach. Politely describe the discrepancy and ask for a review.",
      );
      break;
    case "rate_update_followup":
      lines.push(
        "- This is a follow-up after a rate update. Acknowledge changes without quoting numbers and ask if they see expected impact.",
      );
      break;
    case "performance_outreach":
      lines.push(
        "- This is a property performance outreach. Reference performance in qualitative terms only (e.g. 'recent soft weekends').",
      );
      break;
    case "thank_you":
      lines.push("- This is a thank-you / relationship note. Emphasize appreciation.");
      break;
    case "escalation":
      lines.push(
        "- This is an escalation draft. Be firm but respectful; request attention without making legal or contractual threats.",
      );
      break;
  }

  lines.push("- Keep the tone professional and collaborative.");
  lines.push("- Keep to 3–7 sentences.");

  lines.push("\nNow draft the message body only (no subject line).");

  return lines.join("\n");
}

export async function generateHotelOutreachDraft(
  opts: GenerateHotelOutreachDraftOptions,
): Promise<string> {
  const prompt = buildHotelOutreachPrompt(opts);

  const text = await callFreightAssistant({
    prompt,
    context: opts,
    userId: String(opts.userId),
    requestId: opts.requestId,
  });

  return text;
}

export { buildHotelOutreachPrompt };
