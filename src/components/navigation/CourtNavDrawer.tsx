"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { COURT_RULINGS_AND_DOCTRINE } from "@/data/courtRulingsData";
import { useI18n, useLocalizedPath, sansFont, type Lang } from "@/lib/i18n";
import { useRole } from "@/hooks/useRole";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Scale,
  BookOpen,
  Search,
  Gavel,
  FileText,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  ShieldCheck,
  Building2,
  X,
  FolderArchive,
} from "lucide-react";

// ----------------------------------------------------------------------
// 1. Environment & Site Configuration
// ----------------------------------------------------------------------
const VITE_SITE_URL =
  (import.meta.env.VITE_SITE_URL as string) || "https://www.mizan.page";
const VITE_APP_URL =
  (import.meta.env.VITE_APP_URL as string) || "https://www.mizan.page";

// ----------------------------------------------------------------------
// 2. Multilingual Dictionary (AR, FR, EN, ES)
// ----------------------------------------------------------------------
type TranslationDict = Record<Lang, string>;

const t4 = (ar: string, fr: string, en: string, es: string): TranslationDict => ({
  ar,
  fr,
  en,
  es,
});

const dict = {
  drawerTitle: t4(
    "الاجتهاد القضائي والفقه القانوني",
    "Jurisprudence et Doctrine Juridique",
    "Court Rulings & Legal Doctrine",
    "Jurisprudencia y Doctrina Legal"
  ),
  searchPlaceholder: t4(
    "بحث في القرارات والاجتهادات القضائية...",
    "Rechercher dans la jurisprudence et les arrêts...",
    "Search court rulings and legal decisions...",
    "Buscar en decisiones y jurisprudencia..."
  ),
  verifiedBadge: t4(
    "موثق رسمياً",
    "Officiel & Vérifié",
    "Officially Verified",
    "Oficialmente Verificado"
  ),
  staffBadge: t4(
    "لوحة الإدارة",
    "Espace Gestion",
    "Staff Access",
    "Panel de Gestión"
  ),
  noResults: t4(
    "لم يتم العثور على قرارات قضائية مطابقة للبحث",
    "Aucune décision juridique ne correspond à votre recherche",
    "No court decisions matched your search filter",
    "No se encontraron decisiones judiciales coincidentes"
  ),
  viewAll: t4(
    "عرض جميع القرارات",
    "Voir tous les arrêts",
    "View all court rulings",
    "Ver todas las decisiones"
  ),
  fileCount: t4(
    "وثائق وقرارات",
    "Documents & Arrêts",
    "Documents & Files",
    "Documentos y Archivos"
  ),
};

// ----------------------------------------------------------------------
// 3. Security Helper (Input Sanitization without breaking space bar)
// ----------------------------------------------------------------------
function sanitizeSearchQuery(query: string): string {
  // Strip control and potentially dangerous characters while retaining spaces
  return query.replace(/[^\w\s\u0600-\u06FF\u00C0-\u024F-]/gi, "");
}

// ----------------------------------------------------------------------
// 4. Props Interface
// ----------------------------------------------------------------------
export interface CourtNavDrawerProps {
  /** Optional callback fired when a navigation item or drawer action is triggered */
  onSelect?: () => void;
  /** Custom CSS class names */
  className?: string;
}

// ----------------------------------------------------------------------
// 5. Main Component
// ----------------------------------------------------------------------
export const CourtNavDrawer: React.FC<CourtNavDrawerProps> = ({
  onSelect,
  className = "",
}): React.JSX.Element => {
  const { lang, dir } = useI18n();
  const localizedPath = useLocalizedPath();
  const { isStaff, canWriteContent } = useRole();
  const [searchQuery, setSearchQuery] = useState("");
  const [accordionValues, setAccordionValues] = useState<string[]>(() =>
    COURT_RULINGS_AND_DOCTRINE.map((s) => s.id)
  );

  // Clean search input while preserving spaces
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const sanitized = sanitizeSearchQuery(e.target.value);
      setSearchQuery(sanitized);
    },
    []
  );

  const clearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  // Client-Side Search Filter across sections & subcategories
  const filteredCourtData = useMemo(() => {
  const trimmedQuery = searchQuery.trim().toLowerCase();

  if (!trimmedQuery) {
    return COURT_RULINGS_AND_DOCTRINE;
  }

  return COURT_RULINGS_AND_DOCTRINE.map((section) => {
    const sectionTitle = section.title[lang].toLowerCase();

    const sectionMatches = sectionTitle.includes(trimmedQuery);

    const matchingSubs = section.subcategories.filter((sub) => {
      const title = sub.title[lang].toLowerCase();
      const description = sub.description?.[lang]?.toLowerCase() ?? "";

      return (
        title.includes(trimmedQuery) ||
        description.includes(trimmedQuery) ||
        sub.slug.toLowerCase().includes(trimmedQuery)
      );
    });

    const finalSubs =
      sectionMatches && matchingSubs.length === 0
        ? section.subcategories
        : matchingSubs;

    return {
      ...section,
      subcategories: finalSubs,
    };
  }).filter((section) => section.subcategories.length > 0);
}, [searchQuery, lang]);

  // Active expanded accordion items (auto-expand during active search)
  const activeAccordionValues = useMemo(() => {
    if (searchQuery.trim()) {
      return filteredCourtData.map((s) => s.id);
    }
    return accordionValues;
  }, [searchQuery, filteredCourtData, accordionValues]);

  // Master SEO Structured Data (JSON-LD)
  const masterSeoSchema = useMemo(() => {
    const defaultThumbnail = `${VITE_SITE_URL}/Logo.svg`;

    const navItems = COURT_RULINGS_AND_DOCTRINE.flatMap((section) =>
      section.subcategories.map((sub) => ({
        "@type": "SiteNavigationElement",
        name: sub.title[lang],
        description: sub.description?.[lang],
        url: `${VITE_APP_URL}/category/${sub.slug}`,
        image: defaultThumbnail,
      }))
    );

    const rawSchema = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "ItemList",
          "@id": `${VITE_APP_URL}/#court-navigation-list`,
          name: dict.drawerTitle[lang],
          numberOfItems: navItems.length,
          itemListElement: navItems.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            item: item,
          })),
        },
        {
          "@type": "ImageObject",
          "@id": `${defaultThumbnail}#court-media-logo`,
          url: defaultThumbnail,
          caption: "Mizan Legal Platform Rulings & Court Files",
          inLanguage: lang,
        },
      ],
    });

    return rawSchema.replace(/</g, "\\u003c");
  }, [lang]);

  const ArrowIcon = dir === "rtl" ? ChevronLeft : ChevronRight;

  return (
    <nav
      aria-label={dict.drawerTitle[lang]}
      className={`w-full flex flex-col h-full bg-background text-foreground transition-all duration-200 select-none ${className}`}
      dir={dir}
      style={{ fontFamily: sansFont(lang) }}
    >
      {/* Master Navigation & SEO Injector */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: masterSeoSchema }}
      />

      {/* --------------------------------------------------------------------
          Header & Security / Role Status
         -------------------------------------------------------------------- */}
      <div className="p-4 border-b border-border/60 bg-muted/30 sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Gavel className="size-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground leading-tight">
                {dict.drawerTitle[lang]}
              </h2>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                <ShieldCheck className="size-3 text-emerald-500" />
                {dict.verifiedBadge[lang]}
              </span>
            </div>
          </div>

          {isStaff && (
            <Badge
              variant="outline"
              className="text-[10px] bg-primary/5 text-primary border-primary/20 gap-1 px-2 py-0.5 rounded-full"
            >
              <Sparkles className="size-3" />
              {dict.staffBadge[lang]}
            </Badge>
          )}
        </div>

        {/* Instant Mobile Filter Search Input */}
        <div className="relative w-full mt-2">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={dict.searchPlaceholder[lang]}
            className="w-full h-10 text-xs ps-9 pe-8 rounded-xl bg-background border-border/80 focus-visible:ring-1 focus-visible:ring-primary shadow-inner"
            aria-label={dict.searchPlaceholder[lang]}
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute end-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              aria-label="Clear Search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* --------------------------------------------------------------------
          Main Accordion Body
         -------------------------------------------------------------------- */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {filteredCourtData.length > 0 ? (
          <Accordion
            type="multiple"
            value={activeAccordionValues}
            onValueChange={setAccordionValues}
            className="w-full space-y-2"
          >
            {filteredCourtData.map((section) => (
              <AccordionItem
                key={section.id}
                value={section.id}
                className="border border-border/50 rounded-2xl bg-card overflow-hidden shadow-2sm"
              >
                <AccordionTrigger className="px-3.5 py-3 hover:no-underline hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-2.5 text-start">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                      {section.id === "court-rulings" ? (
                        <Scale className="size-4" />
                      ) : (
                        <BookOpen className="size-4" />
                      )}
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-foreground block">
                        {section.title[lang]}
                      </span>
                      <span className="text-[10px] text-muted-foreground block font-normal mt-0.5">
                        {section.subcategories.length} {dict.fileCount[lang]}
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="pt-1 pb-2 px-2 bg-muted/10">
                  <div className="flex flex-col gap-1.5 border-t border-border/30 pt-2">
                    {section.subcategories.map((sub) => (
                      <Link
                        key={sub.id}
                        to={localizedPath(`/category/${sub.slug}`)}
                        onClick={onSelect}
                        className="group flex items-center justify-between p-2.5 rounded-xl text-xs text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all active:scale-[0.98] border border-transparent hover:border-border/60"
                      >
                        <div className="flex items-start gap-2.5 min-w-0 pe-2">
                          <FileText className="size-4 text-primary/70 shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {sub.title[lang]}
                            </div>
                            {sub.description && (
                              <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5 leading-snug">
                                {sub.description?.[lang]}
                              </div>
                            )}
                          </div>
                        </div>

                        <ArrowIcon className="size-4 text-muted-foreground/60 shrink-0 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
                      </Link>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="py-12 text-center px-4">
            <FolderArchive className="size-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground font-medium">
              {dict.noResults[lang]}
            </p>
            <button
              onClick={clearSearch}
              className="mt-3 text-xs font-bold text-primary hover:underline cursor-pointer"
            >
              {dict.viewAll[lang]}
            </button>
          </div>
        )}
      </div>

      {/* --------------------------------------------------------------------
          Footer Quick Actions & Staff Shortcuts
         -------------------------------------------------------------------- */}
      {canWriteContent && (
        <div className="p-3 border-t border-border/60 bg-muted/20">
          <Link
            to={localizedPath("/writer/editor")}
            onClick={onSelect}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:opacity-95 active:scale-[0.98] transition-all"
          >
            <Building2 className="size-4" />
            <span>
              {lang === "ar"
                ? "إضافة قرار أو دراسة جديدة"
                : lang === "fr"
                ? "Ajouter un arrêt ou une étude"
                : lang === "es"
                ? "Agregar decisión o estudio"
                : "Add New Ruling or Research"}
            </span>
          </Link>
        </div>
      )}
    </nav>
  );
};

export default CourtNavDrawer;