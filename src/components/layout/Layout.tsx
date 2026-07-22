import React, { useState, useEffect } from "react";
import { useLocation, Link, useNavigate, Outlet } from "react-router-dom";
import {
  Menu, X, ChevronDown, ChevronRight, Search, Scale, BookOpen,
  GraduationCap, Gavel, Users, Moon, Sun, Sparkles, User
} from "lucide-react";
import { trackPageView, initGA } from "../../lib/analytics";
import { useI18n, LANGS, type Lang } from "../../lib/i18n";
import { setOrganizationSchema } from "../../lib/jsonld";
import { useReferralTracking } from "../../lib/referral";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import { useRole } from "../../hooks/useRole";
import { AuthModal } from "../auth/AuthModal";
import { useLocalizedPath, buildLocalizedPath } from "../../lib/navigation";

// Dynamic font helpers based on language
const serifFont = (lang: Lang) => (lang === "ar" ? "font-serif" : "font-serif");
const sansFont = (lang: Lang) => (lang === "ar" ? "font-sans" : "font-sans");

// Multilingual string helper
type L = Record<Lang, string>;
const t4 = (ar: string, fr: string, en: string, es: string): L => ({ ar, fr, en, es });

// ── Top Utility Bar ────────────────────────────────────────────────────────────

function UtilityBar() {
  const { lang, setLang, theme, setTheme, t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLanguageChange = (targetLang: Lang) => {
    if (targetLang === lang) return;
    setLang(targetLang);
    navigate(buildLocalizedPath(location.pathname, targetLang), { replace: false });
  };

  return (
    <div className="bg-blue-600 dark:bg-blue-950 text-white text-xs border-b border-blue-700 dark:border-blue-900 transition-colors" role="status">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-9 flex items-center justify-between">
        <span className="font-semibold tracking-wide text-white truncate" style={{ fontFamily: serifFont(lang) }}>
          {t("motto")}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {LANGS.map((l) => (
            <button 
              key={l.code} 
              type="button"
              onClick={() => handleLanguageChange(l.code)}
              aria-label={`Change language to ${l.label}`}
              className={`px-2 py-1 rounded text-[11px] transition-colors focus:outline-none focus:ring-1 focus:ring-white/40 cursor-pointer touch-manipulation ${
                lang === l.code ? "bg-white/20 text-white font-bold" : "hover:bg-white/10 text-blue-100"
              }`}
            >
              {l.code.toUpperCase()}
            </button>
          ))}
          <button 
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="flex items-center justify-center p-1 rounded hover:bg-white/10 text-blue-100 transition-colors ms-1.5 cursor-pointer touch-manipulation"
          >
            {theme === "dark" ? <Sun size={14} aria-hidden="true" /> : <Moon size={14} aria-hidden="true" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function MobileControls() {
  const { lang, setLang, theme, setTheme } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLanguageChange = (targetLang: Lang) => {
    if (targetLang === lang) return;
    setLang(targetLang);
    navigate(buildLocalizedPath(location.pathname, targetLang), { replace: false });
  };

  return (
    <div className="bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 rounded-xl p-3 flex items-center justify-between gap-2 select-none" role="toolbar" aria-label="Mobile site controls">
      <div className="flex items-center gap-1">
        {LANGS.map((l) => (
          <button 
            key={l.code} 
            type="button"
            onClick={() => handleLanguageChange(l.code)}
            aria-label={`Change language to ${l.label}`}
            className={`min-h-[36px] px-3 py-1.5 text-xs rounded-lg font-medium transition-colors focus:outline-none cursor-pointer touch-manipulation ${
              lang === l.code ? "bg-blue-600 text-white font-bold shadow-xs" : "hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
      <button 
        type="button"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        className="min-h-[36px] px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors focus:outline-none cursor-pointer border border-slate-200 dark:border-slate-700 touch-manipulation"
      >
        {theme === "dark" ? <Sun size={14} aria-hidden="true" /> : <Moon size={14} aria-hidden="true" />}
      </button>
    </div>
  );
}

// ── Navigation Data ─────────────────────────────────────────────────────────────

interface MegaItem {
  label: L; 
  icon: React.ReactNode; 
  href: string;
  cols: { heading: L; links: { label: L; href: string }[] }[];
}

const megaMenuData: MegaItem[] = [
  {
    label: t4("المكتبة القانونية", "Bibliothèque", "Library", "Biblioteca"),
    icon: <BookOpen size={15} />, 
    href: "/library",
    cols: [
      {
        heading: t4("فروع القانون", "Branches du droit", "Fields of Law", "Ramas del derecho"),
        links: [
          { label: t4("قانون الأسرة", "Droit de la famille", "Family Law", "Derecho de familia"), href: "/library?category=family-law" },
          { label: t4("القانون الجنائي", "Droit pénal", "Criminal Law", "Derecho penal"), href: "/library?category=criminal-law" },
          { label: t4("القانون التجاري", "Droit commercial", "Commercial Law", "Derecho mercantil"), href: "/library?category=commercial-law" },
          { label: t4("القانون الإداري", "Droit administratif", "Administrative Law", "Derecho administrativo"), href: "/library?category=administrative-law" },
          { label: t4("القانون الدستوري", "Droit constitutionnel", "Constitutional Law", "Derecho constitucional"), href: "/library?category=constitutional-law" },
        ],
      },
      {
        heading: t4("الوثائق", "Documents", "Documents", "Documentos"),
        links: [
          { label: t4("نصوص قانونية", "Textes de loi", "Legal Texts", "Textos legales"), href: "/library?type=texts" },
          { label: t4("مراسيم وزارية", "Décrets ministériels", "Ministerial Decrees", "Decretos ministeriales"), href: "/library?type=decrees" },
          { label: t4("قرارات محكمة النقض", "Arrêts de cassation", "Cassation Rulings", "Sentencias de casación"), href: "/library?type=court-decisions" },
          { label: t4("الدوريات الرسمية", "Journaux officiels", "Official Journals", "Boletines oficiales"), href: "/library?type=journals" },
        ],
      },
    ],
  },
  {
    label: t4("الأرشيف الجامعي", "Archives", "Archive", "Archivo"),
    icon: <GraduationCap size={15} />, 
    href: "/archive",
    cols: [
      {
        heading: t4("الفصول الدراسية", "Semestres", "Semesters", "Semestres"),
        links: [
          { label: t4("الفصل الأول S1", "Semestre S1", "Semester S1", "Semestre S1"), href: "/archive?semester=s1" },
          { label: t4("الفصل الثاني S2", "Semestre S2", "Semester S2", "Semestre S2"), href: "/archive?semester=s2" },
          { label: t4("الفصل الثالث S3", "Semestre S3", "Semester S3", "Semestre S3"), href: "/archive?semester=s3" },
          { label: t4("الفصل الرابع S4", "Semestre S4", "Semester S4", "Semestre S4"), href: "/archive?semester=s4" },
          { label: t4("الفصل الخامس S5", "Semestre S5", "Semester S5", "Semestre S5"), href: "/archive?semester=s5" },
          { label: t4("الفصل السادس S6", "Semestre S6", "Semester S6", "Semestre S6"), href: "/archive?semester=s6" },
        ],
      },
      {
        heading: t4("كليات الحقوق", "Facultés de droit", "Law Schools", "Facultades de derecho"),
        links: [
          { label: t4("دليل الكليات", "Annuaire", "Full Directory", "Directorio completo"), href: "/schools" },
          { label: t4("محمد الخامس — الرباط", "Mohammed V — Rabat", "Mohammed V — Rabat", "Mohammed V — Rabat"), href: "/schools/rabat" },
          { label: t4("الحسن الثاني — الدار البيضاء", "Hassan II — Casablanca", "Hassan II — Casablanca", "Hassan II — Casablanca"), href: "/schools/casablanca" },
          { label: t4("القاضي عياض — مراكش", "Cadi Ayyad — Marrakech", "Cadi Ayyad — Marrakech", "Cadi Ayyad — Marrakech"), href: "/schools/marrakech" },
          { label: t4("محمد الأول — وجدة", "Mohammed I — Oujda", "Mohammed I — Oujda", "Mohammed I — Oujda"), href: "/schools/oujda" },
        ],
      },
    ],
  },
  {
    label: t4("الاجتهاد والقضاء", "Jurisprudence", "Jurisprudence", "Jurisprudencia"),
    icon: <Gavel size={15} />, 
    href: "/jurisprudence",
    cols: [
      {
        heading: t4("أحكام قضائية", "Décisions de justice", "Court Rulings", "Sentencias judiciales"),
        links: [
          { label: t4("محكمة النقض", "Cour de cassation", "Court of Cassation", "Tribunal de casación"), href: "/jurisprudence?court=cassation" },
          { label: t4("محاكم الاستئناف", "Cours d'appel", "Courts of Appeal", "Tribunales de apelación"), href: "/jurisprudence?court=appeals" },
          { label: t4("المحاكم الإدارية", "Tribunaux administratifs", "Administrative Courts", "Tribunales administrativos"), href: "/jurisprudence?court=administrative" },
        ],
      },
      {
        heading: t4("الفقه والشرح", "Doctrine", "Doctrine", "Doctrina"),
        links: [
          { label: t4("مقالات أكاديمية", "Articles académiques", "Academic Articles", "Artículos académicos"), href: "/jurisprudence?type=academic" },
          { label: t4("تعليقات على الأحكام", "Commentaires d'arrêts", "Case Commentaries", "Comentarios de sentencias"), href: "/jurisprudence?type=commentary" },
          { label: t4("دراسات مقارنة", "Études comparées", "Comparative Studies", "Estudios comparados"), href: "/jurisprudence?type=comparative" },
        ],
      },
    ],
  },
  {
    label: t4("عن المنصة", "À propos", "About", "Acerca de"),
    icon: <Users size={15} />, 
    href: "/about",
    cols: [
      {
        heading: t4("ميزان", "Mizan", "Mizan", "Mizan"),
        links: [
          { label: t4("من نحن", "Qui sommes-nous", "About Us", "Quiénes somos"), href: "/about" },
          { label: t4("خطط الأسعار ✨", "Tarifs ✨", "Subscription Plans ✨", "Precios ✨"), href: "/pricing" },
          { label: t4("هيئة التحرير", "Comité éditorial", "Editorial Board", "Consejo editorial"), href: "/about#team" },
          { label: t4("شركاء أكاديميون", "Partenaires académiques", "Academic Partners", "Socios académicos"), href: "/about#partners" },
          { label: t4("اتصل بنا", "Contact", "Contact", "Contacto"), href: "/contact" },
        ],
      },
    ],
  },
];

const footerCols: { heading: L; links: { label: L; href: string }[] }[] = [
  {
    heading: t4("المكتبة", "Bibliothèque", "Library", "Biblioteca"),
    links: [
      { label: t4("القانون الخاص", "Droit privé", "Private Law", "Derecho privado"), href: "/library?category=family-law" },
      { label: t4("القانون العام", "Droit public", "Public Law", "Derecho público"), href: "/library?category=constitutional-law" },
      { label: t4("القانون الجنائي", "Droit pénal", "Criminal Law", "Derecho penal"), href: "/library?category=criminal-law" },
      { label: t4("القانون الدولي", "Droit international", "International Law", "Derecho internacional"), href: "/library?category=international-law" },
    ],
  },
  {
    heading: t4("الأرشيف", "Archives", "Archive", "Archivo"),
    links: [
      { label: t4("نماذج الامتحانات", "Sujets d'examen", "Exam Papers", "Exámenes"), href: "/archive?type=exams" },
      { label: t4("كليات الحقوق", "Facultés de droit", "Law Schools", "Facultades de derecho"), href: "/schools" },
      { label: t4("ملخصات الدروس", "Résumés de cours", "Course Summaries", "Resúmenes de curso"), href: "/archive?type=summaries" },
      { label: t4("أطروحات الدكتوراه", "Thèses de doctorat", "Doctoral Theses", "Tesis doctorales"), href: "/archive?type=phd" },
    ],
  },
  {
    heading: t4("الموارد", "Ressources", "Resources", "Recursos"),
    links: [
      { label: t4("النصوص التشريعية", "Textes législatifs", "Legal Texts", "Textos legislativos"), href: "/library?type=texts" },
      { label: t4("الجريدة الرسمية", "Bulletin officiel", "Official Gazette", "Boletín oficial"), href: "/library?type=journals" },
      { label: t4("قرارات النقض", "Arrêts de cassation", "Cassation Rulings", "Sentencias de casación"), href: "/jurisprudence?court=cassation" },
      { label: t4("الفقه المقارن", "Doctrine comparée", "Comparative Doctrine", "Doctrina comparada"), href: "/jurisprudence?type=comparative" },
    ],
  },
  {
    heading: t4("المنصة", "Plateforme", "Platform", "Plataforma"),
    links: [
      { label: t4("من نحن", "Qui sommes-nous", "About Us", "Quiénes somos"), href: "/about" },
      { label: t4("هيئة التحرير", "Comité éditorial", "Editorial Board", "Consejo editorial"), href: "/about#team" },
      { label: t4("الشراكات", "Partenariats", "Partnerships", "Alianzas"), href: "/about#partners" },
      { label: t4("اتصل بنا", "Contact", "Contact", "Contacto"), href: "/contact" },
    ],
  },
];

const legalLinks: { label: L; href: string }[] = [
  { label: t4("سياسة الخصوصية", "Confidentialité", "Privacy Policy", "Privacidad"), href: "/legal/privacy" },
  { label: t4("شروط الاستخدام", "Conditions d'utilisation", "Terms of Use", "Términos de uso"), href: "/legal/terms" },
  { label: t4("إخلاء المسؤولية", "Non-Responsabilité", "Legal Disclaimer", "Exención"), href: "/legal/disclaimer" },
];

// ── Action Buttons ─────────────────────────────────────────────────────────────

interface NavActionsProps {
  tier: "free" | "premium" | "enterprise";
  isAuthenticated: boolean;
  onOpenAuth: () => void;
}

function NavActions({ tier, isAuthenticated, onOpenAuth }: NavActionsProps) {
  const { lang, t } = useI18n();
  const localizedPath = useLocalizedPath();

  return (
    <div className="flex items-center gap-2.5">
      {tier === "free" ? (
        <Link 
          to={localizedPath("/pricing")} 
          className="text-xs sm:text-sm px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all flex items-center gap-1.5 shadow-xs touch-manipulation min-h-[38px]"
          style={{ fontFamily: sansFont(lang) }}
        >
          <Sparkles size={13} className="fill-current animate-pulse shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline">{t4("ترقية الاشتراك ✨", "Premium ✨", "Go Premium ✨", "Premium ✨")[lang]}</span>
          <span className="sm:hidden">✨</span>
        </Link>
      ) : (
        <div className="px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold rounded-full flex items-center gap-1 select-none">
          <Sparkles size={11} className="fill-current animate-pulse shrink-0" aria-hidden="true" />
          <span>{tier === "enterprise" ? t4("شراكة جامعية", "Univ Access", "Univ", "Univ")[lang] : t4("بريميوم", "Premium", "Premium", "Premium")[lang]}</span>
        </div>
      )}

      {isAuthenticated ? (
        <Link 
          to={localizedPath("/profile")} 
          aria-label="Profile Panel"
          className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-center min-h-[38px] min-w-[38px] touch-manipulation"
        >
          <User size={16} aria-hidden="true" />
        </Link>
      ) : (
        <button 
          type="button"
          onClick={onOpenAuth} 
          className="text-xs sm:text-sm px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl transition-all font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs touch-manipulation min-h-[38px]" 
          style={{ fontFamily: sansFont(lang) }}
        >
          {t("login")}
        </button>
      )}
    </div>
  );
}

// ── Main Navbars ─────────────────────────────────────────────────────────────

interface NavbarProps {
  tier: "free" | "premium" | "enterprise";
  isAuthenticated: boolean;
  onOpenAuth: () => void;
}

function NavDesktop({ tier, isAuthenticated, onOpenAuth }: NavbarProps) {
  const { lang, dir, t } = useI18n();
  const localizedPath = useLocalizedPath();
  const [open, setOpen] = useState<number | null>(null);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const align = dir === "rtl" ? "text-right" : "text-left";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate(localizedPath(`/search?q=${encodeURIComponent(q.trim())}`));
  };

  return (
    <nav className="hidden lg:block bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to={localizedPath("/")} className="flex items-center gap-3 shrink-0 focus:outline-none rounded-md p-1">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center" aria-hidden="true">
            <Scale size={18} className="text-white" />
          </div>
          <div>
            <span className="block text-base font-bold text-slate-900 dark:text-slate-100 leading-none" style={{ fontFamily: serifFont(lang) }}>{t("brand_full")}</span>
            <span className="block text-[10px] text-slate-500 dark:text-slate-400 tracking-widest font-mono mt-0.5">MIZAN LEGAL ARCHIVE</span>
          </div>
        </Link>

        <div className="flex items-center gap-1" role="navigation" aria-label="Main Navigation">
          {megaMenuData.map((item, i) => (
            <div 
              key={i} 
              className="relative" 
              onMouseEnter={() => setOpen(i)} 
              onMouseLeave={() => setOpen(null)}
              onFocus={() => setOpen(i)}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setOpen(null);
                }
              }}
            >
              <Link 
                to={localizedPath(item.href)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  open === i 
                    ? "bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400" 
                    : "text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
                style={{ fontFamily: sansFont(lang) }}
                aria-haspopup="true"
                aria-expanded={open === i}
              >
                <span className="text-slate-500 dark:text-slate-400" aria-hidden="true">{item.icon}</span>
                <span>{item.label[lang]}</span>
                <ChevronDown size={12} className={`transition-transform duration-200 ${open === i ? "rotate-180" : ""}`} aria-hidden="true" />
              </Link>

              {open === i && (
                <div 
                  className={`absolute top-full mt-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-6 z-50 min-w-max animate-in fade-in duration-150 ${
                    dir === "rtl" ? "right-0" : "left-0"
                  }`} 
                  dir={dir}
                >
                  <div className="flex gap-8">
                    {item.cols.map((col, ci) => (
                      <div key={ci} className="min-w-[180px]">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-200 tracking-wider uppercase mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
                          {col.heading[lang]}
                        </p>
                        <ul className="space-y-1">
                          {col.links.map((lnk) => (
                            <li key={lnk.href}>
                              <Link 
                                to={localizedPath(lnk.href)} 
                                onClick={() => setOpen(null)}
                                className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/60 dark:hover:bg-blue-950/40 px-3 py-2 rounded-lg transition-all flex items-center gap-2 group" 
                                style={{ fontFamily: sansFont(lang) }}
                              >
                                <ChevronRight size={12} className={`opacity-0 group-hover:opacity-100 text-blue-600 dark:text-blue-400 transition-all shrink-0 ${dir === "rtl" ? "rotate-180" : ""}`} aria-hidden="true" />
                                <span>{lnk.label[lang]}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <form onSubmit={handleSearch} className="relative" role="search" aria-label="Site-wide search">
            <Search size={14} className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${dir === "rtl" ? "right-3" : "left-3"}`} aria-hidden="true" />
            <input
              value={q} 
              onChange={e => setQ(e.target.value)}
              placeholder={t("search_placeholder")}
              aria-label={t("search_placeholder")}
              type="search"
              className={`w-40 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all ${align} ${dir === "rtl" ? "pr-8 pl-3" : "pl-8 pr-3"}`}
              style={{ fontFamily: sansFont(lang) }}
            />
          </form>

          <NavActions tier={tier} isAuthenticated={isAuthenticated} onOpenAuth={onOpenAuth} />
        </div>
      </div>
    </nav>
  );
}

function NavTablet({ tier, isAuthenticated, onOpenAuth }: NavbarProps) {
  const { lang, dir, t } = useI18n();
  const localizedPath = useLocalizedPath();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const align = dir === "rtl" ? "text-right" : "text-left";

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) { 
      navigate(localizedPath(`/search?q=${encodeURIComponent(q.trim())}`)); 
      setOpen(false); 
    }
  };

  return (
    <nav className="hidden md:block lg:hidden bg-white dark:bg-slate-900 sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
      <div className="px-5 h-14 flex items-center justify-between">
        <Link to={localizedPath("/")} className="flex items-center gap-2 rounded-md p-1">
          <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center" aria-hidden="true">
            <Scale size={15} className="text-white" />
          </div>
          <span className="font-bold text-sm text-slate-900 dark:text-slate-100" style={{ fontFamily: serifFont(lang) }}>{t("brand_full")}</span>
        </Link>
        
        <div className="flex items-center gap-3">
          <NavActions tier={tier} isAuthenticated={isAuthenticated} onOpenAuth={onOpenAuth} />
          <button 
            type="button"
            onClick={() => setOpen(!open)} 
            className="p-2 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-expanded={open}
            aria-label="Toggle navigation drawer"
          >
            {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 space-y-3" dir={dir}>
          <MobileControls />
          <form onSubmit={handleSearch} className="flex gap-2" role="search" aria-label="Tablet search">
            <input 
              value={q} 
              onChange={e => setQ(e.target.value)} 
              placeholder={t("search_placeholder_long")}
              aria-label={t("search_placeholder_long")}
              type="search"
              className={`flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 ${align}`}
              style={{ fontFamily: sansFont(lang) }} 
            />
            <button 
              type="submit" 
              aria-label="Submit search"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm cursor-pointer font-bold touch-manipulation"
            >
              <Search size={14} aria-hidden="true" />
            </button>
          </form>
          <div className="grid grid-cols-2 gap-2" role="menu">
            {megaMenuData.map((item, i) => (
              <Link 
                key={i} 
                to={localizedPath(item.href)} 
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 font-medium touch-manipulation min-h-[44px]"
                style={{ fontFamily: sansFont(lang) }}
                role="menuitem"
              >
                <span className="text-blue-600 dark:text-blue-400" aria-hidden="true">{item.icon}</span>
                <span>{item.label[lang]}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

function NavPhone({ tier, isAuthenticated, onOpenAuth }: NavbarProps) {
  const { lang, dir, t } = useI18n();
  const localizedPath = useLocalizedPath();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const align = dir === "rtl" ? "text-right" : "text-left";

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) { 
      navigate(localizedPath(`/search?q=${encodeURIComponent(q.trim())}`)); 
      setMenuOpen(false); 
    }
  };

  return (
    <nav className="md:hidden bg-white dark:bg-slate-900 sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
      <div className="px-4 h-14 flex items-center justify-between">
        <Link to={localizedPath("/")} className="flex items-center gap-2 rounded-md p-1">
          <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center" aria-hidden="true">
            <Scale size={15} className="text-white" />
          </div>
          <span className="font-bold text-sm text-slate-900 dark:text-slate-100" style={{ fontFamily: serifFont(lang) }}>{t("brand_full")}</span>
        </Link>

        <div className="flex items-center gap-1.5">
          <NavActions 
            tier={tier} 
            isAuthenticated={isAuthenticated} 
            onOpenAuth={() => {
              setMenuOpen(false);
              onOpenAuth();
            }} 
          />
          <button 
            type="button"
            onClick={() => setMenuOpen(!menuOpen)} 
            className="p-2 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-expanded={menuOpen}
            aria-label="Toggle navigation menu"
          >
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 max-h-[75vh] overflow-y-auto" dir={dir}>
          <form onSubmit={handleSearch} className="flex gap-2 p-4 border-b border-slate-200 dark:border-slate-800" role="search" aria-label="Mobile search">
            <input 
              value={q} 
              onChange={e => setQ(e.target.value)} 
              placeholder={t("search_placeholder")}
              aria-label={t("search_placeholder")}
              type="search"
              className={`flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 ${align}`}
              style={{ fontFamily: sansFont(lang) }} 
            />
            <button 
              type="submit" 
              aria-label="Submit mobile search"
              className="px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center cursor-pointer touch-manipulation min-h-[44px]"
            >
              <Search size={16} aria-hidden="true" />
            </button>
          </form>
          <div role="menu" aria-label="Mobile Directory">
            {megaMenuData.map((item, i) => (
              <div key={i} className="border-b border-slate-200 dark:border-slate-800 last:border-0">
                <button 
                  type="button"
                  onClick={() => setExpanded(expanded === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-bold text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer touch-manipulation min-h-[48px]"
                  style={{ fontFamily: sansFont(lang) }}
                  aria-expanded={expanded === i}
                  role="menuitem"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-blue-600 dark:text-blue-400" aria-hidden="true">{item.icon}</span>
                    <span>{item.label[lang]}</span>
                  </div>
                  <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${expanded === i ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
                {expanded === i && (
                  <div className="bg-slate-50 dark:bg-slate-800/40 px-5 pb-3">
                    {item.cols.map((col, ci) => (
                      <div key={ci} className="mt-3">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-200 tracking-wider uppercase mb-2">{col.heading[lang]}</p>
                        <div className="space-y-1">
                          {col.links.map((lnk) => (
                            <Link 
                              key={lnk.href} 
                              to={localizedPath(lnk.href)} 
                              onClick={() => setMenuOpen(false)}
                              className="block text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 py-1.5 touch-manipulation"
                              style={{ fontFamily: sansFont(lang) }}
                              role="menuitem"
                            >
                              {lnk.label[lang]}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="p-4">
            <MobileControls />
          </div>
        </div>
      )}
    </nav>
  );
}

// ── Sponsor Ribbon ──────────────────────────────────────────────────────────────

const sponsors: { name: string; full: L; tier: L; icon: React.ReactNode }[] = [
  { name: "AMILS", full: t4("الجمعية المغربية للدراسات القانونية", "Association Marocaine des Études Juridiques", "Moroccan Association for Legal Studies", "Asociación Marroquí de Estudios Jurídicos"), tier: t4("شريك مؤسّس", "Partenaire fondateur", "Founding Partner", "Socio fundador"), icon: <Scale size={20} /> },
  { name: "MLKF", full: t4("مؤسسة المعرفة القانونية المغربية", "Fondation Marocaine du Savoir Juridique", "Moroccan Legal Knowledge Foundation", "Fundación Marroquí del Saber Jurídico"), tier: t4("مؤسسة داعمة", "Fondation partenaire", "Supporting Foundation", "Fundación colaboradora"), icon: <BookOpen size={20} /> },
  { name: "Cloudflare", full: t4("برنامج منح Cloudflare", "Programme Cloudflare Grant", "Cloudflare Grant Program", "Programa Cloudflare Grant"), tier: t4("شريك البنية التحتية", "Partenaire d'infrastructure", "Infrastructure Partner", "Socio de infraestructura"), icon: <Users size={20} /> },
];

function SponsorRibbon() {
  const { lang, dir, t } = useI18n();
  return (
    <section className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 transition-colors" dir={dir} aria-labelledby="sponsors-heading">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h3 id="sponsors-heading" className="text-center text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-widest uppercase mb-5 select-none">
          {t("sponsors_heading")}
        </h3>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin md:justify-center md:overflow-visible">
          {sponsors.map((s) => (
            <div 
              key={s.name}
              className="shrink-0 flex items-center gap-3 px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-colors min-w-[240px]"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true">
                {s.icon}
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: serifFont(lang) }}>{s.name}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{s.tier[lang]}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Global Layout Component ──────────────────────────────────────────────────

export default function Layout() {
  const { lang, dir } = useI18n();
  const localizedPath = useLocalizedPath();
  const location = useLocation();
  
  const { tier } = useRole(); 
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      if (session) {
        setIsAuthModalOpen(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    initGA();
    trackPageView(location.pathname + location.search);
    setOrganizationSchema();
  }, [location]);

  useReferralTracking();

  const handleOpenAuth = () => setIsAuthModalOpen(true);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors" dir={dir}>
      <UtilityBar />

      <NavDesktop tier={tier} isAuthenticated={isAuthenticated} onOpenAuth={handleOpenAuth} />
      <NavTablet tier={tier} isAuthenticated={isAuthenticated} onOpenAuth={handleOpenAuth} />
      <NavPhone tier={tier} isAuthenticated={isAuthenticated} onOpenAuth={handleOpenAuth} />

      <main className="flex-1 flex flex-col animate-fade-in">
        <Outlet />
      </main>

      <SponsorRibbon />

      <footer className="bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 mt-auto transition-colors" dir={dir} aria-label="Global Site Footer">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {footerCols.map((col, idx) => (
            <div key={idx}>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 tracking-widest uppercase mb-4 pb-1 border-b border-slate-200 dark:border-slate-800">
                {col.heading[lang]}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((lnk, lidx) => (
                  <li key={lidx}>
                    <Link 
                      to={localizedPath(lnk.href)}
                      className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors block py-0.5"
                      style={{ fontFamily: sansFont(lang) }}
                    >
                      {lnk.label[lang]}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 px-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              &copy; {new Date().getFullYear()} {lang === 'ar' ? 'منصة ميزان الرقمية. جميع الحقوق محفوظة.' : 'Mizan Digital Platform. All rights reserved.'}
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center">
              {legalLinks.map((ll, lidx) => (
                <Link 
                  key={lidx}
                  to={localizedPath(ll.href)}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors"
                  style={{ fontFamily: sansFont(lang) }}
                >
                  {ll.label[lang]}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        lang={lang}
        dir={dir}
      />
    </div>
  );
}