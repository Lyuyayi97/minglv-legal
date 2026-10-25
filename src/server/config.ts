import { EMBEDDED_MODEL_CONFIG } from "./embedded-config";

const trimEnd = (value: string) => value.replace(/\/+$/, "");

export type ModelConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

export function getModelConfig(): ModelConfig {
  return {
    baseUrl: trimEnd(
      process.env.LEGAL_LLM_BASE_URL?.trim() ||
        EMBEDDED_MODEL_CONFIG.baseUrl,
    ),
    apiKey:
      process.env.LEGAL_LLM_API_KEY?.trim() ||
      EMBEDDED_MODEL_CONFIG.apiKey,
    model:
      process.env.LEGAL_LLM_MODEL?.trim() ||
      EMBEDDED_MODEL_CONFIG.model,
  };
}

export function isModelConfigured(config = getModelConfig()) {
  return Boolean(config.baseUrl && config.apiKey && config.model);
}

export function getChatCompletionsUrl(baseUrl: string) {
  const normalized = trimEnd(baseUrl);
  if (normalized.endsWith("/chat/completions")) return normalized;
  return `${normalized}/chat/completions`;
}
