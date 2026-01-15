import { createOpenAI } from "@ai-sdk/openai";

export interface AIProviderConfig {
  provider: string;
  apiKey: string;
  baseUrl?: string;
  modelName: string;
}

export function createAIProvider(config: AIProviderConfig) {
  if (config.provider === "openai") {
    const openai = createOpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl && config.baseUrl.trim() ? config.baseUrl : undefined,
    });
    return openai(config.modelName);
  }

  throw new Error(`Unsupported provider: ${config.provider}`);
}
