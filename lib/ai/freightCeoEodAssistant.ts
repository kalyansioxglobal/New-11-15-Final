import { callFreightAssistant } from "@/lib/ai/aiClient";
import { findTemplateById, findToneById } from "@/lib/ai/templates";

export type FreightCeoEodDraftType =
  | "daily_summary"
  | "csr_performance"
  | "freight_intelligence"
  | "risk_overview";

export type FreightCeoEodMetrics = {
  windowLabel: string; // e.g. "today", "last 7 days"
  totalLoads?: number;
  coveredRate?: number; // 0–1
  avgMargin?: number;
  topLanes?: { laneId?: string; origin: string; destination: string; loads: number }[];
  topShippers?: { id: number; name: string; healthScore?: number; riskLevel?: string }[];
  topCarriers?: { id: number; name: string; riskLevel?: string }[];
  topCsrs?: { id: number; name: string; performanceScore?: number }[];
};

export type FreightCeoEodIntelligence = {
  laneRisk?: { laneId?: string; score: number; riskLevel: string }[];
  shipperHealth?: { shipperId: number; score: number; riskLevel: string }[];
  csrPerformance?: { userId: number; score: number }[];
};

export type GenerateFreightCeoEodDraftOptions = {
  draftType: FreightCeoEodDraftType;
  metrics: FreightCeoEodMetrics;
  intelligence?: FreightCeoEodIntelligence;
  templateId?: string;
  toneId?: string;
  userId: string | number;
  requestId?: string;
};

function buildFreightCeoEodPrompt(opts: GenerateFreightCeoEodDraftOptions): string {
  const { draftType, metrics, intelligence, templateId, toneId } = opts;
  const lines: string[] = [];

  const template = findTemplateById(templateId);
  const tone = findToneById(toneId);

  lines.push("You are drafting an internal freight EOD summary for the CEO/leadership.");
  lines.push(
    "This draft will be reviewed and possibly edited by leadership before sharing. Do not invent numbers.",
  );

  lines.push("\nSafety rules:");
  lines.push("- Do NOT invent or guess numbers.");
  lines.push("- Do NOT propose commitments, pricing, or contractual language.");
  lines.push("- Do NOT mention that you are an AI or model.");

  if (template && template.domain === "freight") {
    lines.push("\nTemplate guidance:");
    lines.push(`- Template: ${template.label}`);
    lines.push(`- Hint: ${template.hint}`);
  }

  if (tone) {
    lines.push("\nTone:");
    lines.push(`- ${tone.modifier}`);
  }

  lines.push("\n[WINDOW]");
  lines.push(`windowLabel: ${metrics.windowLabel}`);
  if (metrics.totalLoads != null)
    lines.push(`totalLoads: ${metrics.totalLoads}`);
  if (metrics.coveredRate != null)
    lines.push(`coveredRate: ${(metrics.coveredRate * 100).toFixed(1)}%`);
  if (metrics.avgMargin != null)
    lines.push(`avgMargin: ${metrics.avgMargin.toFixed(2)}`);

  if (metrics.topLanes?.length) {
    lines.push("\n[TOP_LANES]");
    metrics.topLanes.slice(0, 5).forEach((lane) => {
      lines.push(
        `- ${lane.origin} -> ${lane.destination}: ${lane.loads} loads (laneId: ${
          lane.laneId || "n/a"
        })`,
      );
    });
  }

  if (metrics.topShippers?.length) {
    lines.push("\n[TOP_SHIPPERS]");
    metrics.topShippers.slice(0, 5).forEach((s) => {
      lines.push(
        `- ${s.name} (id=${s.id}): healthScore=${s.healthScore ?? "n/a"}, riskLevel=${
          s.riskLevel ?? "unknown"
        }`,
      );
    });
  }

  if (metrics.topCarriers?.length) {
    lines.push("\n[TOP_CARRIERS]");
    metrics.topCarriers.slice(0, 5).forEach((c) => {
      lines.push(`- ${c.name} (id=${c.id}): riskLevel=${c.riskLevel ?? "unknown"}`);
    });
  }

  if (metrics.topCsrs?.length) {
    lines.push("\n[TOP_CSRS]");
    metrics.topCsrs.slice(0, 5).forEach((c) => {
      lines.push(
        `- ${c.name} (id=${c.id}): performanceScore=${c.performanceScore ?? "n/a"}`,
      );
    });
  }

  if (intelligence?.laneRisk?.length) {
    lines.push("\n[LANE_RISK]");
    intelligence.laneRisk.slice(0, 5).forEach((lr) => {
      lines.push(
        `- laneId=${lr.laneId || "n/a"}: riskScore=${lr.score}, riskLevel=${
          lr.riskLevel
        }`,
      );
    });
  }

  if (intelligence?.shipperHealth?.length) {
    lines.push("\n[SHIPPER_HEALTH]");
    intelligence.shipperHealth.slice(0, 5).forEach((s) => {
      lines.push(`- shipperId=${s.shipperId}: score=${s.score}, risk=${s.riskLevel}`);
    });
  }

  if (intelligence?.csrPerformance?.length) {
    lines.push("\n[CSR_PERFORMANCE]");
    intelligence.csrPerformance.slice(0, 5).forEach((c) => {
      lines.push(`- userId=${c.userId}: score=${c.score}`);
    });
  }

  lines.push("\nInstructions:");
  lines.push("- Output 5–10 bullet points.");
  lines.push("- Focus on patterns, risks, and highlights that matter to leadership.");

  if (draftType === "daily_summary") {
    lines.push("- Emphasize overall performance today and key changes vs recent baseline.");
  } else if (draftType === "csr_performance") {
    lines.push("- Emphasize CSR performance highlights and coaching opportunities.");
  } else if (draftType === "freight_intelligence") {
    lines.push("- Emphasize lanes, shippers, and carriers that stand out in the intelligence.");
  } else if (draftType === "risk_overview") {
    lines.push("- Emphasize risks: lanes, shippers, carriers that may require attention.");
  }

  return lines.join("\n");
}

export async function generateFreightCeoEodDraft(
  opts: GenerateFreightCeoEodDraftOptions,
): Promise<string> {
  const prompt = buildFreightCeoEodPrompt(opts);

  const text = await callFreightAssistant({
    prompt,
    context: {
      metrics: opts.metrics,
      intelligence: opts.intelligence,
      draftType: opts.draftType,
      templateId: opts.templateId,
      toneId: opts.toneId,
    },
    userId: String(opts.userId),
    requestId: opts.requestId,
  });

  return text;
}

export { buildFreightCeoEodPrompt };
