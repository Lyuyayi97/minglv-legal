import { getChatCompletionsUrl, getModelConfig, isModelConfigured } from "./config";
import {
  extractModelJson,
  validateModelAnswer,
  type RawModelAnswer,
} from "./answer-validation";
import type { Citation, LegalAnswer } from "./types";

export type ConversationTurn = {
  question: string;
  conclusion: string;
};

type ModelResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  error?: { message?: string };
};

export function buildUnconfiguredAnswer(candidates: Citation[]): LegalAnswer {
  return {
    status: "not_configured",
    conclusion: "相关法条已经找到了，暂时还不能生成通俗解释。",
    premises: [],
    analysis: [],
    basis: [],
    citations: candidates,
    cautions: [],
    followUps: [],
    retrievalCount: candidates.length,
    modelConfigured: false,
    generatedAt: new Date().toISOString(),
  };
}

export function buildNoEvidenceAnswer(candidates: Citation[] = []): LegalAnswer {
  return {
    status: "insufficient_sources",
    conclusion: "当前没有检索到足以支持确定结论的法规条文。",
    premises: [],
    analysis: [
      "可以补充行为发生地、时间、主体关系、争议金额以及已经收到的书面材料。",
    ],
    basis: [],
    citations: candidates,
    cautions: ["未检索到依据时不作推测性法律结论。"],
    followUps: [
      "请补充事情发生的时间、地点和双方关系。",
      "是否已有合同、通知、聊天记录或行政机关文书？",
    ],
    retrievalCount: candidates.length,
    modelConfigured: isModelConfigured(),
    generatedAt: new Date().toISOString(),
  };
}

function buildPrompt(
  question: string,
  candidates: Citation[],
  history: ConversationTurn[],
) {
  const sources = candidates.map((citation) => ({
    articleId: citation.articleId,
    lawTitle: citation.lawTitle,
    displayNumber: citation.displayNumber,
    path: citation.path,
    effectiveDate: citation.effectiveDate,
    text: citation.text,
  }));

  return [
    {
      role: "system",
      content: `你是“明律”法律科普与求助助手，服务对象是没有法律专业背景的普通人。

必须遵守：
1. 只依据用户问题和 sources 中的法条回答，不得使用未提供的法律依据，不得编造条号、法规名称或 articleId。
2. 每个实质法律结论必须在 basis 中给出至少一个 sources 里的 articleId。
3. 如果事实不足，status 使用 needs_facts，并列出真正影响判断的补充问题。
4. 如果问题不属于法律咨询，status 使用 not_legal，不作法律分析。
5. 如果 sources 不足以支持结论，status 使用 insufficient_sources，不作猜测。
6. 先用普通话说结论，再解释法律依据，最后给出可以采取的下一步。避免堆砌法言法语；必须使用法律术语时，顺手解释它的意思。
7. 不制造恐慌，不夸大权利，不承诺诉讼结果。涉及人身安全、刑事风险、即将超过期限或被起诉时，提醒尽快寻求律师或 12348 公共法律服务。
8. 只返回一个 JSON 对象，不要使用 Markdown 代码块。

JSON 结构：
{
  "status": "answered | needs_facts | not_legal | insufficient_sources",
  "conclusion": "用普通人能听懂的话说结论",
  "premises": ["还需要用户确认的关键情况"],
  "analysis": ["通俗解释法律怎么规定，以及为什么会影响用户"],
  "basis": [{"articleId": "只能使用 sources 中的值", "point": "该条支持什么判断"}],
  "cautions": ["边界与风险"],
  "followUps": ["用户可以继续追问的问题"]
}`,
    },
    {
      role: "user",
      content: JSON.stringify({
        question,
        recentConversation: history.slice(-4),
        sources,
      }),
    },
  ];
}

async function requestModel(
  question: string,
  candidates: Citation[],
  history: ConversationTurn[],
) {
  const config = getModelConfig();
  if (!isModelConfigured(config)) throw new Error("MODEL_NOT_CONFIGURED");

  const endpoint = getChatCompletionsUrl(config.baseUrl);
  const body = {
    model: config.model,
    temperature: 0.1,
    messages: buildPrompt(question, candidates, history),
    response_format: { type: "json_object" },
  };

  const call = async (withResponseFormat: boolean) => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(
        withResponseFormat
          ? body
          : {
              model: body.model,
              temperature: body.temperature,
              messages: body.messages,
            },
      ),
      signal: AbortSignal.timeout(60_000),
    });
    return response;
  };

  let response = await call(true);
  if (!response.ok && response.status === 400) {
    response = await call(false);
  }
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`MODEL_REQUEST_FAILED:${response.status}:${detail.slice(0, 300)}`);
  }

  const payload = (await response.json()) as ModelResponse;
  const content = payload.choices?.[0]?.message?.content;
  const text =
    typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content.map((item) => item.text ?? "").join("")
        : "";
  if (!text.trim()) throw new Error("MODEL_EMPTY_RESPONSE");
  return extractModelJson(text);
}

export async function answerLegalQuestion(
  question: string,
  candidates: Citation[],
  history: ConversationTurn[] = [],
): Promise<LegalAnswer> {
  if (!isModelConfigured()) return buildUnconfiguredAnswer(candidates);
  if (candidates.length === 0) return buildNoEvidenceAnswer();
  const raw = await requestModel(question, candidates, history);
  return validateModelAnswer(raw, question, candidates);
}
