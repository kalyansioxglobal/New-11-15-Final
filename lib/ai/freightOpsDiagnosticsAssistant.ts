import { callFreightAssistant } from "@/lib/ai/aiClient";

export type FreightOpsDiagnosticsDraftType =
  | "sre_summary"
  | "error_clusters"
  | "slow_endpoints";

export type FreightOpsDiagnosticsLogEntry = {
  endpoint: string;
  outcome: "start" | "success" | "error";
  errorCode?: string;
  durationMs?: number;
};

export type GenerateFreightOpsDiagnosticsDraftOptions = {
  draftType: FreightOpsDiagnosticsDraftType;
  recentLogSample: FreightOpsDiagnosticsLogEntry[];
  userId: string | number;
  requestId?: string;
};

function buildFreightOpsDiagnosticsPrompt(
  opts: GenerateFreightOpsDiagnosticsDraftOptions,
): string {
  const { draftType, recentLogSample } = opts;
  const lines: string[] = [];

  lines.push("You are an internal SRE/ops assistant for the freight platform.");
  lines.push(
    "You will receive a sample of structured freight_api-like logs and must highlight patterns only from that data.",
  );
  lines.push("Do not invent endpoints, error codes, or metrics that are not present.");

  lines.push("\n[LOG_SAMPLE]");
  recentLogSample.slice(0, 300).forEach((entry, idx) => {
    const row = {
      i: idx,
      endpoint: entry.endpoint,
      outcome: entry.outcome,
      errorCode: entry.errorCode || null,
      durationMs: entry.durationMs ?? null,
    };
    lines.push(JSON.stringify(row));
  });

  lines.push("\nInstructions:");
  lines.push("- Output 4–8 bullet points.");
  lines.push(
    "- Focus on surfacing the most common failing endpoints, error patterns, and obviously slow endpoints based on durationMs.",
  );
  lines.push(
    "- Suggest 1–3 human follow-up checks (e.g. 'inspect handler X', 'add metric Y'), without proposing code or deploy commands.",
  );

  if (draftType === "error_clusters") {
    lines.push("- Emphasize repeated error codes and the endpoints where they appear.");
  } else if (draftType === "slow_endpoints") {
    lines.push("- Emphasize endpoints with high durationMs values.");
  } else if (draftType === "sre_summary") {
    lines.push("- Provide a balanced overview: errors, slowness, and any surprising patterns.");
  }

  return lines.join("\n");
}

export async function generateFreightOpsDiagnosticsDraft(
  opts: GenerateFreightOpsDiagnosticsDraftOptions,
): Promise<string> {
  const prompt = buildFreightOpsDiagnosticsPrompt(opts);

  const text = await callFreightAssistant({
    prompt,
    context: { sampleSize: opts.recentLogSample.length, draftType: opts.draftType },
    userId: String(opts.userId),
    requestId: opts.requestId,
  });

  return text;
}

export { buildFreightOpsDiagnosticsPrompt };
