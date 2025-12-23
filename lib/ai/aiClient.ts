import { logger } from "@/lib/logger";
import { aiConfig } from "@/lib/config/ai";

export class AiDisabledError extends Error {
  constructor(message = "AI assistant is disabled by configuration") {
    super(message);
    this.name = "AiDisabledError";
  }
}

export type FreightAssistantCallOptions = {
  prompt: string;
  context?: Record<string, unknown>;
  userId?: string | number;
  requestId?: string;
};

function estimateTokens(text: string): number {
  // Very rough heuristic: 4 characters per token
  return Math.ceil(text.length / 4);
}

async function callProvider(
  options: FreightAssistantCallOptions & { model: string },
): Promise<string> {
  const { prompt, context, userId, requestId } = options;
  const { model } = options;

  // Check if OpenAI is configured
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiApiKey) {
    // Fallback to stub if no API key is configured
    const disabledMessage =
      "AI assistant is configured but provider is not wired yet. Please set OPENAI_API_KEY environment variable.";
    logger.warn("ai_call_no_key", {
      feature: "freight_internal_assistant",
      model,
      requestId,
      userId,
    });
    return disabledMessage + "\n\nPrompt preview: " + prompt.slice(0, 400);
  }

  try {
    // Import OpenAI dynamically to avoid errors if package is not installed
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: openaiApiKey });

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: 'You are a freight logistics assistant. Provide helpful, accurate, and concise responses about freight operations, load management, carrier matching, and logistics best practices.',
      },
      {
        role: 'user',
        content: context
          ? `${prompt}\n\nContext: ${JSON.stringify(context, null, 2)}`
          : prompt,
      },
    ];

    const response = await openai.chat.completions.create({
      model: model || 'gpt-4o-mini',
      messages,
      max_tokens: aiConfig.maxTokensPerRequest,
      temperature: 0.7,
    });

    const result = response.choices[0]?.message?.content || 'No response from AI provider';
    
    logger.info("ai_call_success", {
      feature: "freight_internal_assistant",
      model,
      tokensUsed: response.usage?.total_tokens || 0,
      requestId,
      userId,
    });

    return result;
  } catch (err: any) {
    logger.error("ai_call_error", {
      feature: "freight_internal_assistant",
      model,
      error: err.message || String(err),
      requestId,
      userId,
    });

    // Fallback to stub on error
    const errorMessage = `AI provider error: ${err.message || 'Unknown error'}. Falling back to stub response.`;
    return errorMessage + "\n\nPrompt preview: " + prompt.slice(0, 400);
  }
}

export async function callFreightAssistant(
  options: FreightAssistantCallOptions,
): Promise<string> {
  const { prompt, context, userId, requestId } = options;

  if (!aiConfig.enabled || !aiConfig.freightAssistantEnabled) {
    throw new AiDisabledError();
  }

  const estimatedTokens = estimateTokens(prompt);
  if (estimatedTokens > aiConfig.maxTokensPerRequest) {
    throw new Error("AI_MAX_TOKENS_PER_REQUEST_EXCEEDED");
  }

  const model = aiConfig.freightAssistantModel;

  logger.info("ai_call", {
    feature: "freight_internal_assistant",
    model,
    estimatedTokens,
    requestId,
    userId,
  });

  const result = await callProvider({ ...options, model });
  return result;
}
