import { generateCompletion } from "@/lib/ai/client";

// Narrow local shapes for simulation summarization.
// Kept separate from the engine types on purpose – we only need a small, read-only view.
export type SimulationSummaryLike = {
  totalAmount: number;
  totalUsers: number;
  totalDays: number;
};

export type SimulationResultLike = {
  summary: SimulationSummaryLike;
  perRole?: unknown;
};

export type SimulationDiffLike = {
  summary: unknown;
  perRole?: unknown;
};

// Types kept loose on purpose: we only need a few safe fields for summarization
export async function summarizeParentDashboard(input: {
  ventures: any[];
  alerts?: any[];
  period?: { from: string; to: string } | null;
}): Promise<string | null> {
  const { ventures, alerts = [], period } = input;

  const systemPrompt =
    "You are an assistant that summarizes cross-venture business metrics for a CEO. You must only use the JSON data provided. Do not invent numbers, ventures, or trends that are not explicitly present. Keep it to 3-5 concise sentences.";

  const userPayload = {
    period,
    ventures: ventures?.map((v) => ({
      id: v.id,
      name: v.name,
      type: v.type,
      health: v.health,
      metrics: v.metrics,
    })),
    alerts,
  };

  const userPrompt = JSON.stringify(userPayload);

  const text = await generateCompletion({
    systemPrompt,
    userPrompt,
    maxTokens: 220,
    temperature: 0.25,
  });

  return text;
}

export async function summarizeIncentiveSimulation(input: {
  mode: "current_plan" | "custom_rules" | "compare";
  baseline?: SimulationResultLike | null;
  simulated?: SimulationResultLike | null;
  diff?: SimulationDiffLike | null;
}): Promise<string | null> {
  const { mode, baseline, simulated, diff } = input;

  const systemPrompt =
    "You are an assistant that explains incentive simulations to managers. Using only the JSON data, describe who benefits, who loses, and the key payout changes in 2-4 sentences. Do not suggest changing any rules and do not invent data.";

  const userPayload: any = { mode };

  if (baseline) {
    userPayload.baseline = {
      summary: baseline.summary,
      perRole: baseline.perRole,
    };
  }
  if (simulated) {
    userPayload.simulated = {
      summary: simulated.summary,
      perRole: simulated.perRole,
    };
  }
  if (diff) {
    userPayload.diff = {
      summary: diff.summary,
      perRole: diff.perRole,
    };
  }

  const userPrompt = JSON.stringify(userPayload);

  const text = await generateCompletion({
    systemPrompt,
    userPrompt,
    maxTokens: 200,
    temperature: 0.3,
  });

  return text;
}
