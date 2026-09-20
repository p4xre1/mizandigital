export declare const BRAND: string;
export declare const BRAND_SUFFIX: string;
export declare const BRAND_ALTERNATE_NAMES: string[];
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

export declare const DESC_TAIL: string;

export declare function joinClauses(base: string | null | undefined, extra: string | null | undefined): string;

export declare function buildMetaDescription(
  primary: string | null | undefined,
  fallbackParts?: (string | null | undefined)[]
): string;

export interface UtilityRouteMeta {
  title: string;
  description: string;
  noindex: true;
  path: string;
}

export declare const UTILITY_ROUTES: Record<string, { title: string; description: string }>;

export declare function utilityMeta(pathname: string): UtilityRouteMeta | null;
