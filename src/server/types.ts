export type AnswerStatus =
  | "answered"
  | "needs_facts"
  | "not_legal"
  | "insufficient_sources"
  | "not_configured";

export type Citation = {
  articleId: string;
  lawId: string;
  lawTitle: string;
  category: string;
  articleNumber: number | null;
  displayNumber: string;
  path: string[];
  text: string;
  effectiveDate: string;
  status: string;
  sourceUrl: string;
  score?: number;
};

export type AnswerBasis = {
  articleId: string;
  point: string;
  article: Citation;
};

export type LegalAnswer = {
  status: AnswerStatus;
  conclusion: string;
  premises: string[];
  analysis: string[];
  basis: AnswerBasis[];
  citations: Citation[];
  cautions: string[];
  followUps: string[];
  retrievalCount: number;
  modelConfigured: boolean;
  generatedAt: string;
};

export type HealthPayload = {
  database: "ready" | "missing" | "error";
  lawCount: number;
  articleCount: number;
  sourceUpdated: string;
  modelConfigured: boolean;
};
