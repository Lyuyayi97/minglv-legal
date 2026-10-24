import { answerLegalQuestion, type ConversationTurn } from "@/server/legal-answer";
import { retrieveArticles } from "@/server/retrieval";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AskBody = {
  question?: unknown;
  history?: unknown;
};

function parseHistory(value: unknown): ConversationTurn[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item) => ({
      question: typeof item.question === "string" ? item.question.slice(0, 500) : "",
      conclusion:
        typeof item.conclusion === "string" ? item.conclusion.slice(0, 800) : "",
    }))
    .filter((item) => item.question)
    .slice(-4);
}

export async function POST(request: Request) {
  let body: AskBody;
  try {
    body = (await request.json()) as AskBody;
  } catch {
    return Response.json({ error: "请求格式不正确。" }, { status: 400 });
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (question.length < 2) {
    return Response.json({ error: "请说明你要研究的具体问题。" }, { status: 400 });
  }
  if (question.length > 2000) {
    return Response.json({ error: "问题请控制在 2000 字以内。" }, { status: 400 });
  }

  try {
    const candidates = retrieveArticles(question);
    const answer = await answerLegalQuestion(
      question,
      candidates,
      parseHistory(body.history),
    );
    return Response.json(answer, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const isModelError = message.startsWith("MODEL_");
    return Response.json(
      {
        error: isModelError
          ? "模型接口调用失败，请检查 .env.local 中的 API 配置和服务状态。"
          : "法规检索失败，请确认本地法规库已构建。",
        code: message.slice(0, 120),
      },
      { status: isModelError ? 502 : 500 },
    );
  }
}
