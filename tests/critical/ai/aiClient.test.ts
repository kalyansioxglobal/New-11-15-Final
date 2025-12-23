import { aiConfig } from "@/lib/config/ai";
import { AiDisabledError, callFreightAssistant } from "@/lib/ai/aiClient";

jest.mock("@/lib/config/ai", () => {
  return {
    aiConfig: {
      enabled: false,
      freightAssistantEnabled: false,
      freightAssistantModel: "test-model",
      maxTokensPerRequest: 100,
      maxDailyCalls: 10,
    },
  };
});

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
  },
}));

describe("aiClient", () => {
  it("throws AiDisabledError when flags are off", async () => {
    await expect(
      callFreightAssistant({ prompt: "test", context: {}, userId: "1" }),
    ).rejects.toBeInstanceOf(AiDisabledError);
  });

  it("enforces maxTokensPerRequest when enabled", async () => {
    (aiConfig as any).enabled = true;
    (aiConfig as any).freightAssistantEnabled = true;
    (aiConfig as any).maxTokensPerRequest = 10;

    await expect(
      callFreightAssistant({ prompt: "x".repeat(100), userId: "1" }),
    ).rejects.toThrow("AI_MAX_TOKENS_PER_REQUEST_EXCEEDED");
  });
});
