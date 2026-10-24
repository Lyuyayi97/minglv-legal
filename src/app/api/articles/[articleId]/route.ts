import { getArticleById } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ articleId: string }> },
) {
  const { articleId } = await context.params;
  const article = getArticleById(decodeURIComponent(articleId));
  if (!article) {
    return Response.json({ error: "未找到该条文。" }, { status: 404 });
  }
  return Response.json(article, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
