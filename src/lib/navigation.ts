import { useI18n, type Lang } from "./i18n";

const VALID_LANGS: Lang[] = ["ar", "fr", "en", "es"];

/**
 * Cleanly prepends or replaces the language code in a URL path.
 * Guarantees output formatted as: /:lang/path (e.g. /fr/laws)
 */
export function buildLocalizedPath(pathname: string, targetLang: Lang): string {
  // Return early for external links or anchor tags
  if (
    !pathname ||
    pathname.startsWith("http://") ||
    pathname.startsWith("https://") ||
    pathname.startsWith("#") ||
    pathname.startsWith("mailto:")
  ) {
    return pathname;
  }

  // Split and filter out all valid language codes that might have stacked up (e.g., /fr/es/en/laws)
  const segments = pathname
    .split("/")
    .filter(Boolean)
    .filter((segment) => !VALID_LANGS.includes(segment as Lang));

  // Construct clean path: /targetLang/segment1/segment2
  const cleanPath = segments.length > 0 ? `/${segments.join("/")}` : "";
  
  return `/${targetLang}${cleanPath}`;
}

/**
 * Custom React Hook to localize internal links according to current UI language.
 */
export function useLocalizedPath() {
  const { lang } = useI18n();

  return (path: string): string => {
    return buildLocalizedPath(path, lang || "ar");
  };
}