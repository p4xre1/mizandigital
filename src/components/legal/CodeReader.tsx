"use client";

import { useState } from "react";
import { Copy, Check, Bookmark, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n, serifFont, sansFont, type Lang } from "@/lib/i18n";

export interface LegalArticle {
  id: string;
  num: number;
  titleAr: string;
  contentAr: string;
  contentFr?: string;
  codeName: string;
}

const LABELS = {
  article: { ar: "المادة", fr: "Article", en: "Article", es: "Artículo" },
  chapter: { ar: "الفصل", fr: "Chapitre", en: "Chapter", es: "Capítulo" },
  source: {
    ar: "منصة ميزان الرقمية",
    fr: "Plateforme Mizan Digital",
    en: "Mizan Digital Platform",
    es: "Plataforma Mizan Digital",
  },
  copiedSuccess: {
    ar: "تم نسخ المادة بنجاح مع المصدر القانوني",
    fr: "Article copié avec succès avec la source juridique",
    en: "Article successfully copied with legal attribution",
    es: "Artículo copiado con éxito con la atribución legal",
  },
  bookmark: {
    ar: "حفظ في المفضلة",
    fr: "Enregistrer dans les favoris",
    en: "Save to bookmarks",
    es: "Guardar en marcadores",
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
    ar: "النسخة الفرنسية:",
    fr: "Version française :",
    en: "French version:",
    es: "Versión en francés:",
  },
} as const;

function getLabel(key: keyof typeof LABELS, lang: Lang): string {
  return LABELS[key][lang] || LABELS[key].en;
}

export function CodeReader({ article }: { article: LegalArticle }) {
  const { lang, dir } = useI18n();
  const [copied, setCopied] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  const handleCopy = () => {
    const textToCopy = `${getLabel("article", lang)} ${article.num} - ${article.codeName}:\n${article.contentAr}\n\n${getLabel("source", lang)} (${currentUrl})`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy);
    } else {
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
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${getLabel("chapter", lang)} ${article.num} - ${article.codeName}`,
          text: article.contentAr.slice(0, 100) + "...",
          url: currentUrl,
        });
      } catch (e) {
        console.error("Share failed", e);
      }
    } else {
      handleCopy();
    }
  };

  return (
    <article
      className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4"
      dir={dir}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <span
          className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full"
          style={{ fontFamily: sansFont(lang) }}
        >
          {article.codeName}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setBookmarked(!bookmarked)}
            className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground active:scale-95 cursor-pointer"
            title={getLabel("bookmark", lang)}
            aria-label={getLabel("bookmark", lang)}
          >
            <Bookmark
              className={`w-4 h-4 ${
                bookmarked ? "fill-amber-500 text-amber-500" : ""
              }`}
            />
          </button>
          <button
            onClick={handleShare}
            className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground active:scale-95 cursor-pointer"
            title={getLabel("share", lang)}
            aria-label={getLabel("share", lang)}
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleCopy}
            className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground active:scale-95 cursor-pointer"
            title={getLabel("copy", lang)}
            aria-label={getLabel("copy", lang)}
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Article Number Title */}
      <h2
        className="text-xl font-bold text-foreground"
        style={{ fontFamily: serifFont(lang) }}
      >
        {getLabel("chapter", lang)} {article.num}: {article.titleAr}
      </h2>

      {/* Main Arabic Content */}
      <p
        className="text-base md:text-lg leading-relaxed text-foreground/90 tracking-wide whitespace-pre-line"
        style={{ fontFamily: serifFont(lang) }}
      >
        {article.contentAr}
      </p>

      {/* Optional French Legal Content */}
      {article.contentFr && (
        <div className="mt-4 pt-3 border-t border-border/40 text-left dir-ltr">
          <p
            className="text-xs font-mono text-muted-foreground mb-1"
            style={{ fontFamily: sansFont(lang) }}
          >
            {getLabel("frenchVersion", lang)}
          </p>
          <p
            className="text-sm text-muted-foreground italic leading-relaxed"
            style={{ fontFamily: sansFont(lang) }}
          >
            {article.contentFr}
          </p>
        </div>
      )}
    </article>
  );
}