import { callFreightAssistant } from "@/lib/ai/aiClient";
import { findTemplateById, findToneById } from "@/lib/ai/templates";

export type BpoClientOutreachDraftType =
  | "cold_outreach"
  | "warm_followup"
  | "monthly_kpi"
  | "sla_review"
  | "appreciation";

export type GenerateBpoClientOutreachDraftOptions = {
  draftType: BpoClientOutreachDraftType;
  clientName: string;
  contextNotes?: string;
  templateId?: string;
  toneId?: string;
  userId: string | number;
  requestId?: string;
};

function buildBpoClientOutreachPrompt(
  opts: GenerateBpoClientOutreachDraftOptions,
): string {
  const { draftType, clientName, contextNotes, templateId, toneId } = opts;

  const template = findTemplateById(templateId);
  const tone = findToneById(toneId);

  const lines: string[] = [];

  lines.push("You are drafting an outreach message to a BPO client or prospect.");
  lines.push(
    "This is a draft for internal use by account/ops teams and will be reviewed before sending.",
  );

  lines.push("\nSafety rules:");
  lines.push("- Do NOT propose new pricing or discounts.");
  lines.push("- Do NOT change SLAs or contractual terms.");
  lines.push("- Do NOT mention that you are an AI or model.");

  if (template && template.domain === "bpo") {
    lines.push("\nTemplate guidance:");
    lines.push(`- Template: ${template.label}`);
    lines.push(`- Hint: ${template.hint}`);
  }

  if (tone) {
    lines.push("\nTone:");
    lines.push(`- ${tone.modifier}`);
  }

  lines.push("\nContext:");
  lines.push(`clientName: ${clientName}`);
  if (contextNotes) lines.push("contextNotes: " + contextNotes);

  lines.push("\nInstructions for this draft:");

  switch (draftType) {
    case "cold_outreach":
      lines.push(
        "- This is a cold outreach. Introduce the company, reference relevant capabilities, and suggest a short intro call.",
      );
      break;
    case "warm_followup":
      lines.push(
        "- This is a warm follow-up. Reference the last interaction in general terms and suggest next steps.",
      );
      break;
    case "monthly_kpi":
      lines.push(
        "- This is a monthly KPI communication. Speak in qualitative terms (e.g. 'above target', 'slightly below target') unless explicit numbers are provided elsewhere.",
      );
      break;
    case "sla_review":
      lines.push(
        "- This is an SLA review note. Ask to review performance and expectations, without committing to SLA changes.",
      );
      break;
    case "appreciation":
      lines.push("- This is an appreciation note. Emphasize partnership and continued collaboration.");
      break;
  }

  lines.push("- Keep the tone professional and client-friendly.");
  lines.push("- Keep to 3–7 sentences.");

  lines.push("\nNow draft the message body only (no subject line).");

  return lines.join("\n");
}

export async function generateBpoClientOutreachDraft(
  opts: GenerateBpoClientOutreachDraftOptions,
): Promise<string> {
  const prompt = buildBpoClientOutreachPrompt(opts);

  const text = await callFreightAssistant({
    prompt,
    context: opts,
    userId: String(opts.userId),
    requestId: opts.requestId,
  });

  return text;
}

export { buildBpoClientOutreachPrompt };
