import { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate, useParams } from "react-router";
import {
  Menu, X, ChevronDown, ChevronRight, Search, Scale, BookOpen,
  GraduationCap, Gavel, Users, Twitter, Youtube, Globe, Mail,
  Moon, Sun, Sparkles, User
} from "lucide-react";
import { trackPageView, initGA } from "../lib/analytics";
import { normalizeLang, useI18n, buildLocalizedPath, useLocalizedPath, LANGS, serifFont, sansFont, type Lang } from "../lib/i18n";
import { setOrganizationSchema } from "../lib/jsonld";
import { useReferralTracking, applyStoredReferralCode, storeReferralCode } from "../lib/referral";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { isSearchEngineBot, isGuestPiracyKey } from "../lib/security";
import { useRole } from "../hooks/useRole";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";

// Multilingual string helper
type L = Record<Lang, string>;
const t4 = (ar: string, fr: string, en: string, es: string): L => ({ ar, fr, en, es });

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
    <div className="bg-primary text-primary-foreground text-xs" role="status">
      <div className="max-w-7xl mx-auto px-6 h-9 flex items-center justify-between">
        <span className="font-semibold tracking-wide" style={{ fontFamily: serifFont(lang) }}>
          {t("motto")}
        </span>
        <div className="flex items-center gap-1">
          {LANGS.map(l => (
            <button 
              key={l.code} 
              onClick={() => handleLanguageChange(l.code)}
              aria-label={`Change language to ${l.label}`}
              className={`px-2 py-0.5 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-white/50 ${lang === l.code ? "bg-white/25 font-semibold" : "hover:bg-white/10"}`}
            >
              {l.code.toUpperCase()}
            </button>
          ))}
          <button 
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-white/10 transition-colors ms-2 focus:outline-none focus:ring-1 focus:ring-white/50"
          >
            {theme === "dark" ? <Sun size={13} aria-hidden="true" /> : <Moon size={13} aria-hidden="true" />}
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
    <div className="bg-primary text-primary-foreground rounded-xl p-3 flex items-center justify-between gap-2" role="toolbar" aria-label="Mobile site controls">
      <div className="flex items-center gap-1">
        {LANGS.map(l => (
          <button 
            key={l.code} 
            onClick={() => handleLanguageChange(l.code)}
            aria-label={`Change language to ${l.label}`}
            className={`px-2.5 py-1 text-xs rounded-lg transition-colors focus:outline-none focus:ring-1 focus:ring-white/50 ${lang === l.code ? "bg-white/25 font-semibold" : "hover:bg-white/10"}`}
          >
            {l.label}
          </button>
        ))}
      </div>
      <button 
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-white/10 hover:bg-white/20 transition-colors focus:outline-none focus:ring-1 focus:ring-white/50"
      >
        {theme === "dark" ? <Sun size={14} aria-hidden="true" /> : <Moon size={14} aria-hidden="true" />}
      </button>
    </div>
  );
}

// ── Navigation data (multilingual) ──────────────────────────────────────────────

interface MegaItem {
  label: L; icon: React.ReactNode; href: string;
  cols: { heading: L; links: { label: L; href: string }[] }[];
}

const megaMenuData: MegaItem[] = [
  {
    label: t4("المكتبة القانونية", "Bibliothèque", "Library", "Biblioteca"),
    icon: <BookOpen size={15} />, href: "/library",
    cols: [
      {
        heading: t4("فروع القانون", "Branches du droit", "Fields of Law", "Ramas del derecho"),
        links: [
          { label: t4("قانون الأسرة", "Droit de la famille", "Family Law", "Derecho de familia"), href: "/library/family-law" },
          { label: t4("القانون الجنائي", "Droit pénal", "Criminal Law", "Derecho penal"), href: "/library/criminal-law" },
          { label: t4("القانون التجاري", "Droit commercial", "Commercial Law", "Derecho mercantil"), href: "/library/commercial-law" },
          { label: t4("القانون الإداري", "Droit administratif", "Administrative Law", "Derecho administrativo"), href: "/library/administrative-law" },
          { label: t4("القانون الدستوري", "Droit constitutionnel", "Constitutional Law", "Derecho constitucional"), href: "/library/constitutional-law" },
        ],
      },
      {
        heading: t4("الوثائق", "Documents", "Documents", "Documentos"),
        links: [
          { label: t4("نصوص قانونية", "Textes de loi", "Legal Texts", "Textos legales"), href: "/library/texts" },
          { label: t4("مراسيم وزارية", "Décrets ministériels", "Ministerial Decrees", "Decretos ministeriales"), href: "/library/decrees" },
          { label: t4("قرارات محكمة النقض", "Arrêts de cassation", "Cassation Rulings", "Sentencias de casación"), href: "/library/court-decisions" },
          { label: t4("الدوريات الرسمية", "Journaux officiels", "Official Journals", "Boletines oficiales"), href: "/library/journals" },
        ],
      },
    ],
  },
  {
    label: t4("الأرشيف الجامعي", "Archives", "Archive", "Archivo"),
    icon: <GraduationCap size={15} />, href: "/archive",
    cols: [
      {
        heading: t4("الفصول الدراسية", "Semestres", "Semesters", "Semestres"),
        links: [
          { label: t4("الفصل الأول S1", "Semestre S1", "Semester S1", "Semestre S1"), href: "/archive?semester=s1" },
          { label: t4("الفصل الثاني S2", "Semestre S2", "Semester S2", "Semestre S2"), href: "/archive?semester=s2" },
          { label: t4("الفصل الثالث S3", "Semestre S3", "Semester S3", "Semestre S3"), href: "/archive?semester=s3" },
          { label: t4("الفصل السادس S6", "Semestre S6", "Semester S6", "Semestre S6"), href: "/archive?semester=s6" },
        ],
      },
      {
        heading: t4("كليات الحقوق", "Facultés de droit", "Law Schools", "Facultades de derecho"),
        links: [
          { label: t4("دليل الكليات", "Annuaire", "Full Directory", "Directorio completo"), href: "/schools" },
          { label: t4("محمد الخامس — الرباط", "Mohammed V — Rabat", "Mohammed V — Rabat", "Mohammed V — Rabat"), href: "/schools/um5-rabat-agdal" },
          { label: t4("الحسن الثاني — الدار البيضاء", "Hassan II — Casablanca", "Hassan II — Casablanca", "Hassan II — Casablanca"), href: "/schools/uh2-casablanca-ain-chock" },
          { label: t4("القاضي عياض — مراكش", "Cadi Ayyad — Marrakech", "Cadi Ayyad — Marrakech", "Cadi Ayyad — Marrakech"), href: "/schools/uqa-marrakech" },
          { label: t4("محمد الأول — وجدة", "Mohammed I — Oujda", "Mohammed I — Oujda", "Mohammed I — Oujda"), href: "/schools/umo-oujda" },
        ],
      },
    ],
  },
  {
    label: t4("الاجتهاد والقضاء", "Jurisprudence", "Jurisprudence", "Jurisprudencia"),
    icon: <Gavel size={15} />, href: "/library/jurisprudence",
    cols: [
      {
        heading: t4("أحكام قضائية", "Décisions de justice", "Court Rulings", "Sentencias judiciales"),
        links: [
          { label: t4("محكمة النقض", "Cour de cassation", "Court of Cassation", "Tribunal de casación"), href: "/library/cassation" },
          { label: t4("محاكم الاستئناف", "Cours d'appel", "Courts of Appeal", "Tribunales de apelación"), href: "/library/appeals" },
          { label: t4("المحاكم الإدارية", "Tribunaux administratifs", "Administrative Courts", "Tribunales administrativos"), href: "/library/administrative-courts" },
        ],
      },
      {
        heading: t4("الفقه والشرح", "Doctrine", "Doctrine", "Doctrina"),
        links: [
          { label: t4("مقالات أكاديمية", "Articles académiques", "Academic Articles", "Artículos académicos"), href: "/library/academic" },
          { label: t4("تعليقات على الأحكام", "Commentaires d'arrêts", "Case Commentaries", "Comentarios de sentencias"), href: "/library/commentary" },
          { label: t4("دراسات مقارنة", "Études comparées", "Comparative Studies", "Estudios comparados"), href: "/library/comparative" },
        ],
      },
    ],
  },
  {
    label: t4("عن المنصة", "À propos", "About", "Acerca de"),
    icon: <Users size={15} />, href: "/about",
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
      { label: t4("القانون الخاص", "Droit privé", "Private Law", "Derecho privado"), href: "/library/private-law" },
      { label: t4("القانون العام", "Droit public", "Public Law", "Derecho público"), href: "/library/public-law" },
      { label: t4("القانون الجنائي", "Droit pénal", "Criminal Law", "Derecho penal"), href: "/library/criminal-law" },
      { label: t4("القانون الدولي", "Droit international", "International Law", "Derecho internacional"), href: "/library/international-law" },
    ],
  },
  {
    heading: t4("الأرشيف", "Archives", "Archive", "Archivo"),
    links: [
      { label: t4("نماذج الامتحانات", "Sujets d'examen", "Exam Papers", "Exámenes"), href: "/archive" },
      { label: t4("كليات الحقوق", "Facultés de droit", "Law Schools", "Facultades de derecho"), href: "/schools" },
      { label: t4("ملخصات الدروس", "Résumés de cours", "Course Summaries", "Resúmenes de curso"), href: "/archive?type=summaries" },
      { label: t4("أطروحات الدكتوراه", "Thèses de doctorat", "Doctoral Theses", "Tesis doctorales"), href: "/archive?type=phd" },
    ],
  },
  {
    heading: t4("الموارد", "Ressources", "Resources", "Recursos"),
    links: [
      { label: t4("النصوص التشريعية", "Textes législatifs", "Legislative Texts", "Textos legislativos"), href: "/library/texts" },
      { label: t4("الجريدة الرسمية", "Bulletin officiel", "Official Gazette", "Boletín oficial"), href: "/library/official" },
      { label: t4("قرارات النقض", "Arrêts de cassation", "Cassation Rulings", "Sentencias de casación"), href: "/library/cassation" },
      { label: t4("الفقه المقارن", "Doctrine comparée", "Comparative Doctrine", "Doctrina comparada"), href: "/library/comparative" },
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

// ── Shared Nav Buttons Component (Premium Context aware) ─────────────────────

interface NavActionsProps {
  tier: "free" | "premium" | "enterprise";
  isAuthenticated: boolean;
}

function NavActions({ tier, isAuthenticated }: NavActionsProps) {
  const { lang, t } = useI18n();
  const localizedPath = useLocalizedPath();

  return (
    <div className="flex items-center gap-3">
      {/* 1. Go Premium upgrade tag (free tier only) */}
      {tier === "free" ? (
        <Link 
          to={localizedPath("/pricing")} 
          className="text-xs px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg hover:opacity-95 font-bold transition-all flex items-center gap-1.5 shadow-sm"
          style={{ fontFamily: sansFont(lang) }}
        >
          <Sparkles size={11} className="fill-current animate-pulse" />
          <span className="hidden sm:inline">{t4("ترقية الاشتراك ✨", "Premium ✨", "Go Premium ✨", "Premium ✨")[lang]}</span>
          <span className="sm:hidden">✨</span>
        </Link>
      ) : (
        <div className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold rounded-full flex items-center gap-1">
          <Sparkles size={10} className="fill-current animate-pulse" />
          <span>{tier === "enterprise" ? t4("شراكة جامعية", "Univ Access", "Univ", "Univ")[lang] : t4("بريميوم", "Premium", "Premium", "Premium")[lang]}</span>
        </div>
      )}

      {/* 2. Login/Profile Switcher */}
      {isAuthenticated ? (
        <Link 
          to={localizedPath("/profile")} 
          aria-label="Profile Panel"
          className="p-2 border border-border rounded-lg bg-card hover:bg-accent text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
        >
          <User size={15} />
        </Link>
      ) : (
        <Link 
          to={localizedPath("/login")} 
          className="text-sm px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary" 
          style={{ fontFamily: sansFont(lang) }}
        >
          {t("login")}
        </Link>
      )}
    </div>
  );
}

// ── Navbars ───────────────────────────────────────────────────────────────────

interface NavbarProps {
  tier: "free" | "premium" | "enterprise";
  isAuthenticated: boolean;
}

function NavDesktop({ tier, isAuthenticated }: NavbarProps) {
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
    <nav className="hidden lg:block bg-card/95 backdrop-blur-md sticky top-0 z-50 border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to={localizedPath("/")} className="flex items-center gap-3 shrink-0 focus:outline-none focus:ring-2 focus:ring-primary rounded-md p-1">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center" aria-hidden="true">
            <Scale size={16} className="text-primary-foreground" />
          </div>
          <div>
            <span className="block text-base font-bold text-foreground leading-none" style={{ fontFamily: serifFont(lang) }}>{t("brand_full")}</span>
            <span className="block text-[10px] text-muted-foreground tracking-widest font-mono mt-0.5">MIZAN LEGAL ARCHIVE</span>
          </div>
        </Link>

        {/* Dynamic navigation links */}
        <div className="flex items-center gap-1" role="menubar" aria-label="Main Navigation">
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
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:bg-accent focus:text-primary ${open === i ? "bg-accent text-primary" : "text-foreground/80 hover:bg-muted"}`}
                style={{ fontFamily: sansFont(lang) }}
                role="menuitem"
                aria-haspopup="true"
                aria-expanded={open === i}
              >
                <span className="text-primary/95" aria-hidden="true">{item.icon}</span>
                {item.label[lang]}
                <ChevronDown size={12} className={`transition-transform duration-200 ${open === i ? "rotate-180" : ""}`} aria-hidden="true" />
              </Link>
              {open === i && (
                <div 
                  className={`absolute top-full mt-1 bg-popover border border-border rounded-xl shadow-xl p-5 z-50 min-w-max animate-in fade-in slide-in-from-top-1 duration-150 ${dir === "rtl" ? "right-0" : "left-0"}`} 
                  dir={dir}
                  role="menu"
                >
                  <div className="flex gap-8">
                    {item.cols.map((col, ci) => (
                      <div key={ci} className="min-w-[160px]">
                        <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase mb-3 pb-2 border-b border-border">{col.heading[lang]}</p>
                        <ul className="space-y-2">
                          {col.links.map((lnk) => (
                            <li key={lnk.href} role="none">
                              <Link 
                                to={localizedPath(lnk.href)} 
                                className="text-sm text-foreground/80 hover:text-primary transition-colors flex items-center gap-1.5 group focus:outline-none focus:text-primary focus:underline rounded-sm p-0.5" 
                                style={{ fontFamily: sansFont(lang) }}
                                role="menuitem"
                              >
                                <ChevronRight size={11} className={`opacity-0 group-hover:opacity-100 text-primary transition-all ${dir === "rtl" ? "rotate-180" : ""}`} aria-hidden="true" />
                                {lnk.label[lang]}
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

        {/* Global Toolbar and Search Input */}
        <div className="flex items-center gap-4 shrink-0">
          <form onSubmit={handleSearch} className="relative" role="search" aria-label="Site-wide search">
            <Search size={14} className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground ${dir === "rtl" ? "right-3" : "left-3"}`} aria-hidden="true" />
            <input
              value={q} 
              onChange={e => setQ(e.target.value)}
              placeholder={t("search_placeholder")}
              aria-label={t("search_placeholder")}
              type="search"
              className={`w-40 py-1.5 text-sm border border-border rounded-lg bg-input-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all ${align} ${dir === "rtl" ? "pr-8 pl-3" : "pl-8 pr-3"}`}
              style={{ fontFamily: sansFont(lang) }}
            />
          </form>

          <NavActions tier={tier} isAuthenticated={isAuthenticated} />
        </div>
      </div>
    </nav>
  );
}

function NavTablet({ tier, isAuthenticated }: NavbarProps) {
  const { lang, dir, t } = useI18n();
  const localizedPath = useLocalizedPath();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const align = dir === "rtl" ? "text-right" : "text-left";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) { navigate(localizedPath(`/search?q=${encodeURIComponent(q.trim())}`)); setOpen(false); }
  };

  return (
    <nav className="hidden md:block lg:hidden bg-card/95 backdrop-blur-md sticky top-0 z-50 border-b border-border shadow-sm">
      <div className="px-5 h-14 flex items-center justify-between">
        <Link to={localizedPath("/")} className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary rounded-md p-1">
          <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center" aria-hidden="true">
            <Scale size={14} className="text-primary-foreground" />
          </div>
          <span className="font-bold text-sm text-foreground" style={{ fontFamily: serifFont(lang) }}>{t("brand_full")}</span>
        </Link>
        
        <div className="flex items-center gap-3">
          <NavActions tier={tier} isAuthenticated={isAuthenticated} />
          <button 
            onClick={() => setOpen(!open)} 
            className="p-2 text-muted-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            aria-expanded={open}
            aria-label="Toggle navigation drawer"
          >
            {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-border bg-card px-5 py-4 space-y-3" dir={dir}>
          <MobileControls />
          <form onSubmit={handleSearch} className="flex gap-2" role="search" aria-label="Tablet search">
            <input 
              value={q} 
              onChange={e => setQ(e.target.value)} 
              placeholder={t("search_placeholder_long")}
              aria-label={t("search_placeholder_long")}
              type="search"
              className={`flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-input-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary ${align}`}
              style={{ fontFamily: sansFont(lang) }} 
            />
            <button 
              type="submit" 
              aria-label="Submit search"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
                className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-accent hover:border-primary/30 focus:bg-accent focus:border-primary/30 focus:outline-none transition-colors text-sm text-foreground/80 font-medium"
                style={{ fontFamily: sansFont(lang) }}
                role="menuitem"
              >
                <span className="text-primary" aria-hidden="true">{item.icon}</span>
                {item.label[lang]}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

function NavPhone({ tier, isAuthenticated }: NavbarProps) {
  const { lang, dir, t } = useI18n();
  const localizedPath = useLocalizedPath();
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const align = dir === "rtl" ? "text-right" : "text-left";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) { navigate(localizedPath(`/search?q=${encodeURIComponent(q.trim())}`)); setMenuOpen(false); }
  };

  return (
    <nav className="md:hidden bg-card/95 backdrop-blur-md sticky top-0 z-50 border-b border-border shadow-sm">
      <div className="px-4 h-14 flex items-center justify-between">
        <Link to={localizedPath("/")} className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary rounded-md p-1">
          <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center" aria-hidden="true">
            <Scale size={14} className="text-primary-foreground" />
          </div>
          <span className="font-bold text-sm text-foreground" style={{ fontFamily: serifFont(lang) }}>{t("brand_full")}</span>
        </Link>

        <div className="flex items-center gap-2">
          <NavActions tier={tier} isAuthenticated={isAuthenticated} />
          <button 
            onClick={() => setMenuOpen(!menuOpen)} 
            className="p-2 text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            aria-expanded={menuOpen}
            aria-label="Toggle navigation menu"
          >
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="border-t border-border bg-card max-h-[75vh] overflow-y-auto" dir={dir}>
          <form onSubmit={handleSearch} className="flex gap-2 p-4 border-b border-border" role="search" aria-label="Mobile search">
            <input 
              value={q} 
              onChange={e => setQ(e.target.value)} 
              placeholder={t("search_placeholder")}
              aria-label={t("search_placeholder")}
              type="search"
              className={`flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-input-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary ${align}`}
              style={{ fontFamily: sansFont(lang) }} 
            />
            <button 
              type="submit" 
              aria-label="Submit mobile search"
              className="px-4 bg-primary text-primary-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary flex items-center justify-center"
            >
              <Search size={14} aria-hidden="true" />
            </button>
          </form>
          <div role="menu" aria-label="Mobile Directory">
            {megaMenuData.map((item, i) => (
              <div key={i} className="border-b border-border last:border-0">
                <button 
                  onClick={() => setExpanded(expanded === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-foreground hover:bg-muted focus:outline-none focus:bg-muted"
                  style={{ fontFamily: sansFont(lang) }}
                  aria-expanded={expanded === i}
                  role="menuitem"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-primary" aria-hidden="true">{item.icon}</span>
                    {item.label[lang]}
                  </div>
                  <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-200 ${expanded === i ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
                {expanded === i && (
                  <div className="bg-muted px-5 pb-3">
                    {item.cols.map((col, ci) => (
                      <div key={ci} className="mt-3">
                        <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase mb-2">{col.heading[lang]}</p>
                        <div className="space-y-1">
                          {col.links.map((lnk) => (
                            <Link 
                              key={lnk.href} 
                              to={localizedPath(lnk.href)} 
                              onClick={() => setMenuOpen(false)}
                              className="block text-sm text-foreground/70 hover:text-primary py-1 focus:outline-none focus:text-primary"
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
          <div className="p-4 space-y-3">
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
  { name: "Cloudflare", full: t4("برنامج منح Cloudflare", "Programme Cloudflare Grant", "Cloudflare Grant Program", "Programa Cloudflare Grant"), tier: t4("شريك البنية التحتية", "Partenaire d'infrastructure", "Infrastructure Partner", "Socio de infraestructura"), icon: <Globe size={20} /> },
];

function SponsorRibbon() {
  const { lang, dir, t } = useI18n();
  return (
    <section className="border-t border-border bg-card/50" dir={dir} aria-labelledby="sponsors-heading">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h3 id="sponsors-heading" className="text-center text-[11px] font-bold text-muted-foreground tracking-widest uppercase mb-5">
          {t("sponsors_heading")}
        </h3>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin md:justify-center md:overflow-visible">
          {sponsors.map(s => (
            <div 
              key={s.name}
              className="shrink-0 flex items-center gap-3 px-5 py-3 rounded-xl border border-border bg-background hover:border-primary/40 transition-colors min-w-[240px]"
            >
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center text-primary shrink-0" aria-hidden="true">
                {s.icon}
              </div>
              <div>
                <div className="text-sm font-bold text-foreground" style={{ fontFamily: serifFont(lang) }}>{s.name}</div>
                <div className="text-[10px] text-muted-foreground" style={{ fontFamily: sansFont(lang) }}>{s.full[lang]}</div>
                <div className="text-[10px] text-primary font-semibold mt-0.5">{s.tier[lang]}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Footer System (Completed & Desktop/Mobile fallback combined) ─────────────────

function Footer() {
  const { lang, dir, t } = useI18n();
  const localizedPath = useLocalizedPath();
  return (
    <footer className="border-t border-border bg-muted mt-16" aria-label="Platform footer">
      <div className="max-w-7xl mx-auto px-6 py-12" dir={dir}>
        
        {/* Top footer grid links */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mb-10">
          <div className="col-span-2 lg:col-span-1">
            <Link to={localizedPath("/")} className="flex items-center gap-2 mb-4 focus:outline-none focus:ring-2 focus:ring-primary rounded p-1 w-fit">
              <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center" aria-hidden="true">
                <Scale size={15} className="text-primary-foreground" />
              </div>
              <span className="font-bold text-foreground" style={{ fontFamily: serifFont(lang) }}>{t("brand_full")}</span>
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4" style={{ fontFamily: sansFont(lang) }}>
              {t("footer_tagline")}
            </p>
            <div className="flex gap-2" aria-label="Social media connections">
              {[Twitter, Youtube, Globe].map((Icon, i) => (
                <a 
                  key={i} 
                  href="#" 
                  aria-label={`Visit our external platform account`}
                  className="w-8 h-8 border border-border rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <Icon size={14} aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
          
          {footerCols.map((col, i) => (
            <div key={i}>
              <h4 className="text-xs font-bold text-foreground tracking-wide uppercase mb-3 pb-2 border-b border-border">{col.heading[lang]}</h4>
              <ul className="space-y-2">
                {col.links.map((lnk) => (
                  <li key={lnk.href}>
                    <Link 
                      to={lnk.href} 
                      className="text-xs text-muted-foreground hover:text-primary transition-colors focus:outline-none focus:underline" 
                      style={{ fontFamily: sansFont(lang) }}
                    >
                      {lnk.label[lnk.href === "/pricing" ? lang : lang]}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Legal links and copyright row */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-border gap-4">
          <p className="text-xs text-muted-foreground font-mono">© 2026 Mizan Legal · {t("brand_full")}</p>
          <div className="flex items-center gap-4" aria-label="Legal terms">
            {legalLinks.map((lnk) => (
              <Link 
                key={lnk.href} 
                to={localizedPath(lnk.href)} 
                className="text-xs text-muted-foreground hover:text-primary transition-colors focus:outline-none focus:underline" 
                style={{ fontFamily: sansFont(lang) }}
              >
                {lnk.label[lang]}
              </Link>
            ))}
          </div>
        </div>

      </div>
    </footer>
  );
}

// ── Global Root Layout Shell ──────────────────────────────────────────────────

export default function Layout() {
  const { lang, dir, setLang } = useI18n();
  const { lang: routeLang } = useParams<{ lang: string }>();
  const location = useLocation();

  useEffect(() => {
    const normalized = normalizeLang(routeLang);
    if (normalized !== lang) {
      setLang(normalized);
    }
  }, [routeLang, lang, setLang]);
  const [tier, setTier] = useState<"free" | "premium" | "enterprise">("free");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { isGuest, isLoading: roleLoading } = useRole();
  const [piracyDialogOpen, setPiracyDialogOpen] = useState(false);
  const [piracyDialogReason, setPiracyDialogReason] = useState<string | null>(null);

  // Initialize referral engines & JSONLD parameters on layout mount
  useReferralTracking();

  useEffect(() => {
    setOrganizationSchema();
    initGA();
  }, []);

  // Track Google Analytics page transitions
  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);

  // Persist a referral code from the URL for later signup conversion.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(location.search);
    const referralCode = params.get("ref") || params.get("referral_code");
    if (referralCode) {
      storeReferralCode(referralCode);
    }
  }, [location.search]);

  // Prevent simple guest piracy actions like copy / screenshot hotkeys.
  useEffect(() => {
    const isBot = isSearchEngineBot();
    if (isAuthenticated || isBot) return;

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      setPiracyDialogReason("right-click");
      setPiracyDialogOpen(true);
    };

    const handleCopy = (event: ClipboardEvent) => {
      if (event.defaultPrevented) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setPiracyDialogReason("copy");
      setPiracyDialogOpen(true);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isGuestPiracyKey(event)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const reason = event.key.toLowerCase() === "printscreen" || event.key.toLowerCase() === "print" ? "screenshot" : "copy";
        setPiracyDialogReason(reason);
        setPiracyDialogOpen(true);
      }
    };

    window.addEventListener("contextmenu", handleContextMenu, true);
    window.addEventListener("copy", handleCopy, true);
    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu, true);
      window.removeEventListener("copy", handleCopy, true);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isAuthenticated]);

  // Synchronize dynamic Supabase user authentication & active license tiers
  useEffect(() => {
    async function getUserDetails() {
      if (!isSupabaseConfigured) return;
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setIsAuthenticated(true);
          const { data, error } = await supabase
            .from("profiles")
            .select("tier")
            .eq("id", user.id)
            .single();

          if (!error && data?.tier) {
            setTier(data.tier as "free" | "premium" | "enterprise");
          }

          try {
            await applyStoredReferralCode(user.id);
          } catch {
            // defer referral application until network is available
          }
        } else {
          setIsAuthenticated(false);
          setTier("free");
        }
      } catch {
        setTier("free");
      }
    }
    getUserDetails();

    // Dynamically listen for auth mutations (login, logout, token refreshes)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      if (!session) {
        setTier("free");
      } else {
        getUserDetails();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const piracyDialogTitle = piracyDialogReason === "right-click"
    ? "Right-click blocked"
    : piracyDialogReason === "screenshot"
      ? "Screenshot protection enabled"
      : "Copy disabled";

  const piracyDialogMessage = piracyDialogReason === "right-click"
    ? "Right-click is disabled for guest browsing. Please sign in or upgrade to unlock premium protections and copy access."
    : piracyDialogReason === "screenshot"
      ? "Screenshot shortcuts are disabled while browsing as a guest. Log in or upgrade for a more seamless experience."
      : "Copying text is disabled for guest visitors. Create an account to capture content safely and avoid piracy.";

  return (
    <Dialog open={piracyDialogOpen} onOpenChange={setPiracyDialogOpen}>
      <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200" dir={dir} style={{ userSelect: isGuest && !isSearchEngineBot() ? "none" : undefined }}>
        {/* 1. Global localization utility banner */}
        <UtilityBar />

        {/* 2. Responsive Header Navigation triggers */}
        <NavDesktop tier={tier} isAuthenticated={isAuthenticated} />
        <NavTablet tier={tier} isAuthenticated={isAuthenticated} />
        <NavPhone tier={tier} isAuthenticated={isAuthenticated} />

        {/* 3. Core dynamic page contents viewport */}
        <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 py-6" id="main-content">
          <Outlet />
        </main>

        {/* 4. Strategic sponsors & academic partners */}
        <SponsorRibbon />

        {/* 5. Monolithic multilingual platform footer */}
        <Footer />
      </div>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{piracyDialogTitle}</DialogTitle>
          <DialogDescription>{piracyDialogMessage}</DialogDescription>
        </DialogHeader>
        <div className="pt-3 text-sm text-muted-foreground">
          {isGuest
            ? "Guest browsing is restricted to protect content quality. Sign in or subscribe to lift these limits."
            : "If this prompt is unexpected, refresh the page or contact support."}
        </div>
        <DialogFooter>
          <DialogClose className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary">
            Close
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}