import { isOpenAIConfigured, openai } from "@/lib/openai";

export type GenerateCompletionOptions = {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
};

export async function generateCompletion({
  systemPrompt,
  userPrompt,
  maxTokens = 400,
  temperature = 0.3,
}: GenerateCompletionOptions): Promise<string | null> {
  if (!isOpenAIConfigured()) {
    console.warn("OpenAI is not configured; returning null AI completion.");
    return null;
  }

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature,
    });

    const rawContent = response.choices[0]?.message?.content as string | string[] | null;
    if (!rawContent) return null;

    if (typeof rawContent === "string") {
      return rawContent.trim();
    }

    // Fallback for array-style content (e.g. content parts)
    return rawContent.join(" ").trim();
  } catch (err) {
    console.error("AI completion error", err);
    return null;
  }
}
