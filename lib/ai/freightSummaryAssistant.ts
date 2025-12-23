import { callFreightAssistant } from "@/lib/ai/aiClient";

export type FreightSummaryMetricsInput = {
  windowDays: number;
  totalLoads: number;
  coveredRate: number; // 0–1
  avgMargin: number; // currency
  topLanes: { laneId?: string; origin: string; destination: string; loads: number }[];
  topShippers: { id: number; name: string; healthScore: number; riskLevel: string }[];
  topCarriers: { id: number; name: string; laneAffinityScore: number }[];
  topCsrs: { id: number; name: string; performanceScore: number }[];
};

export type FreightIntelligenceSnapshot = {
  laneRisk: {
    laneId?: string;
    score: number;
    riskLevel: string;
  }[];
  shipperHealth: {
    shipperId: number;
    score: number;
    riskLevel: string;
  }[];
  carrierSignals: {
    carrierId: number;
    laneAffinityScore: number;
    availabilityScore: number;
  }[];
  csrPerformance: {
    userId: number;
    score: number;
  }[];
};

export type GenerateFreightSummaryOptions = {
  userId: string | number;
  requestId?: string;
  metrics: FreightSummaryMetricsInput;
  intelligence: FreightIntelligenceSnapshot;
};

// Build a compact, structured prompt summarizing freight metrics and
// intelligence signals, without asking the model to invent numbers.
function buildFreightSummaryPrompt(
  options: GenerateFreightSummaryOptions,
): string {
  const { metrics, intelligence } = options;

  const lines: string[] = [];

  lines.push("You are an internal freight analyst.");
  lines.push(
    "Summarize the current freight situation in concise bullet points for leadership.",
  );
  lines.push(
    "You must NOT invent new numbers. Only explain patterns and priorities based on the data below.",
  );

  lines.push("\n[WINDOW]");
  lines.push(`windowDays: ${metrics.windowDays}`);
  lines.push(
    `totalLoads: ${metrics.totalLoads}, coveredRate: ${(
      metrics.coveredRate * 100
    ).toFixed(1)}%, avgMargin: ${metrics.avgMargin.toFixed(2)}`,
  );

  lines.push("\n[TOP_LANES]");
  metrics.topLanes.slice(0, 5).forEach((l) => {
    lines.push(
      `- ${l.origin} -> ${l.destination}: ${l.loads} loads (laneId: ${
        l.laneId || "n/a"
      })`,
    );
  });

  lines.push("\n[TOP_SHIPPERS]");
  metrics.topShippers.slice(0, 5).forEach((s) => {
    lines.push(
      `- ${s.name} (id=${s.id}): healthScore=${s.healthScore}, riskLevel=${s.riskLevel}`,
    );
  });

  lines.push("\n[TOP_CARRIERS]");
  metrics.topCarriers.slice(0, 5).forEach((c) => {
    lines.push(
      `- ${c.name} (id=${c.id}): laneAffinityScore=${c.laneAffinityScore}`,
    );
  });

  lines.push("\n[TOP_CSRS]");
  metrics.topCsrs.slice(0, 5).forEach((c) => {
    lines.push(
      `- ${c.name} (id=${c.id}): performanceScore=${c.performanceScore}`,
    );
  });

  lines.push("\n[LANE_RISK]");
  intelligence.laneRisk.slice(0, 5).forEach((lr) => {
    lines.push(
      `- laneId=${lr.laneId || "n/a"}: riskScore=${lr.score}, riskLevel=$
{lr.riskLevel}`,
    );
  });

  lines.push("\n[SHIPPER_HEALTH]");
  intelligence.shipperHealth.slice(0, 5).forEach((s) => {
    lines.push(
      `- shipperId=${s.shipperId}: score=${s.score}, riskLevel=${s.riskLevel}`,
    );
  });

  lines.push("\n[CSR_PERFORMANCE]");
  intelligence.csrPerformance.slice(0, 5).forEach((c) => {
    lines.push(`- userId=${c.userId}: score=${c.score}`);
  });

  lines.push("\nInstructions:");
  lines.push("- Output 4–7 bullet points.");
  lines.push("- Highlight: top risky lanes, shippers to watch, carriers to nurture, CSRs to coach or praise.");
  lines.push("- Do not propose any automated actions or contact; keep it advisory only.");

  return lines.join("\n");
}

export async function generateFreightSummary(
  options: GenerateFreightSummaryOptions,
): Promise<string> {
  const prompt = buildFreightSummaryPrompt(options);

  const text = await callFreightAssistant({
    prompt,
    context: {
      metrics: options.metrics,
      intelligence: options.intelligence,
    },
    userId: String(options.userId),
    requestId: options.requestId,
  });

  return text;
}

// Exported only for tests; not used directly by callers.
export { buildFreightSummaryPrompt };
