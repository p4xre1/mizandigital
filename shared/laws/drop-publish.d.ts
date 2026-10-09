// shared/laws/drop-publish.d.ts
// Types for Algorithm 2 (law PDF drop → landing page). Implementation: drop-publish.js.

export const LANDING_CARD_LIMIT: number;

export interface ArchiveRowLike {
  id?: string | null;
  slug?: string | null;
  title?: string | null;
  law_number?: string | null;
  publication_date?: string | null;
  pdf_url?: string | null;
}

export type LawDropStatus = "ready" | "needs_review" | "duplicate";

export interface LawDropFields {
  title: string | null;
  law_number: string | null;
  official_gazette_number: string | null;
  publication_date: string | null;
  type: "قانون" | "قانون-إطار" | null;
}

export interface LawDropCheck {
  code: "pdf_file" | "title" | "publication_date" | "date_not_future" | "law_number" | "gazette_number" | "not_duplicate";
  ok: boolean;
  blocking: boolean;
  message: string;
}

export interface LawDropDuplicate {
  id: string | null;
  slug: string | null;
  title: string;
  reason: "same_law_number" | "same_title" | "same_file_name";
}

export interface LawDropPlan {
  status: LawDropStatus;
  message: string;
  fields: LawDropFields;
  checks: LawDropCheck[];
  duplicateOf: LawDropDuplicate | null;
  landing: { eligible: boolean; rank: number | null; willShowOnHome: boolean };
}

export declare function normalizeWord(value: unknown): string;
export declare function normalizeTitleKey(value: unknown): string;
export declare function toAsciiDigits(value: unknown): string;
export declare function toIsoDate(year: unknown, month: unknown, day: unknown): string | null;
export declare function extractDate(input: unknown): string | null;
export declare function extractLawNumber(input?: { text?: string; fileName?: string }): string | null;
export declare function extractGazetteNumber(text?: string): string | null;
export declare function titleFromFileName(fileName?: string, options?: { year?: string | null }): string | null;
export declare function titleFromText(text?: string): string | null;
export declare function lawTypeOf(title?: string): "قانون" | "قانون-إطار";
export declare function findDuplicate(args: {
  fields: Pick<LawDropFields, "title" | "law_number">;
  fileName: string;
  existing?: ArchiveRowLike[];
}): LawDropDuplicate | null;
export declare function landingRankOf(
  item: { date: string; title: string },
  existing?: ArchiveRowLike[],
): number;
export declare function planLawDrop(input?: {
  fileName?: string;
  text?: string;
  existing?: ArchiveRowLike[];
  today?: string | null;
}): LawDropPlan;
