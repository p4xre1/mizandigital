// shared/search/bm25.js
//
// ─────────────────────────────────────────────────────────────────────────────
// BM25 ranking for Arabic and French search results
// ─────────────────────────────────────────────────────────────────────────────
// The old search matched the whole phrase with ILIKE and returned rows in
// database order. A query such as "مدونة الشغل" matched only rows containing
// that exact sequence. This module provides:
//
//   1) sanitizeQueryTokens: turns free text into a few safe search terms. The
//      result is safe to put in a PostgREST `.or()` filter, because it removes
//      the characters that break that syntax (commas, parentheses, quotes,
//      wildcards). It also caps the count, so one query cannot send a huge
//      filter.
//
//   2) rankDocuments: scores each row with BM25 (Robertson et al.). Terms that
//      are rare in the group count more. Repeated terms count, with saturation
//      so that spam does not win. Titles count double (TITLE_BOOST). A row that
//      contains the whole phrase in order gets a bonus.
//
// Rows that score 0 are kept, at the end. A row can match on a column the
// client did not fetch (for example an article body), so dropping it would
// lose real results.
//
// Arabic normalisation matches src/lib/utils/search.ts (normalizeArabic).

export const MAX_QUERY_TOKENS = 5;
export const BM25_K1 = 1.2;
export const BM25_B = 0.75;
export const TITLE_BOOST = 2;
export const PHRASE_BONUS = 2;

/** Function words that add noise to ranking (Arabic and French, normalised forms). */
export const STOPWORDS = new Set([
  "من", "في", "علي", "عن", "الي", "او", "ان", "هل", "ما", "ذلك", "هذا", "هذه", "التي", "الذي",
  "de", "la", "le", "les", "des", "du", "et", "en", "un", "une", "au", "aux", "sur", "pour",
]);

/**
 * Normalises text for comparison: removes diacritics, unifies alef, ya and ta
 * marbuta forms, lowercases, and replaces punctuation with spaces.
 * @param {string} [text]
 * @returns {string}
 */
export function normalizeForSearch(text = "") {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u064b-\u065f\u0670]/g, "") // الحركات (التشكيل)
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ـ/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Splits text into searchable tokens: at least two characters, or a number,
 * with stopwords removed unless `keepStopwords` is true.
 * @param {string} [text]
 * @param {{ keepStopwords?: boolean }} [options]
 * @returns {string[]}
 */
export function tokenize(text = "", { keepStopwords = false } = {}) {
  const out = [];
  for (const token of normalizeForSearch(text).split(" ")) {
    if (!token) continue;
    if (token.length < 2 && !/\p{N}/u.test(token)) continue;
    if (!keepStopwords && STOPWORDS.has(token)) continue;
    out.push(token);
  }
  return out;
}

/**
 * Safe query terms for a PostgREST `.or()` filter.
 * Unique, in input order, at most MAX_QUERY_TOKENS. Stopword-only input gives
 * an empty list, and the caller should then show no results.
 * @param {string} [raw]
 * @returns {string[]}
 */
export function sanitizeQueryTokens(raw = "") {
  const seen = new Set();
  const out = [];
  for (const token of tokenize(raw)) {
    if (seen.has(token)) continue;
    seen.add(token);
    out.push(token);
    if (out.length >= MAX_QUERY_TOKENS) break;
  }
  return out;
}

/**
 * Ranks documents against a query with BM25 and a phrase bonus.
 *
 * @param {Array<{ title?: string, body?: string }>} docs
 * @param {string} query  raw user text (tokenised here)
 * @param {{ k1?: number, b?: number, titleBoost?: number, phraseBonus?: number }} [options]
 * @returns {Array<{ index: number, score: number }>}  every doc, best first; ties keep input order
 */
export function rankDocuments(docs, query, options = {}) {
  const k1 = options.k1 ?? BM25_K1;
  const b = options.b ?? BM25_B;
  const titleBoost = options.titleBoost ?? TITLE_BOOST;
  const phraseBonus = options.phraseBonus ?? PHRASE_BONUS;

  const terms = [...new Set(tokenize(query))];
  const phraseTokens = tokenize(query, { keepStopwords: true });
  const phrase = phraseTokens.length >= 2 ? ` ${phraseTokens.join(" ")} ` : null;

  const prepared = docs.map((doc) => {
    const titleTokens = tokenize(doc?.title ?? "", { keepStopwords: true });
    const bodyTokens = tokenize(doc?.body ?? "", { keepStopwords: true });
    const tf = new Map();
    for (const t of titleTokens) tf.set(t, (tf.get(t) ?? 0) + titleBoost);
    for (const t of bodyTokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    const length = titleTokens.length * titleBoost + bodyTokens.length;
    const flat = ` ${[...titleTokens, ...bodyTokens].join(" ")} `;
    return { tf, length, flat };
  });

  const N = prepared.length;
  const avgLength = prepared.reduce((sum, p) => sum + p.length, 0) / Math.max(1, N) || 1;

  // document frequency of each query term
  const df = new Map();
  for (const term of terms) {
    df.set(term, prepared.filter((p) => p.tf.has(term)).length);
  }

  const scored = prepared.map((p, index) => {
    let score = 0;
    for (const term of terms) {
      const f = p.tf.get(term);
      if (!f) continue;
      const n = df.get(term) ?? 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      score += (idf * f * (k1 + 1)) / (f + k1 * (1 - b + (b * p.length) / avgLength));
    }
    if (phrase && p.flat.includes(phrase)) score += phraseBonus;
    return { index, score };
  });

  return scored.sort((x, y) => y.score - x.score || x.index - y.index);
}
