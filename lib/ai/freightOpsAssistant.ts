import { callFreightAssistant } from "@/lib/ai/aiClient";

export type FreightLogEntry = {
  endpoint: string;
  outcome: "start" | "success" | "error";
  requestId?: string;
  userId?: number | string;
  role?: string;
  errorCode?: string;
  durationMs?: number;
  timestamp?: string;
};

export type AnalyzeFreightLogsOptions = {
  recentLogSample: FreightLogEntry[];
  requestId?: string;
};

function buildFreightLogsPrompt(options: AnalyzeFreightLogsOptions): string {
  const { recentLogSample } = options;

  const lines: string[] = [];
  lines.push("You are an internal SRE assistant for freight APIs.");
  lines.push(
    "You will receive a small sample of structured freight_api logs and must highlight patterns only from that data.",
  );
  lines.push(
    "Do not invent endpoints or errors. Focus on most frequent failures, slow endpoints, and suggested next investigations.",
  );

  lines.push("\n[LOG_SAMPLE]");
  recentLogSample.slice(0, 100).forEach((entry, idx) => {
    const base = {
      i: idx,
      endpoint: entry.endpoint,
      outcome: entry.outcome,
      errorCode: entry.errorCode || null,
      durationMs: entry.durationMs ?? null,
    };
    lines.push(JSON.stringify(base));
  });

  lines.push("\nInstructions:");
  lines.push("- Output 3–6 bullet points.");
  lines.push("- Call out: top failing endpoints, common error codes, any obviously slow endpoints.");
  lines.push("- Suggest 1–3 concrete follow-up checks (e.g. inspect a specific handler, add a metric), without proposing code.");

  return lines.join("\n");
}

export async function analyzeFreightLogs(
  options: AnalyzeFreightLogsOptions,
): Promise<string> {
  const prompt = buildFreightLogsPrompt(options);

  const text = await callFreightAssistant({
    prompt,
    context: {
      sampleSize: options.recentLogSample.length,
    },
    requestId: options.requestId,
  });

  return text;
}

export { buildFreightLogsPrompt };
