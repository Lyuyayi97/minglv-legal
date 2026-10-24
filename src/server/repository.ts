import { getLegalDb, rowToCitation } from "./db";
import { escapeLike } from "./legal-text";
import type { Citation } from "./types";

export function searchLawTitles(query: string, limit = 8) {
  const normalized = query.trim();
  if (!normalized) return [];
  return getLegalDb()
    .prepare(
      `SELECT id, title, category, effective_date, status, article_count
       FROM laws
       WHERE title LIKE ? ESCAPE '\\'
       ORDER BY
         CASE WHEN title = ? THEN 0
              WHEN title LIKE ? ESCAPE '\\' THEN 1
              ELSE 2 END,
         length(title)
       LIMIT ?`,
    )
    .all(
      `%${escapeLike(normalized)}%`,
      normalized,
      `${escapeLike(normalized)}%`,
      limit,
    ) as Array<{
    id: string;
    title: string;
    category: string;
    effective_date: string;
    status: string;
    article_count: number;
  }>;
}

export function searchArticleText(query: string, limit = 12): Citation[] {
  const token = query.trim().slice(0, 40);
  if (token.length < 2) return [];
  const rows = getLegalDb()
    .prepare(
      `SELECT * FROM articles
       WHERE text LIKE ? ESCAPE '\\' OR law_title LIKE ? ESCAPE '\\'
       ORDER BY
         CASE WHEN law_title LIKE ? ESCAPE '\\' THEN 0 ELSE 1 END,
         length(text)
       LIMIT ?`,
    )
    .all(
      `%${escapeLike(token)}%`,
      `%${escapeLike(token)}%`,
      `%${escapeLike(token)}%`,
      limit,
    ) as Parameters<typeof rowToCitation>[0][];
  return rows.map(rowToCitation);
}
