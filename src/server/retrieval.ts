import { getArticleByNumber, getLegalDb, findLawByMention, rowToCitation } from "./db";
import {
  buildSearchTokens,
  detectLegalDomain,
  domainRelevance,
  escapeFtsToken,
  escapeLike,
  extractArticleNumber,
  extractLawMention,
} from "./legal-text";
import type { Citation } from "./types";

type RankedRow = Parameters<typeof rowToCitation>[0] & {
  rank?: number | null;
};

function mergeCandidate(map: Map<string, Citation>, citation: Citation) {
  const current = map.get(citation.articleId);
  if (!current || (citation.score ?? 0) > (current.score ?? 0)) {
    map.set(citation.articleId, citation);
  }
}

export function retrieveArticles(
  question: string,
  options: { limit?: number; perLaw?: number } = {},
): Citation[] {
  const limit = options.limit ?? 16;
  const perLaw = options.perLaw ?? 4;
  const db = getLegalDb();
  const candidates = new Map<string, Citation>();
  const domain = detectLegalDomain(question);
  const lawMention = extractLawMention(question);
  const law = lawMention ? findLawByMention(lawMention) : null;
  const articleNumber = extractArticleNumber(question);

  if (law && articleNumber) {
    const exact = getArticleByNumber(law.id, articleNumber);
    if (exact) mergeCandidate(candidates, { ...exact, score: 1000 });
  }

  const tokens = buildSearchTokens(question);
  if (tokens.length > 0) {
    const match = tokens.map(escapeFtsToken).join(" OR ");
    try {
      const rows = db
        .prepare(
          `SELECT
             articles.*,
             bm25(article_fts) AS rank
           FROM article_fts
           JOIN articles ON articles.rowid = article_fts.rowid
           WHERE article_fts MATCH ?
           ORDER BY rank
           LIMIT 90`,
        )
        .all(match) as RankedRow[];

      for (const row of rows) {
        const citation = rowToCitation(row);
        const tokenHits = tokens.reduce(
          (count, token) =>
            count +
            (citation.lawTitle.includes(token) ? 5 : 0) +
            (citation.text.includes(token) ? 2 : 0),
          0,
        );
        mergeCandidate(candidates, {
          ...citation,
          score: tokenHits - Number(row.rank ?? 0),
        });
      }
    } catch {
      // A malformed FTS expression should not block exact law retrieval.
    }

    const shortTokens = tokens.filter((token) => token.length <= 2).slice(0, 6);
    for (const token of shortTokens) {
      const rows = db
        .prepare(
          `SELECT * FROM articles
           WHERE text LIKE ? ESCAPE '\\'
           ORDER BY
             CASE WHEN law_title LIKE ? ESCAPE '\\' THEN 0 ELSE 1 END,
             length(text)
           LIMIT 20`,
        )
        .all(`%${escapeLike(token)}%`, `%${escapeLike(token)}%`) as RankedRow[];
      for (const row of rows) {
        const citation = rowToCitation(row);
        const hits = tokens.filter((item) => citation.text.includes(item)).length;
        mergeCandidate(candidates, { ...citation, score: hits * 3 });
      }
    }
  }

  if (domain) {
    const expansionTokens = domain.sourceTerms.filter((token) => token.length >= 3);
    if (expansionTokens.length > 0) {
      try {
        const rows = db
          .prepare(
            `SELECT
               articles.*,
               bm25(article_fts) AS rank
             FROM article_fts
             JOIN articles ON articles.rowid = article_fts.rowid
             WHERE article_fts MATCH ?
             ORDER BY rank
             LIMIT 100`,
          )
          .all(expansionTokens.map(escapeFtsToken).join(" OR ")) as RankedRow[];

        for (const row of rows) {
          const citation = rowToCitation(row);
          const relevance = domainRelevance(citation, domain);
          if (relevance <= 0) continue;
          mergeCandidate(candidates, {
            ...citation,
            score: relevance + 40 - Number(row.rank ?? 0),
          });
        }
      } catch {
        // Domain expansion is additive; the base retrieval remains available.
      }
    }
  }

  if (candidates.size === 0 && law) {
    const rows = db
      .prepare("SELECT * FROM articles WHERE law_id = ? ORDER BY article_number LIMIT 40")
      .all(law.id) as RankedRow[];
    for (const row of rows) {
      mergeCandidate(candidates, { ...rowToCitation(row), score: 0 });
    }
  }

  if (candidates.size === 0) {
    const keyword = question.replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, "").slice(0, 12);
    if (keyword.length >= 2) {
      const rows = db
        .prepare(
          `SELECT * FROM articles
           WHERE text LIKE ? ESCAPE '\\'
           ORDER BY length(text)
           LIMIT 40`,
        )
        .all(`%${escapeLike(keyword)}%`) as RankedRow[];
      for (const row of rows) {
        mergeCandidate(candidates, { ...rowToCitation(row), score: 0 });
      }
    }
  }

  let ranked = [...candidates.values()].map((citation) => ({
    ...citation,
    score:
      (citation.score ?? 0) +
      (domain ? domainRelevance(citation, domain) : 0),
  }));

  if (domain) {
    const domainMatched = ranked.filter(
      (citation) =>
        (citation.score ?? 0) >= 1000 ||
        (!domain.negativeLawTerms.some((term) =>
          citation.lawTitle.includes(term),
        ) &&
          domainRelevance(citation, domain) > 0),
    );
    if (domainMatched.length >= 3) ranked = domainMatched;
  }

  const lawCounts = new Map<string, number>();
  return ranked
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .filter((citation) => {
      const count = lawCounts.get(citation.lawId) ?? 0;
      if (count >= perLaw) return false;
      lawCounts.set(citation.lawId, count + 1);
      return true;
    })
    .slice(0, limit);
}
