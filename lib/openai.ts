import OpenAI from "openai";

const OPENAI_TIMEOUT_MS = 30000;

if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY is not set - AI features will use fallback templates");
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy-key-for-initialization",
  timeout: OPENAI_TIMEOUT_MS,
  maxRetries: 2,
});

export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}
