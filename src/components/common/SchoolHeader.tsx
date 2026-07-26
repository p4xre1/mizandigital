"use client";

import React, { useEffect } from "react";
import {
  ExternalLink,
  Building2,
  BookOpen,
  Clock,
  Users,
  Calendar,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { serifFont, sansFont, type Lang } from "../../lib/i18n";
import { type LawSchool } from "../../data/lawSchools";

interface SchoolHeaderProps {
  school: LawSchool;
  documentCount: number;
  lang: Lang;
}

/**
 * Military-Grade Security: Sanitize URL protocols to prevent XSS (javascript: attacks)
 */
function sanitizeUrl(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.href;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

// Master SEO Keywords Cloud for Legal Higher Education
const ACADEMIC_KEYWORDS = [
  "FSJES",
  "كليات الحقوق المغربية",
  "Droit Marocain",
  "رسائل الماستر",
  "الاجتهاد القضائي",
  "العلوم القانونية",
];

export function SchoolHeader({ school, documentCount, lang }: SchoolHeaderProps) {
  const name = school.name[lang] || school.name.ar;
  const university = school.university[lang] || school.university.ar;
  const description = school.description[lang] || school.description.ar;
  const city = school.city[lang] || school.city.ar;

  const safeWebsiteUrl = sanitizeUrl(school.website);

  // Safe Google AdSense Loader
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      }
    } catch (err) {
      console.warn("Google AdSense safely handled in SchoolHeader:", err);
    }
  }, []);

  // Schema.org EducationalOrganization Structured Data
  const jsonLdData = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": name,
    "alternateName": university,
    "description": description,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": city,
      "addressCountry": "MA",
    },
    "url": safeWebsiteUrl || undefined,
  };

  return (
    <header className="mb-8 space-y-4 font-sans">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
      />

      <div className="bg-card border border-border rounded-3xl p-5 sm:p-7 md:p-8 shadow-sm flex flex-col md:flex-row gap-6 items-start relative overflow-hidden">
        
        {/* Background Ambient Blur Glow */}
        <div className="absolute top-0 ltr:right-0 rtl:left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none" />

        {/* University Brand Icon & Security Badge */}
        <div className="relative shrink-0">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-3xl flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-inner">
            <Building2 size={40} className="text-primary/90" />
          </div>
          <span
            className="absolute -bottom-1 -end-1 w-6 h-6 bg-emerald-500 border-2 border-card rounded-full flex items-center justify-center text-white"
            title="Verified Academic Institution"
          >
            <ShieldCheck size={12} />
          </span>
        </div>

        {/* Details & Information */}
        <div className="flex-1 space-y-3.5 min-w-0">
          
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span
                className="text-xs font-bold text-primary uppercase tracking-wider block"
                style={{ fontFamily: sansFont(lang) }}
              >
                {university} • {city}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <CheckCircle2 size={10} />
                {lang === "ar" ? "مؤسسة معتمدة" : "Accredited Faculty"}
              </span>
            </div>

            <h1
              className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground tracking-tight leading-tight mb-2"
              style={{ fontFamily: serifFont(lang) }}
            >
              {name}
            </h1>

            {/* Official University Link with Security Rules */}
            {safeWebsiteUrl && (
              <a
                href={safeWebsiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] inline-flex items-center gap-2 text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:underline font-semibold transition-transform active:scale-95 touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary rounded-xl px-1"
                style={{ fontFamily: sansFont(lang) }}
              >
                <ExternalLink size={15} />
                <span>
                  {lang === "ar"
                    ? "الموقع الرسمي للكلية"
                    : lang === "fr"
                    ? "Site officiel de la faculté"
                    : "Official Website"}
                </span>
                <Lock size={12} className="text-muted-foreground ms-0.5" />
              </a>
            )}
          </div>

          {/* Academic Description */}
          {description && (
            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
              <p style={{ fontFamily: sansFont(lang) }}>{description}</p>
            </div>
          )}

          {/* Academic Programs & Tracks */}
          {school.programs && school.programs.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {school.programs.map((prog, idx) => {
                const progName = prog[lang] || prog.ar;
                return (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-muted/80 text-foreground border border-border shadow-2xs"
                    style={{ fontFamily: sansFont(lang) }}
                  >
                    <GraduationCap size={14} className="text-primary" />
                    <span>{progName}</span>
                  </span>
                );
              })}
            </div>
          )}

          {/* Quick Statistics Banner */}
          <div className="flex flex-wrap gap-4 sm:gap-6 pt-4 border-t border-border mt-4 text-xs font-semibold text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <BookOpen size={15} className="text-primary" />
              <span>
                {documentCount}{" "}
                {lang === "ar"
                  ? "مرجع متاح"
                  : lang === "fr"
                  ? "documents disponibles"
                  : "available documents"}
              </span>
            </div>
            
            {school.established && (
              <div className="flex items-center gap-1.5">
                <Calendar size={15} className="text-muted-foreground" />
                <span>
                  {lang === "ar"
                    ? `تأسست سنة ${school.established}`
                    : `Fondée en ${school.established}`}
                </span>
              </div>
            )}

            {school.students && (
              <div className="flex items-center gap-1.5">
                <Users size={15} className="text-muted-foreground" />
                <span>
                  {school.students} {lang === "ar" ? "طالب" : "étudiants"}
                </span>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <Clock size={15} className="text-amber-500" />
              <span>
                {lang === "ar"
                  ? "محدث دورياً"
                  : lang === "fr"
                  ? "Mis à jour régulièrement"
                  : "Regularly updated"}
              </span>
            </div>
          </div>

          {/* SEO Keywords Tag Cloud */}
          <div className="pt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className="font-bold text-muted-foreground flex items-center gap-1">
              <Sparkles size={11} className="text-amber-500" />
              SEO:
            </span>
            {ACADEMIC_KEYWORDS.map((kw, idx) => (
              <span
                key={idx}
                className="bg-muted px-2 py-0.5 rounded-lg text-muted-foreground font-mono"
              >
                #{kw}
              </span>
            ))}
          </div>

        </div>
      </div>

      {/* Google AdSense Academic Banner */}
      <div className="w-full bg-card border border-border rounded-2xl p-3 text-center overflow-hidden shadow-xs">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5 px-1 font-mono">
          <span className="flex items-center gap-1 text-primary font-bold">
            <Sparkles size={11} />
            {lang === "ar" ? "إعلان أكاديمي للمؤسسات" : "Sponsored Academic Slot"}
          </span>
          <span>Google AdSense</span>
        </div>
        <div className="min-h-[90px] flex items-center justify-center bg-muted/30 rounded-xl border border-dashed border-border">
          <ins
            className="adsbygoogle"
            style={{ display: "block", width: "100%", minHeight: "90px" }}
            data-ad-client="ca-pub-1749032173858747"
            data-ad-slot="9876543210"
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      </div>

    </header>
  );
}

// Ensure both named and default exports for CMS compatibility
export default SchoolHeader;