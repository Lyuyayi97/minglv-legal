import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Citation, HealthPayload } from "./types";
import { isModelConfigured } from "./config";

const dbPath = join(process.cwd(), "data", "legal.sqlite");

type ArticleRow = {
  id: string;
  law_id: string;
  law_title: string;
  category: string;
  article_number: number | null;
  display_number: string;
  path_json: string;
  text: string;
  effective_date: string;
  status: string;
  source_url: string;
  score?: number | null;
};

let database: DatabaseSync | null = null;

export function legalDatabaseExists() {
  return existsSync(dbPath);
}

export function getLegalDb() {
  if (!legalDatabaseExists()) {
    throw new Error("Legal database is missing. Run `pnpm data:sync && pnpm data:build`.");
  }
  database ??= new DatabaseSync(dbPath, { readOnly: true });
  return database;
}

export function rowToCitation(row: ArticleRow): Citation {
  let path: string[] = [];
  try {
    path = JSON.parse(row.path_json);
  } catch {
    path = [];
  }
  return {
    articleId: row.id,
    lawId: row.law_id,
    lawTitle: row.law_title,
    category: row.category,
    articleNumber: row.article_number,
    displayNumber: row.display_number,
    path,
    text: row.text,
    effectiveDate: row.effective_date,
    status: row.status,
    sourceUrl: row.source_url,
    ...(row.score == null ? {} : { score: row.score }),
  };
}

export function getArticleById(articleId: string): Citation | null {
  const row = getLegalDb()
    .prepare("SELECT * FROM articles WHERE id = ?")
    .get(articleId) as ArticleRow | undefined;
  return row ? rowToCitation(row) : null;
}

export function getArticleByNumber(lawId: string, articleNumber: number): Citation | null {
  const row = getLegalDb()
    .prepare(
      "SELECT * FROM articles WHERE law_id = ? AND article_number = ? LIMIT 1",
    )
    .get(lawId, articleNumber) as ArticleRow | undefined;
  return row ? rowToCitation(row) : null;
}

export function findLawByMention(mention: string) {
  if (!mention.trim()) return null;
  const normalized = mention.replace(/^中华人民共和国/, "").trim();
  const rows = getLegalDb()
    .prepare(
      `SELECT id, title, category, effective_date, status
       FROM laws
       WHERE title = ? OR title = ? OR title LIKE ?
       ORDER BY CASE WHEN title = ? THEN 0 WHEN title = ? THEN 1 ELSE 2 END
       LIMIT 1`,
    )
    .all(
      mention,
      `中华人民共和国${normalized}`,
      `%${normalized}%`,
      mention,
      `中华人民共和国${normalized}`,
    ) as Array<{
    id: string;
    title: string;
    category: string;
    effective_date: string;
    status: string;
  }>;
  return rows[0] ?? null;
}

export function getHealthPayload(): HealthPayload {
  if (!legalDatabaseExists()) {
    return {
      database: "missing",
      lawCount: 0,
      articleCount: 0,
      sourceUpdated: "",
      modelConfigured: isModelConfigured(),
    };
  }

  try {
    const db = getLegalDb();
    const lawCount = Number(
      (db.prepare("SELECT COUNT(*) AS count FROM laws").get() as { count: number })
        .count,
    );
    const articleCount = Number(
      (
        db.prepare("SELECT COUNT(*) AS count FROM articles").get() as {
          count: number;
        }
      ).count,
    );
    const sourceUpdated = String(
      (
        db
          .prepare("SELECT value FROM metadata WHERE key = 'source_updated'")
          .get() as { value: string } | undefined
      )?.value ?? "",
    );
    return {
      database: "ready",
      lawCount,
      articleCount,
      sourceUpdated,
      modelConfigured: isModelConfigured(),
    };
  } catch {
    return {
      database: "error",
      lawCount: 0,
      articleCount: 0,
      sourceUpdated: "",
      modelConfigured: isModelConfigured(),
    };
  }
}
