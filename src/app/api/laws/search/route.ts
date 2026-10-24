import { searchArticleText, searchLawTitles } from "@/server/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  if (query.length < 1) {
    return Response.json({ laws: [], articles: [] });
  }
  if (query.length > 80) {
    return Response.json({ error: "检索内容过长。" }, { status: 400 });
  }

  return Response.json(
    {
      laws: searchLawTitles(query, 8),
      articles: searchArticleText(query, 10),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
