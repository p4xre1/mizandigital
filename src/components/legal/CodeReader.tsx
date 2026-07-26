"use client";

import { useState } from "react";
import { Copy, Check, Bookmark, Share2, Scale, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useI18n, serifFont, sansFont, type Lang } from "@/lib/i18n";
import { useRole } from "@/hooks/useRole";
import { supabase, logAuditEvent } from "@/lib/supabase";

export interface LegalArticle {
  id?: string; // Optional DB UUID for linking interactions
  num: number;
  titleAr: string;
  contentAr: string;
  contentFr?: string;
  codeName: string;
  keywords?: string[]; // Master SEO keywords injection
  updatedAt?: string;
}

const SITE_URL = import.meta.env?.VITE_SITE_URL || "https://www.mizan.page";

// ── 4-Language Dictionary (ar, fr, en, es) ───────────────────────────────────
const LABELS = {
  article: { ar: "المادة", fr: "Article", en: "Article", es: "Artículo" },
  chapter: { ar: "الفصل", fr: "Chapitre", en: "Chapter", es: "Capítulo" },
  source: {
    ar: "منصة ميزان الرقمية - مصدر قانوني موثوق",
    fr: "Plateforme Mizan Digital - Source Juridique Fiable",
    en: "Mizan Digital Platform - Trusted Legal Source",
    es: "Plataforma Mizan Digital - Fuente Legal Confiable",
  },
  copiedSuccess: {
    ar: "تم نسخ المادة بنجاح مع المصدر القانوني المشفر",
    fr: "Article copié avec succès avec la source juridique",
    en: "Article successfully copied with secure legal attribution",
    es: "Artículo copiado con éxito con la atribución legal",
  },
  bookmark: {
    ar: "حفظ في المفضلة",
    fr: "Enregistrer dans les favoris",
    en: "Save to bookmarks",
    es: "Guardar en marcadores",
  },
  bookmarkSuccess: {
    ar: "تم حفظ المادة بنجاح",
    fr: "Article enregistré avec succès",
    en: "Article successfully saved",
    es: "Artículo guardado con éxito",
  },
  loginRequired: {
    ar: "يرجى تسجيل الدخول لحفظ المواد",
    fr: "Veuillez vous connecter pour enregistrer",
    en: "Please login to save articles",
    es: "Inicie sesión para guardar artículos",
  },
  share: {
    ar: "مشاركة المادة",
    fr: "Partager l'article",
    en: "Share article",
    es: "Compartir artículo",
  },
  copy: {
    ar: "نسخ المادة",
    fr: "Copier l'article",
    en: "Copy article",
    es: "Copiar artículo",
  },
  frenchVersion: {
    ar: "النسخة الفرنسية المطابقة:",
    fr: "Version française correspondante :",
    en: "Corresponding French version:",
    es: "Versión en francés correspondiente:",
  },
} as const;

function getLabel(key: keyof typeof LABELS, lang: Lang): string {
  return LABELS[key][lang] || LABELS[key].en;
}

// ── Master SEO Schema Generator ──────────────────────────────────────────────
function generateLegislationSchema(article: LegalArticle, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Legislation",
    name: `${article.codeName} - Article ${article.num}: ${article.titleAr}`,
    identifier: `ART-${article.num}`,
    legislationType: "SecondaryLegislation",
    legislationJurisdiction: "Morocco",
    text: article.contentAr,
    url: url,
    keywords: article.keywords?.join(", ") || "law, morocco, legal code, legislation",
    publisher: {
      "@type": "Organization",
      name: "Mizan Digital",
      url: SITE_URL,
    },
    dateModified: article.updatedAt || new Date().toISOString(),
  };
}

export function CodeReader({ article }: { article: LegalArticle }) {
  const { lang, dir } = useI18n();
  
  // ── Safe extraction of Role and User ID ─────────────────────────────────────
  const roleContext = useRole() as unknown as {
    isGuest?: boolean;
    userId?: string;
    user_id?: string;
    user?: { id?: string };
  };

  const isGuest = Boolean(roleContext?.isGuest);
  const userId = roleContext?.userId || roleContext?.user_id || roleContext?.user?.id;

  const [copied, setCopied] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const currentUrl = typeof window !== "undefined" ? window.location.href : SITE_URL;

  // ── Secure Copy Handler ───────────────────────────────────────────────────
  const handleCopy = async () => {
    const textToCopy = `${getLabel("article", lang)} ${article.num} - ${article.codeName}:\n${article.contentAr}\n\n${getLabel("source", lang)}\n${currentUrl}`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Fallback for older mobile browsers
        const textarea = document.createElement("textarea");
        textarea.value = textToCopy;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setCopied(true);
      toast.success(getLabel("copiedSuccess", lang));

      // Log analytics securely
      if (userId) {
        await logAuditEvent("copy_legal_article", "articles", undefined, { article_num: article.num });
      }

      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("[Copy Error]", err);
    }
  };

  // ── Database Synchronized Bookmark Handler ────────────────────────────────
  const handleBookmark = async () => {
    if (isGuest || !userId) {
      toast.error(getLabel("loginRequired", lang));
      return;
    }

    if (!article.id) {
      // Fallback local toggle if no DB ID is provided for this specific snippet
      setBookmarked(!bookmarked);
      toast.success(getLabel("bookmarkSuccess", lang));
      return;
    }

    setIsProcessing(true);
    try {
      if (bookmarked) {
        // Safe type cast for Supabase query builder
        await (supabase.from("user_interactions" as never) as unknown as {
          delete: () => { match: (query: Record<string, unknown>) => Promise<unknown> };
        })
          .delete()
          .match({ user_id: userId, article_id: article.id, interaction_type: "save" });
          
        setBookmarked(false);
      } else {
        // Safe type cast for Supabase query builder
        await (supabase.from("user_interactions" as never) as unknown as {
          insert: (data: Record<string, unknown>) => Promise<unknown>;
        }).insert({
          user_id: userId,
          article_id: article.id,
          interaction_type: "save",
        });

        setBookmarked(true);
        toast.success(getLabel("bookmarkSuccess", lang));
      }
    } catch (error) {
      console.error("[Bookmark Error]", error);
      toast.error("An error occurred securely communicating with the server.");
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Native Mobile Share API ───────────────────────────────────────────────
  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${getLabel("chapter", lang)} ${article.num} - ${article.codeName}`,
          text: article.contentAr.slice(0, 150) + "...",
          url: currentUrl,
        });
        // Audit log for sharing
        if (userId) {
          await logAuditEvent("share_legal_article", "articles", undefined, { article_num: article.num });
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          console.error("Share failed", e);
        }
      }
    } else {
      handleCopy();
    }
  };

  return (
    <article
      className="relative bg-card border border-border/60 hover:border-border rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-md transition-all duration-300 space-y-5 overflow-hidden group"
      dir={dir}
    >
      {/* 🚀 Master SEO: Structured Data Injection for Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateLegislationSchema(article, currentUrl)),
        }}
      />

      {/* Header Bar - Mobile Optimized Touch Targets (min-h/w 44px) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span
            className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-full"
            style={{ fontFamily: sansFont(lang) }}
          >
            {article.codeName}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleBookmark}
            disabled={isProcessing}
            className="flex items-center justify-center w-11 h-11 hover:bg-muted/80 rounded-xl transition-all text-muted-foreground active:scale-90 cursor-pointer disabled:opacity-50"
            title={getLabel("bookmark", lang)}
            aria-label={getLabel("bookmark", lang)}
          >
            <Bookmark
              className={`w-5 h-5 transition-transform ${
                bookmarked ? "fill-amber-500 text-amber-500 scale-110" : ""
              }`}
            />
          </button>

          <button
            onClick={handleShare}
            className="flex items-center justify-center w-11 h-11 hover:bg-muted/80 rounded-xl transition-all text-muted-foreground active:scale-90 cursor-pointer"
            title={getLabel("share", lang)}
            aria-label={getLabel("share", lang)}
          >
            <Share2 className="w-5 h-5" />
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center justify-center w-11 h-11 hover:bg-muted/80 rounded-xl transition-all text-muted-foreground active:scale-90 cursor-pointer bg-primary/5 hover:bg-primary/10"
            title={getLabel("copy", lang)}
            aria-label={getLabel("copy", lang)}
          >
            {copied ? (
              <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 scale-110 transition-transform" />
            ) : (
              <Copy className="w-5 h-5 text-primary" />
            )}
          </button>
        </div>
      </div>

      {/* Article Number Title */}
      <div className="flex items-start gap-3">
        <div className="mt-1 flex-shrink-0 bg-primary/10 p-2 rounded-lg">
          <Scale className="w-5 h-5 text-primary" />
        </div>
        <h2
          className="text-xl md:text-2xl font-extrabold text-foreground leading-tight"
          style={{ fontFamily: serifFont(lang) }}
        >
          {getLabel("chapter", lang)} {article.num}: {article.titleAr}
        </h2>
      </div>

      {/* Main Arabic Content */}
      <div className="pl-2 md:pl-0 border-l-2 md:border-l-0 border-primary/20 rtl:border-l-0 rtl:border-r-2 rtl:pr-4">
        <p
          className="text-base md:text-lg leading-loose text-foreground/90 tracking-wide whitespace-pre-line"
          style={{ fontFamily: serifFont(lang) }}
        >
          {article.contentAr}
        </p>
      </div>

      {/* Optional French Legal Content */}
      {article.contentFr && (
        <div className="mt-6 pt-4 border-t border-border/40 text-left dir-ltr bg-muted/30 p-4 rounded-xl">
          <p
            className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider mb-2 flex items-center gap-2"
            style={{ fontFamily: sansFont(lang) }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50"></span>
            {getLabel("frenchVersion", lang)}
          </p>
          <p
            className="text-sm md:text-base text-muted-foreground italic leading-relaxed"
            style={{ fontFamily: sansFont(lang) }}
          >
            {article.contentFr}
          </p>
        </div>
      )}
    </article>
  );
}