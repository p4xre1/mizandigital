"use client";

import React, { useEffect } from "react";
import {
  GraduationCap,
  ScrollText,
  Newspaper,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { NEWS_CATEGORIES, NewsCategory } from "../../data/newsCategories";
import { type Lang } from "../../lib/i18n";

interface Props {
  lang?: Lang;
  onSelectCategory?: (category: NewsCategory) => void;
}

export function NewsCategoriesGrid({ lang = "ar", onSelectCategory }: Props) {
  const adClientId =
    (typeof import.meta !== "undefined" &&
      import.meta.env?.VITE_GOOGLE_ADSENSE_CLIENT_ID) ||
    "ca-pub-1749032173858747";

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      }
    } catch (err) {
      console.warn("AdSense safely handled in NewsCategoriesGrid:", err);
    }
  }, []);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "GraduationCap":
        return <GraduationCap size={28} className="text-amber-500" />;
      case "ScrollText":
        return <ScrollText size={28} className="text-blue-500" />;
      case "Newspaper":
        return <Newspaper size={28} className="text-emerald-500" />;
      default:
        return <Newspaper size={28} className="text-primary" />;
    }
  };

  return (
    <section className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <Sparkles size={12} className="text-amber-500" />
            {lang === "ar" ? "أقسام الأخبار والمستجدات" : "News Categories"}
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-foreground">
            {lang === "ar"
              ? "مستجدات الساحة القانونية والأكاديمية"
              : "Legal & Academic Updates"}
          </h2>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
          <ShieldCheck size={12} />
          <span>Verified Sources</span>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {NEWS_CATEGORIES.map((cat) => {
          // Type-safe localized property lookups
          const title = cat.title[lang as keyof typeof cat.title] || cat.title.ar;
          const subtitle = cat.subtitle[lang as keyof typeof cat.subtitle] || cat.subtitle.ar;
          
          // Access array from LocalizedKeywords type
          const keywordsList =
            (cat.keywords[lang as keyof typeof cat.keywords] || cat.keywords.ar || []) as string[];

          return (
            <div
              key={cat.id}
              onClick={() => onSelectCategory && onSelectCategory(cat)}
              className="group relative bg-card border border-border rounded-3xl p-5 sm:p-6 hover:border-primary/50 transition-all shadow-xs hover:shadow-md cursor-pointer flex flex-col justify-between active:scale-[0.98] touch-manipulation min-h-[160px]"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center border border-border/80 group-hover:scale-105 transition-transform">
                  {getIcon(cat.icon)}
                </div>

                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-foreground group-hover:text-primary transition-colors">
                    {title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1 font-medium">
                    {subtitle}
                  </p>
                </div>
              </div>

              {/* Keywords & Arrow */}
              <div className="pt-4 mt-3 border-t border-border/60 flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {keywordsList.slice(0, 2).map((kw: string, i: number) => (
                    <span
                      key={i}
                      className="text-[9px] font-mono bg-muted px-2 py-0.5 rounded-md text-muted-foreground"
                    >
                      #{kw}
                    </span>
                  ))}
                </div>
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                  <ArrowLeft
                    size={16}
                    className="rtl:rotate-0 ltr:rotate-180"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Google AdSense Banner */}
      <div className="w-full bg-card border border-border rounded-2xl p-3 text-center overflow-hidden shadow-xs">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5 px-1 font-mono">
          <span className="flex items-center gap-1 text-primary font-bold">
            <Sparkles size={11} />
            {lang === "ar" ? "مستجدات رعاية الشركاء" : "Sponsored News Banner"}
          </span>
          <span>Google AdSense</span>
        </div>
        <div className="min-h-[90px] flex items-center justify-center bg-muted/20 rounded-xl border border-dashed border-border">
          <ins
            className="adsbygoogle"
            style={{ display: "block", width: "100%", minHeight: "90px" }}
            data-ad-client={adClientId}
            data-ad-slot="3344556677"
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      </div>
    </section>
  );
}

export default NewsCategoriesGrid;