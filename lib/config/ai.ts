export type AiConfig = {
  enabled: boolean;
  freightAssistantEnabled: boolean;
  freightAssistantModel: string;
  maxTokensPerRequest: number;
  maxDailyCalls: number;
};

// Central AI configuration, sourced from environment variables.
// All defaults are conservative and effectively keep AI disabled
// unless explicitly turned on in the environment.
export const aiConfig: AiConfig = {
  enabled: process.env.AI_ENABLED === "true",
  freightAssistantEnabled:
    process.env.AI_ASSISTANT_FREIGHT_ENABLED === "true",
  freightAssistantModel:
    process.env.AI_MODEL_FREIGHT_ASSISTANT || "gpt-4.1-mini", // safe default name, overridable
  maxTokensPerRequest: Number(process.env.AI_MAX_TOKENS_PER_REQUEST || 2048),
  maxDailyCalls: Number(process.env.AI_MAX_DAILY_CALLS || 100),
};
