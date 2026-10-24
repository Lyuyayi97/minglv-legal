import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync, mkdirSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = join(
  root,
  "data",
  "corpus",
  "chinese-law-corpus-master",
  "laws",
);
const dbPath = join(root, "data", "legal.sqlite");

if (!statSync(sourceDir, { throwIfNoEntry: false })?.isDirectory()) {
  throw new Error("Corpus not found. Run `pnpm data:sync` first.");
}

mkdirSync(dirname(dbPath), { recursive: true });
rmSync(dbPath, { force: true });
rmSync(`${dbPath}-shm`, { force: true });
rmSync(`${dbPath}-wal`, { force: true });

const db = new DatabaseSync(dbPath);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA temp_store = MEMORY;

  CREATE TABLE laws (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    issuing_authority TEXT,
    promulgation_date TEXT,
    effective_date TEXT,
    status TEXT NOT NULL,
    article_count INTEGER NOT NULL,
    source_url TEXT NOT NULL
  );

  CREATE TABLE articles (
    id TEXT PRIMARY KEY,
    law_id TEXT NOT NULL,
    law_title TEXT NOT NULL,
    category TEXT NOT NULL,
    article_number INTEGER,
    display_number TEXT NOT NULL,
    path_json TEXT NOT NULL,
    text TEXT NOT NULL,
    effective_date TEXT,
    status TEXT NOT NULL,
    source_url TEXT NOT NULL
  );

  CREATE INDEX articles_law_id_idx ON articles(law_id);
  CREATE INDEX articles_article_number_idx ON articles(law_id, article_number);

  CREATE VIRTUAL TABLE article_fts USING fts5(
    id UNINDEXED,
    law_id UNINDEXED,
    law_title,
    display_number,
    path_json,
    text,
    tokenize = 'trigram',
    content = 'articles',
    content_rowid = 'rowid'
  );

  CREATE TABLE metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

const insertLaw = db.prepare(`
  INSERT INTO laws (
    id, title, category, issuing_authority, promulgation_date,
    effective_date, status, article_count, source_url
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertArticle = db.prepare(`
  INSERT INTO articles (
    id, law_id, law_title, category, article_number, display_number,
    path_json, text, effective_date, status, source_url
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertFts = db.prepare(`
  INSERT INTO article_fts (
    rowid, id, law_id, law_title, display_number, path_json, text
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const files = readdirSync(sourceDir)
  .filter((name) => name.endsWith(".json") && name !== "index.json")
  .sort();

let lawCount = 0;
let articleCount = 0;
const sources = new Set();

db.exec("BEGIN IMMEDIATE");

try {
  for (const [index, fileName] of files.entries()) {
    const law = JSON.parse(readFileSync(join(sourceDir, fileName), "utf8"));
    if (!law?.id || !Array.isArray(law.articles)) continue;

    const sourceUrl = "https://flk.npc.gov.cn/";
    insertLaw.run(
      law.id,
      law.title,
      law.category || "法律",
      law.issuingAuthority || "",
      law.promulgationDate || "",
      law.effectiveDate || "",
      law.status || "effective",
      law.articles.length,
      sourceUrl,
    );

    sources.add(sourceUrl);
    lawCount += 1;

    for (const article of law.articles) {
      if (!article?.id || !article?.text) continue;
      const path = Array.isArray(article.path) ? article.path.join(" / ") : "";
      const inserted = insertArticle.run(
        article.id,
        law.id,
        law.title,
        law.category || "法律",
        article.articleNumber ?? null,
        article.displayNumber || "",
        JSON.stringify(article.path || []),
        article.text,
        law.effectiveDate || "",
        law.status || "effective",
        sourceUrl,
      );
      insertFts.run(
        inserted.lastInsertRowid,
        article.id,
        law.id,
        law.title,
        article.displayNumber || "",
        path,
        article.text,
      );
      articleCount += 1;
    }

    if ((index + 1) % 150 === 0) {
      console.log(`Indexed ${index + 1}/${files.length} documents...`);
    }
  }

  const setMeta = db.prepare("INSERT INTO metadata (key, value) VALUES (?, ?)");
  setMeta.run("built_at", new Date().toISOString());
  setMeta.run("source", "lttxzmj/chinese-law-corpus");
  setMeta.run("source_updated", "2026-10-21");
  setMeta.run("law_count", String(lawCount));
  setMeta.run("article_count", String(articleCount));

  db.exec("COMMIT");
  db.exec("ANALYZE");
  db.exec("INSERT INTO article_fts(article_fts) VALUES ('optimize')");
  db.exec("VACUUM");
  db.exec("PRAGMA journal_mode = DELETE");
} catch (error) {
  db.exec("ROLLBACK");
  throw error;
} finally {
  db.close();
}

console.log(`Database built: ${lawCount} laws, ${articleCount} articles`);
console.log(`Output: ${dbPath}`);
