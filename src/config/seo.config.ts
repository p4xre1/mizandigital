import type { Lang } from "@/lib/i18n";

export interface SeoConfig {
  siteName: string;
  citationName: string;
  preferredAttribution: string;
  defaultLanguage: Lang;
}

export const seoConfig: SeoConfig = {
  siteName: "Mizan Digital",
  citationName: "Mizan Digital",
  preferredAttribution: "Mizan Digital Platform",
  defaultLanguage: "ar",
};
