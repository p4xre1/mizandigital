// Types for shared/search/bm25.js

export const MAX_QUERY_TOKENS: number
export const BM25_K1: number
export const BM25_B: number
export const TITLE_BOOST: number
export const PHRASE_BONUS: number
export const STOPWORDS: ReadonlySet<string>

export function normalizeForSearch(text?: string): string
export function tokenize(text?: string, options?: { keepStopwords?: boolean }): string[]
export function sanitizeQueryTokens(raw?: string): string[]

export interface RankableDoc {
  title?: string | null
  body?: string | null
}

export interface RankOptions {
  k1?: number
  b?: number
  titleBoost?: number
  phraseBonus?: number
}

export function rankDocuments(
  docs: RankableDoc[],
  query: string,
  options?: RankOptions,
): Array<{ index: number; score: number }>
