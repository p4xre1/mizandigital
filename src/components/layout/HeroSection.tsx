import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  ShieldCheck,
  BookOpen,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  FileText,
  School,
  Building2,
} from "lucide-react";

interface HeroSectionProps {
  lang: "ar" | "fr" | "en" | "es";
  dir: "rtl" | "ltr";
}

// ─── Constants ─────────────────────────────────────────────────────────────

const ADSENSE_CLIENT_ID = import.meta.env.VITE_ADSENSE_CLIENT_ID || "ca-pub-0000000000000000";

// Content dictionary defined OUTSIDE component to avoid re-creation
const CONTENT: Record<string, {
  badge: string;
  title: string;
  subtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
  searchPlaceholder: string;
  searchBtn: string;
  quickTags: string[];
  stats: { icon: typeof FileText; value: string; label: string }[];
  securityNotice: string;
}> = {
  ar: {
    badge: "منصة ميزان - الأرشيف الأكاديمي الرقمي",
    title: "الأرشيف القانوني والفقهي الموحد",
    subtitle:
      "منظومة رقمية شاملة لدراسة المذكرات القضائية، التشريعات الوطنية، والاجتهادات الدستورية بأسلوب أكاديمي موثق.",
    ctaPrimary: "استكشاف الأرشيف",
    ctaSecondary: "المكتبة الرقمية",
    searchPlaceholder: "ابحث عن قانون، نص تشريعي، أو قرار قضائي...",
    searchBtn: "بحث",
    quickTags: ["قانون الأسرة", "القانون الجنائي", "مباريات الماستر", "الجريدة الرسمية"],
    stats: [
      { icon: FileText, value: "+15,000", label: "وثيقة قانونية" },
      { icon: School, value: "+12", label: "كلية حقوق" },
      { icon: Building2, value: "100%", label: "وصول أكاديمي موثق" },
    ],
    securityNotice: "أرشيف أكاديمي مشفر ومعتمد 256-bit SSL",
  },
  fr: {
    badge: "Plateforme Mizan - Archives Académiques",
    title: "Archives Juridiques & Jurisprudence Unifiées",
    subtitle:
      "Un système numérique exhaustif dédié à l'étude des mémoires judiciaires, des textes législatifs et des doctrines.",
    ctaPrimary: "Consulter les Archives",
    ctaSecondary: "Bibliothèque Numérique",
    searchPlaceholder: "Rechercher une loi, un décret ou une jurisprudence...",
    searchBtn: "Chercher",
    quickTags: ["Droit de la Famille", "Droit Pénal", "Master Droit", "Journal Officiel"],
    stats: [
      { icon: FileText, value: "+15 000", label: "Documents Juridiques" },
      { icon: School, value: "+12", label: "Facultés de Droit" },
      { icon: Building2, value: "100%", label: "Accès Académique Garanti" },
    ],
    securityNotice: "Archive académique sécurisée et chiffrée SSL 256-bit",
  },
  en: {
    badge: "Mizan Platform - Academic Archive",
    title: "Unified Legal & Judicial Repository",
    subtitle:
      "A comprehensive institutional engine for legal research, constitutional precedents, and academic case commentary.",
    ctaPrimary: "Explore Archive",
    ctaSecondary: "Digital Library",
    searchPlaceholder: "Search for laws, decrees, or legal precedents...",
    searchBtn: "Search",
    quickTags: ["Family Law", "Criminal Law", "Master Degrees", "Official Gazette"],
    stats: [
      { icon: FileText, value: "+15,000", label: "Legal Texts" },
      { icon: School, value: "+12", label: "Law Schools" },
      { icon: Building2, value: "100%", label: "Verified Access" },
    ],
    securityNotice: "Secure 256-bit SSL Encrypted Academic Repository",
  },
  es: {
    badge: "Plataforma Mizan - Archivo Académico",
    title: "Repositorio Jurídico y Jurisprudencial",
    subtitle:
      "Un sistema digital exhaustivo para la investigación legal, precedentes constitucionales y doctrinas académicas.",
    ctaPrimary: "Explorar Archivo",
    ctaSecondary: "Biblioteca Digital",
    searchPlaceholder: "Buscar leyes, decretos o jurisprudencia...",
    searchBtn: "Buscar",
    quickTags: ["Derecho de Familia", "Derecho Penal", "Másteres", "Boletín Oficial"],
    stats: [
      { icon: FileText, value: "+15.000", label: "Textos Legales" },
      { icon: School, value: "+12", label: "Facultades" },
      { icon: Building2, value: "100%", label: "Acceso Verificado" },
    ],
    securityNotice: "Repositorio académico cifrado con SSL de 256 bits",
  },
};

// ─── AdSense Banner ──────────────────────────────────────────────────────────

const HeroAdBanner: React.FC<{ slotId?: string }> = ({ slotId = "1020304050" }) => {
  const [adBlocked, setAdBlocked] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    // Check if adsbygoogle script is actually loaded
    const checkScript = () => {
      if (typeof window !== "undefined" && "adsbygoogle" in window) {
        setScriptReady(true);
      }
    };

    checkScript();

    // Retry after a short delay in case script loads asynchronously
    const timer = setTimeout(checkScript, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!scriptReady) return;

    try {
      // @ts-expect-error adsbygoogle is injected by external script
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      setAdBlocked(true);
    }
  }, [scriptReady]);

  if (adBlocked || !scriptReady) return null;

  return (
    <div className="w-full max-w-2xl mx-auto my-3 overflow-hidden rounded-2xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-md p-2 text-center">
      <span
        className="text-[9px] font-bold tracking-widest text-slate-400 uppercase mb-1 block opacity-70"
        lang="ar"
      >
        محتوى برعاية أكاديمية - Sponsored
      </span>
      <div className="min-h-[60px] sm:min-h-[70px] flex items-center justify-center overflow-hidden">
        <ins
          className="adsbygoogle"
          style={{ display: "block", width: "100%" }}
          data-ad-client={ADSENSE_CLIENT_ID}
          data-ad-slot={slotId}
          data-ad-format="horizontal"
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export const HeroSection: React.FC<HeroSectionProps> = ({ lang, dir }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const t = CONTENT[lang] || CONTENT.ar;

  const getPath = useCallback((href: string) => `/${lang}${href}`, [lang]);

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setSearchError("");

      const query = searchQuery.trim();
      if (!query) {
        setSearchError(
          lang === "ar"
            ? "الرجاء إدخال كلمة البحث"
            : lang === "fr"
            ? "Veuillez saisir un terme de recherche"
            : lang === "es"
            ? "Por favor ingrese un término de búsqueda"
            : "Please enter a search term"
        );
        return;
      }

      setIsSearching(true);
      navigate(`${getPath("/archive")}?q=${encodeURIComponent(query)}`);
    },
    [searchQuery, lang, navigate, getPath]
  );

  const handleTagClick = useCallback(
    (tag: string) => {
      navigate(`${getPath("/archive")}?tag=${encodeURIComponent(tag)}`);
    },
    [navigate, getPath]
  );

  return (
    <section
      aria-label={t.title}
      className="relative w-full min-h-[520px] sm:min-h-[620px] flex flex-col justify-center overflow-hidden border-b border-slate-200 dark:border-slate-800 bg-slate-950 text-white transition-colors"
      dir={dir}
    >
      {/* Background */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/50 via-slate-900 to-slate-950 pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,#33415515_1px,transparent_1px),linear-gradient(to_bottom,#33415515_1px,transparent_1px)] bg-[size:1.75rem_1.75rem] pointer-events-none"
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-14 text-center space-y-5 sm:space-y-6">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[11px] sm:text-xs font-bold tracking-wide uppercase shadow-xs backdrop-blur-md">
          <Sparkles size={14} className="text-amber-400 shrink-0" aria-hidden="true" />
          <span className="truncate max-w-[280px] sm:max-w-none">{t.badge}</span>
        </div>

        {/* Title */}
        <h1
          className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight sm:leading-tight max-w-4xl mx-auto"
          style={{
            fontFamily: lang === "ar" ? "var(--font-serif-ar)" : "var(--font-serif-en)",
          }}
        >
          {t.title}
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl mx-auto text-xs sm:text-base md:text-lg text-slate-300 leading-relaxed font-normal px-2">
          {t.subtitle}
        </p>

        {/* Search */}
        <form
          onSubmit={handleSearchSubmit}
          className="max-w-2xl mx-auto w-full pt-1 sm:pt-2 px-1"
          aria-label="Search archive"
        >
          <div
            className={`relative flex items-center bg-slate-900/90 border rounded-2xl p-1.5 shadow-xl focus-within:border-blue-500 transition-all backdrop-blur-xl ${
              searchError ? "border-red-500/80" : "border-slate-700/80"
            }`}
          >
            <div className="ps-3 pe-2 text-slate-400 shrink-0">
              <Search size={18} aria-hidden="true" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (searchError) setSearchError("");
              }}
              placeholder={t.searchPlaceholder}
              aria-label={t.searchPlaceholder}
              aria-invalid={!!searchError}
              aria-describedby={searchError ? "search-error" : undefined}
              className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none py-2 px-1"
              disabled={isSearching}
            />
            <button
              type="submit"
              disabled={isSearching}
              className="min-h-[44px] px-4 sm:px-6 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm rounded-xl transition active:scale-95 shrink-0 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span>{isSearching ? "..." : t.searchBtn}</span>
              {dir === "rtl" ? (
                <ArrowLeft size={16} aria-hidden="true" />
              ) : (
                <ArrowRight size={16} aria-hidden="true" />
              )}
            </button>
          </div>

          {searchError && (
            <p id="search-error" className="text-red-400 text-xs mt-2" role="alert">
              {searchError}
            </p>
          )}

          {/* Tags */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-3">
            {t.quickTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleTagClick(tag)}
                className="min-h-[36px] px-3 py-1 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white text-[11px] font-medium transition active:scale-95 cursor-pointer"
              >
                #{tag}
              </button>
            ))}
          </div>
        </form>

        {/* Ad Banner */}
        <HeroAdBanner slotId="8877665544" />

        {/* CTAs */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-xs sm:max-w-none mx-auto">
          <Link
            to={getPath("/archive")}
            className="inline-flex items-center justify-center min-h-[48px] px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm uppercase tracking-wider shadow-md active:scale-95 transition-all touch-manipulation gap-2"
          >
            <BookOpen size={16} aria-hidden="true" />
            <span>{t.ctaPrimary}</span>
          </Link>
          <Link
            to={getPath("/library")}
            className="inline-flex items-center justify-center min-h-[48px] px-6 py-3 rounded-xl border border-slate-700/80 bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-bold text-xs sm:text-sm uppercase tracking-wider active:scale-95 transition-all touch-manipulation gap-2"
          >
            <FileText size={16} aria-hidden="true" />
            <span>{t.ctaSecondary}</span>
          </Link>
        </div>

        {/* Security Notice */}
        <div className="pt-3 flex items-center justify-center gap-1.5 text-emerald-400 text-[11px] font-medium">
          <ShieldCheck size={15} aria-hidden="true" />
          <span>{t.securityNotice}</span>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="relative z-10 w-full border-t border-slate-800/80 bg-slate-900/60 backdrop-blur-md py-4 mt-4">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-3 gap-2 sm:gap-6 text-center">
          {t.stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex flex-col items-center justify-center space-y-0.5">
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Icon size={16} aria-hidden="true" />
                  <span className="text-sm sm:text-lg md:text-xl font-extrabold text-white tracking-tight">
                    {stat.value}
                  </span>
                </div>
                <span className="text-[10px] sm:text-xs text-slate-400 font-medium truncate max-w-[100px] sm:max-w-none">
                  {stat.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
