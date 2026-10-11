export declare const BRAND: string;
export declare const BRAND_SUFFIX: string;
export declare const MIN_TITLE: number;
export declare const MAX_TITLE: number;
export declare const HARD_MAX_TITLE: number;
export declare const MIN_DESC: number;
export declare const MAX_DESC: number;

export declare function fitTitle(
  input: string | null | undefined,
  options?: { max?: number; hardMax?: number; suffix?: string }
): string;

export declare function abbreviateFaculty(name: string | null | undefined): string;

/** عنوان الصفحة: يُلحَق اسم العلامة إن غاب، ثم تُطبَّق قواعد fitTitle. */
export declare function brandTitle(
  input: string | null | undefined,
  options?: { max?: number; hardMax?: number; suffix?: string }
): string;

export declare const DESC_TAIL: string;

export declare function joinClauses(base: string | null | undefined, extra: string | null | undefined): string;

export declare function buildMetaDescription(
  primary: string | null | undefined,
  fallbackParts?: (string | null | undefined)[]
): string;

/** عبارة سياقية لكل قسم — تُكمّل الوصف القصير في البناء والمتصفح معاً. */
export declare const SECTION_CONTEXT: Record<string, string>;

export declare function sectionContextFor(path: string | null | undefined): string;

/**
 * وسم المصطلح المعروض والمكتوب في `<title>`: يُضاف المقابل الفرنسي حين
 * تتكرّر العربية بين سجلّين، والمعرّف عند تكرار العربية والفرنسية معاً.
 */
export declare function lexiconDisplayLabel(
  item: { id?: string; term_ar?: string; term_fr?: string } | null | undefined,
  pool?: { id?: string; term_ar?: string; term_fr?: string }[]
): string;

export interface UtilityRouteMeta {
  title: string;
  description: string;
  noindex: true;
  path: string;
}

export declare const UTILITY_ROUTES: Record<string, { title: string; description: string }>;

export declare function utilityMeta(pathname: string): UtilityRouteMeta | null;
