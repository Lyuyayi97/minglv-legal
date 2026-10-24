const trimEnd = (value: string) => value.replace(/\/+$/, "");

export type ModelConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

export function getModelConfig(): ModelConfig {
  return {
    baseUrl: trimEnd(process.env.LEGAL_LLM_BASE_URL?.trim() ?? ""),
    apiKey: process.env.LEGAL_LLM_API_KEY?.trim() ?? "",
    model: process.env.LEGAL_LLM_MODEL?.trim() ?? "",
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
