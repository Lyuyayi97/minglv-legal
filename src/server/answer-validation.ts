import type {
  AnswerBasis,
  AnswerStatus,
  Citation,
  LegalAnswer,
} from "./types";

export type RawModelAnswer = {
  status?: unknown;
  conclusion?: unknown;
  premises?: unknown;
  analysis?: unknown;
  basis?: unknown;
  cautions?: unknown;
  followUps?: unknown;
};

const ALLOWED_STATUSES = new Set<AnswerStatus>([
  "answered",
  "needs_facts",
  "not_legal",
  "insufficient_sources",
]);

function cleanString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function cleanList(value: unknown, max = 6) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, max);
}

export function extractModelJson(text: string) {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Model did not return JSON.");
  return JSON.parse(trimmed.slice(start, end + 1)) as RawModelAnswer;
}

export function validateModelAnswer(
  raw: RawModelAnswer,
  question: string,
  candidates: Citation[],
): LegalAnswer {
  const candidateMap = new Map(
    candidates.map((citation) => [citation.articleId, citation]),
  );
  const basis: AnswerBasis[] = [];
  const seen = new Set<string>();

  if (Array.isArray(raw.basis)) {
    for (const item of raw.basis) {
      if (!item || typeof item !== "object") continue;
      const record = item as Record<string, unknown>;
      const articleId = cleanString(record.articleId);
      const article = candidateMap.get(articleId);
      if (!article || seen.has(articleId)) continue;
      seen.add(articleId);
      basis.push({
        articleId,
        point: cleanString(record.point, "这条法条支持了上面的结论。"),
        article,
      });
      if (basis.length >= 8) break;
    }
  }

  const requestedStatus = cleanString(raw.status) as AnswerStatus;
  let status: AnswerStatus = ALLOWED_STATUSES.has(requestedStatus)
    ? requestedStatus
    : "insufficient_sources";

  if (status === "answered" && basis.length === 0) {
    status = "insufficient_sources";
  }
  if (candidates.length === 0) {
    status = "insufficient_sources";
  }

  const conclusion =
    cleanString(raw.conclusion) ||
    (status === "insufficient_sources"
      ? "现有法条还不足以支持一个确定结论。"
      : "还需要补充一些情况，才能更准确地判断。");
  const cautions = cleanList(raw.cautions, 5);

  return {
    status,
    conclusion,
    premises: cleanList(raw.premises, 6),
    analysis: cleanList(raw.analysis, 8),
    basis,
    citations: candidates,
    cautions:
      cautions.length > 0
        ? cautions
        : ["以上内容根据现行法规文本整理，供理解和求助参考，不替代执业律师意见。"],
    followUps: cleanList(raw.followUps, 5),
    retrievalCount: candidates.length,
    modelConfigured: true,
    generatedAt: new Date().toISOString(),
  };
}
