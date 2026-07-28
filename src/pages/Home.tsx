import { useState, useEffect, useCallback, ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  TrendingUp,
  Clock,
  Star,
  Search,
  BookOpen,
  Scale,
  GraduationCap,
  FileText,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  PenTool,
  Lock,
  CheckCircle2,
} from "lucide-react";

import { getArticles } from "../lib/supabase";
import { ImageWithFallback } from "../components/common/ImageWithFallback";
import { useI18n, useLocalizedPath, serifFont, sansFont, type Lang } from "../lib/i18n";
import { useSeo } from "../lib/seo";
import { setWebSiteSchema, clearSchema } from "../lib/jsonld";
import { useRole } from "../hooks/useRole";
import AdSenseSlot from "../components/ads/AdSenseSlot";

// Environment Configuration
const SITE_URL = import.meta.env.VITE_SITE_URL || "https://www.mizan.page";

// High-performance optimized WebP image with multi-resolution support
const HERO_IMG = "https://images.unsplash.com/photo-1759732419233-5b84c4cb5a9c?crop=entropy&cs=tinysrgb&fit=max&fm=webp&q=80&w=1440";
const HERO_IMG_ALT = {
  ar: "ميزان - البوابة القانونية المغربية والشاملة للحقوق والاجتهاد القضائي",
  fr: "Mizan - Portail juridique marocain, législation et jurisprudence",
  en: "Mizan - Moroccan Legal Portal, Legislation and Case Law",
  es: "Mizan - Portal jurídico marroquí, legislación y jurisprudencia",
};

type L = Record<Lang, string>;
const t4 = (ar: string, fr: string, en: string, es: string): L => ({ ar, fr, en, es });

// Complete, self-contained Article interface to resolve TS export mismatch
export interface LocalArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  views: number;
  is_featured: boolean;
  created_at: string;
  updated_at?: string;
  tags?: string[];
  titleL?: L;
  excerptL?: L;
  categoryL?: L;
  imageAltL?: L;
}

// Input Sanitizer to prevent XSS & Injection attacks
function sanitizeInput(str: string): string {
  return str
      .replace(/[<>]/g, "")
      .trim()
      .slice(0, 150);
}

// Master SEO Keywords targeted Mock Articles for initial rendering & fallbacks
const MOCK_ARTICLES: LocalArticle[] = [
  {
    id: "1",
    slug: "family-law-s1-2026",
    views: 4200,
    is_featured: true,
    created_at: "2026-07-13T10:00:00Z",
    updated_at: "2026-07-13T10:00:00Z",
    tags: ["S1", "2026", "مدونة الأسرة", "FSJES"],
    title: "أسئلة وأجوبة امتحان قانون الأسرة S1 — المغرب 2026",
    excerpt: "نماذج إجابات شاملة تغطي مدوّنة الأسرة: الزواج، الطلاق، النسب والحضانة وفق أحدث الاجتهادات القضائية.",
    category: "قانون الأسرة",
    titleL: t4(
        "أسئلة وأجوبة امتحان قانون الأسرة S1 — المغرب 2026",
        "Examen de droit de la famille S1 — Maroc 2026",
        "Family Law Exam S1 Questions & Answers — Morocco 2026",
        "Examen de derecho de familia S1 — Marruecos 2026"
    ),
    excerptL: t4(
        "نماذج إجابات شاملة تغطي مدوّنة الأسرة: الزواج، الطلاق، النسب والحضانة وفق أحدث الاجتهادات القضائية.",
        "Corrigés complets couvrant le Code de la famille : mariage, divorce, filiation et garde d'enfants.",
        "Comprehensive answer keys covering the Family Code: marriage, divorce, filiation, and child custody.",
        "Respuestas completas sobre el Código de Familia marroquí: matrimonio, divorcio, filiación y custodia."
    ),
    categoryL: t4("قانون الأسرة", "Droit de la famille", "Family Law", "Derecho de familia"),
    imageAltL: t4(
        "امتحان قانون الأسرة S1 المغرب مدونة الأسرة",
        "Examen de droit de la famille S1 Code de la famille Maroc",
        "Moroccan Family Law S1 Exam paper Mizan portal",
        "Examen de derecho de familia S1 Marruecos Mizan"
    ),
  },
  {
    id: "2",
    slug: "criminal-procedure-2025-2026",
    views: 3100,
    is_featured: false,
    created_at: "2026-07-12T10:00:00Z",
    updated_at: "2026-07-12T10:00:00Z",
    title: "مستجدات قانون المسطرة الجنائية — تعديلات 2025-2026",
    excerpt: "تحليل معمّق للتعديلات الأخيرة على قانون المسطرة الجنائية المغربي وضمانات المحاكمة العادلة.",
    category: "القانون الجنائي",
    titleL: t4(
        "مستجدات قانون المسطرة الجنائية — تعديلات 2025-2026",
        "Nouveautés du Code de procédure pénale — Modifications 2025-2026",
        "Criminal Procedure Code Updates — 2025-2026 Reforms",
        "Novedades del Código de Procedimiento Penal — Reformas 2025-2026"
    ),
    excerptL: t4(
        "تحليل معمّق للتعديلات الأخيرة على قانون المسطرة الجنائية المغربي وضمانات المحاكمة العادلة.",
        "Analyse approfondie des dernières modifications du Code de procédure pénale marocain et garanties du procès équitable.",
        "In-depth analysis of the latest amendments to the Moroccan Criminal Procedure Code and fair trial guarantees.",
        "Análisis profundo de las últimas reformas del Código de Procedimiento Penal marroquí y garantías procesales."
    ),
    categoryL: t4("القانون الجنائي", "Droit pénal", "Criminal Law", "Derecho penal"),
    imageAltL: t4(
        "المسطرة الجنائية المغربية والقانون الجنائي",
        "Code de procédure pénale marocain et droit pénal",
        "Moroccan Criminal Procedure Code book analysis",
        "Código de procedimiento penal de Marruecos"
    ),
  },
  {
    id: "3",
    slug: "company-contract-cassation",
    views: 1850,
    is_featured: false,
    created_at: "2026-07-10T10:00:00Z",
    updated_at: "2026-07-10T10:00:00Z",
    title: "عقد الشركة وإشكالاته القانونية في ضوء أحكام محكمة النقض",
    excerpt: "دراسة مقارنة وتحليل أحدث قرارات محكمة النقض المغربية في المنازعات التجارية وعقود الشركات.",
    category: "القانون التجاري",
    titleL: t4(
        "عقد الشركة وإشكالاته القانونية في ضوء أحكام محكمة النقض",
        "Le contrat de société à la lumière des arrêts de la Cour de cassation",
        "Company Contracts & Disputes in Light of Cassation Rulings",
        "El contrato de sociedad según la jurisprudencia del Tribunal de Casación"
    ),
    excerptL: t4(
        "دراسة مقارنة وتحليل أحدث قرارات محكمة النقض المغربية في المنازعات التجارية وعقود الشركات.",
        "Étude comparative et analyse des récents arrêts de la Cour de cassation marocaine en droit commercial.",
        "Comparative analysis of recent Moroccan Supreme Court / Cassation decisions in commercial disputes.",
        "Estudio comparado de las sentencias del Tribunal de Casación en materia mercantil."
    ),
    categoryL: t4("القانون التجاري", "Droit commercial", "Commercial Law", "Derecho mercantil"),
    imageAltL: t4(
        "قرارات محكمة النقض المغربية القانون التجاري",
        "Arrêts de la Cour de cassation marocaine droit commercial",
        "Moroccan Supreme Court Cassation decision document",
        "Jurisprudencia del Tribunal de Casación mercantil"
    ),
  },
  {
    id: "4",
    slug: "legality-administrative-law",
    views: 1420,
    is_featured: false,
    created_at: "2026-07-08T10:00:00Z",
    updated_at: "2026-07-08T10:00:00Z",
    title: "مبدأ المشروعية في القانون الإداري المغربي — دراسة تحليلية",
    excerpt: "رصد لأحدث اجتهادات المحاكم الإدارية حول القرار الإداري ودعوى إلغاء المقررات بسبب شطط السلطة.",
    category: "القانون الإداري",
    titleL: t4(
        "مبدأ المشروعية في القانون الإداري المغربي — دراسة تحليلية",
        "Le principe de légalité en droit administratif marocain — Étude analytique",
        "The Principle of Legality in Moroccan Administrative Law",
        "El principio de legalidad en el derecho administrativo marroquí"
    ),
    excerptL: t4(
        "رصد لأحدث اجتهادات المحاكم الإدارية حول القرار الإداري ودعوى إلغاء المقررات بسبب شطط السلطة.",
        "Aperçu de la jurisprudence administrative récente sur le recours pour excès de pouvoir.",
        "Overview of recent administrative court decisions regarding abuse of power and annulment lawsuits.",
        "Repaso de la jurisprudencia administrativa sobre el recurso por exceso de poder."
    ),
    categoryL: t4("القانون الإداري", "Droit administratif", "Administrative Law", "Derecho administrativo"),
    imageAltL: t4(
        "القانون الإداري المغربي والمحاكم الإدارية",
        "Droit administratif marocain et tribunaux administratifs",
        "Moroccan Administrative Law courtroom and legal texts",
        "Derecho administrativo marroquí Mizan"
    ),
  },
];

const TRENDING_TOPICS: { slug: string; name: L }[] = [
  { slug: "mudawana-reform", name: t4("إصلاح مدوّنة الأسرة 2026", "Réforme du Code de la famille 2026", "Family Code Reform 2026", "Reforma del Código de Familia 2026") },
  { slug: "s1-exams", name: t4("امتحانات S1 2026", "Examens S1 2026", "S1 Exams 2026", "Exámenes S1 2026") },
  { slug: "law-103-13", name: t4("قانون رقم 103.13", "Loi n° 103.13", "Law No. 103.13", "Ley n.º 103.13") },
  { slug: "divorce-discord", name: t4("الطلاق للشقاق", "Divorce pour discorde", "Divorce for Discord", "Divorcio por desavenencia") },
  { slug: "joint-custody", name: t4("الحضانة والنفقة", "Garde et pension alimentaire", "Custody & Alimony", "Custodia y pensión") },
  { slug: "electronic-contracts", name: t4("العقد الإلكتروني", "Contrat électronique", "Electronic Contracts", "Contrato electrónico") },
];

const FAQ_ITEMS: { q: L; a: L }[] = [
  {
    q: t4(
        "ما هو موقع ميزان (Mizan) وما الخدامات التي يقدمها؟",
        "Qu'est-ce que la plateforme Mizan et quels services offre-t-elle ?",
        "What is Mizan Legal Portal and what services does it offer?",
        "¿Qué es la plataforma Mizan y qué servicios ofrece?"
    ),
    a: t4(
        "ميزان هو منصة قانونية وثقافية مغربية شاملة توفر النص الشامل للقوانين والجريدة الرسمية، اجتهادات محكمة النقض، ملخصات كليات الحقوق (FSJES من S1 إلى S6)، ونماذج الامتحانات.",
        "Mizan est une plateforme juridique marocaine complète offrant l'accès aux textes de loi, au Bulletin Officiel, aux arrêts de la Cour de cassation et aux cours pour étudiants en droit (FSJES S1 à S6).",
        "Mizan is a comprehensive Moroccan legal platform providing full statutory texts, Official Journals, Cassation Court decisions, and law school resources (FSJES S1 to S6).",
        "Mizan es una plataforma jurídica marroquí que ofrece acceso a leyes, Boletín Oficial, sentencias de Casación y recursos para estudiantes de derecho (FSJES S1 a S6)."
    ),
  },
  {
    q: t4(
        "كيف يمكنني الوصول إلى امتحانات كليات الحقوق والدروس؟",
        "Comment accéder aux examens et cours des facultés de droit ?",
        "How can I access law school exams and study guides?",
        "¿Cómo puedo acceder a exámenes y apuntes de derecho?"
    ),
    a: t4(
        "يمكنك الانتقال فوراً إلى قسم الأرشيف الجامعي أو اختيار الفصل المطلوب (من S1 إلى S6) للحصول على المراجع والامتحانات المصححة مجاناً.",
        "Vous pouvez accéder directement à la section Archives universitaires ou choisir le semestre souhaité (S1 à S6) pour télécharger les examens corrigés.",
        "Navigate directly to the University Archive section or select your target semester (S1 to S6) to access free study materials and answer keys.",
        "Acceda directamente a la sección de Archivo Universitario o seleccione el semestre deseado (S1 a S6) para consultar exámenes resueltos."
    ),
  },
];

// --- Article Card Component ---
function ArticleCard({ article, featured = false }: { article: LocalArticle; featured?: boolean }) {
  const { lang, dir, t } = useI18n();
  const localizedPath = useLocalizedPath();

  const timeAgo = useCallback(
      (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const h = Math.floor(diff / 3600000);
        if (h < 24) return t("time_hours_ago") ? t("time_hours_ago").replace("{n}", String(h)) : `${h}h ago`;
        const days = Math.floor(h / 24);
        return t("time_days_ago") ? t("time_days_ago").replace("{n}", String(days)) : `${days}d ago`;
      },
      [t]
  );

  const title = article.titleL?.[lang] ?? article.title;
  const excerpt = article.excerptL?.[lang] ?? article.excerpt;
  const category = article.categoryL?.[lang] ?? article.category;
  const articleUrl = localizedPath(`/article/${article.slug}`);

  return (
      <article
          itemScope
          itemType="https://schema.org/Article"
          className={`group bg-card/90 backdrop-blur-sm border border-border/80 rounded-2xl p-4 sm:p-5 hover:shadow-xl hover:border-primary/50 transition-all duration-300 flex flex-col justify-between active:scale-[0.99] touch-manipulation ${
              featured ? "md:col-span-2 bg-gradient-to-br from-card via-card to-primary/5 border-primary/30" : "col-span-1"
          }`}
          dir={dir}
      >
        <meta itemProp="mainEntityOfPage" content={`${SITE_URL}${articleUrl}`} />
        <meta itemProp="headline" content={title} />
        <meta itemProp="description" content={excerpt} />

        <div>
          {/* Category Badge & Trending Indicator */}
          <div className="flex items-center justify-between gap-2 mb-3">
          <span
              itemProp="articleSection"
              className={`text-xs font-bold px-3 py-1 rounded-full border transition-colors ${
                  article.is_featured
                      ? "bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300/40"
                      : "bg-primary/10 text-primary border-primary/20"
              }`}
          >
            {category}
          </span>
            {article.is_featured && (
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-extrabold flex items-center gap-1 shrink-0 bg-amber-50 dark:bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-200/50">
              <TrendingUp size={12} aria-hidden="true" />
                  {t("trending_badge") || "مميز"}
            </span>
            )}
          </div>

          {/* Title */}
          <Link to={articleUrl} className="block group-hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded-lg">
            <h3
                itemProp="name"
                className={`font-bold text-foreground leading-snug mb-2.5 ${
                    featured ? "text-lg sm:text-2xl md:text-3xl" : "text-base sm:text-lg"
                }`}
                style={{ fontFamily: serifFont(lang) }}
            >
              {title}
            </h3>
          </Link>

          {/* Excerpt */}
          <p
              itemProp="abstract"
              className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-3"
              style={{ fontFamily: sansFont(lang) }}
          >
            {excerpt}
          </p>
        </div>

        {/* Meta Bar & CTA */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/60 gap-2 flex-wrap">
          <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-medium">
            <Clock size={13} className="text-primary/70" aria-hidden="true" />
            <time itemProp="datePublished" dateTime={article.created_at}>
              {timeAgo(article.created_at)}
            </time>
          </span>
            <span className="flex items-center gap-1 font-medium">
            <Star size={13} className="text-amber-500" aria-hidden="true" />
              {article.views.toLocaleString()} {t("reads") || "قراءة"}
          </span>
          </div>

          <Link
              to={articleUrl}
              aria-label={`${t("read_more") || "اقرأ المزيد"}: ${title}`}
              className="text-primary hover:text-primary/80 font-bold flex items-center gap-1 text-xs py-1.5 px-3 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors min-h-[40px]"
              style={{ fontFamily: sansFont(lang) }}
          >
            <span>{t("read_more") || "اقرأ المزيد"}</span>
            <ArrowRight size={13} className={dir === "rtl" ? "rotate-180" : ""} aria-hidden="true" />
          </Link>
        </div>
      </article>
  );
}

// --- Main Home Component ---
export default function Home() {
  const { lang, dir, theme, t } = useI18n();
  const localizedPath = useLocalizedPath();
  const navigate = useNavigate();
  const { isStaff, canWriteContent, role } = useRole();

  const [articles, setArticles] = useState<LocalArticle[]>(MOCK_ARTICLES);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [honeypotBot, setHoneypotBot] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Master SEO Setup
  useSeo(
      {
        title: `${t("hero_title") || "ميزان - المنصة القانونية الرقمية الأولى بالمغرب"} | Mizan.page`,
        description:
            t("hero_subtitle") ||
            "أكبر مكتبة قانونية مغربية تجمع النصوص التشريعية، اجتهادات محكمة النقض، الجريدة الرسمية، وأرشيف امتحانات FSJES.",
        path: "/",
        keywords: [
          "ميزان",
          "Mizan",
          "القانون المغربي",
          "droit marocain",
          "Moroccan Law",
          "مدونة الأسرة",
          "المسطرة الجنائية",
          "محكمة النقض",
          "FSJES",
          "امتحانات القانون S1 S2 S3 S4 S5 S6",
          "الجريدة الرسمية المغربية",
          "مباريات الماستر القانون",
        ],
        lang,
      },
      [lang]
  );

  // Inject Google WebSite & FAQ JSON-LD Structured Data
  useEffect(() => {
    setWebSiteSchema();

    const faqSchemaData = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ_ITEMS.map((item) => ({
        "@type": "Question",
        name: item.q[lang],
        acceptedAnswer: {
          "@type": "Answer",
          text: item.a[lang],
        },
      })),
    };

    const script = document.createElement("script");
    script.id = "faq-jsonld";
    script.type = "application/ld+json";
    script.text = JSON.stringify(faqSchemaData);
    document.head.appendChild(script);

    return () => {
      clearSchema("ld-webpage");
      const existingFaq = document.getElementById("faq-jsonld");
      if (existingFaq) existingFaq.remove();
    };
  }, [lang]);

  // Fetch Live Articles from Supabase safely
  useEffect(() => {
    let isMounted = true;
    getArticles({ limit: 8, featured: false })
        .then((res: unknown) => {
          // Extract array safely from result response or direct array
          const list = Array.isArray(res)
              ? res
              : (res as { data?: LocalArticle[] })?.data;

          if (isMounted && Array.isArray(list) && list.length > 0) {
            setArticles(list as LocalArticle[]);
          }
        })
        .catch(() => {
          // Fallback to MOCK_ARTICLES
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });

    return () => {
      isMounted = false;
    };
  }, []);

  // Search Handler
  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleanQuery = sanitizeInput(searchQuery);
    if (cleanQuery) {
      navigate(localizedPath(`/search?q=${encodeURIComponent(cleanQuery)}`));
    }
  };

  // Newsletter Subscription
  const handleNewsletterSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (honeypotBot) return;
    const cleanEmail = sanitizeInput(newsletterEmail);
    if (cleanEmail && cleanEmail.includes("@")) {
      setSubscribed(true);
      setNewsletterEmail("");
    }
  };

  const arrowFlip = dir === "rtl" ? "rotate-180" : "";

  return (
      <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
        {/* Staff & Writer Quick Panel */}
        {isStaff && (
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white text-xs py-2 px-4 shadow-md border-b border-blue-500/30">
              <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 font-medium">
                  <ShieldCheck size={16} className="text-emerald-400" />
                  <span>
                {lang === "ar" ? "لوحة الإدارة السريعة" : "Staff Portal"} — {role.toUpperCase()}
              </span>
                </div>
                <div className="flex items-center gap-3">
                  {canWriteContent && (
                      <Link
                          to={localizedPath("/writer/editor")}
                          className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-bold transition-colors min-h-[32px]"
                      >
                        <PenTool size={13} />
                        <span>{lang === "ar" ? "كتابة مقال جديد" : "New Article"}</span>
                      </Link>
                  )}
                  <Link
                      to={localizedPath("/admin")}
                      className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 font-semibold transition-colors min-h-[32px]"
                  >
                    <Lock size={13} />
                    <span>{lang === "ar" ? "لوحة التحكم" : "Dashboard"}</span>
                  </Link>
                </div>
              </div>
            </div>
        )}

        {/* Hero Section */}
        <section className="relative isolate overflow-hidden text-white" dir={dir}>
          <figure
              itemScope
              itemType="https://schema.org/ImageObject"
              className="absolute inset-0 w-full h-full m-0 p-0"
          >
            <ImageWithFallback
                src={HERO_IMG}
                alt={HERO_IMG_ALT[lang]}
                title={HERO_IMG_ALT[lang]}
                itemProp="contentUrl"
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover object-center transform scale-105 transition-transform duration-1000"
            />
            <meta itemProp="caption" content={HERO_IMG_ALT[lang]} />
          </figure>

          <div
              className="absolute inset-0"
              style={{
                background:
                    theme === "dark"
                        ? "radial-gradient(120% 100% at 50% 30%, rgba(10,15,26,0.75) 0%, rgba(10,15,26,0.95) 60%, rgba(6,10,20,0.99) 100%)"
                        : "radial-gradient(120% 100% at 50% 30%, rgba(15,23,42,0.70) 0%, rgba(30,58,138,0.88) 60%, rgba(15,23,42,0.97) 100%)",
              }}
          />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20 md:py-28">
            <div className="max-w-3xl mx-auto md:mx-0 text-center md:text-start">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold mb-4 sm:mb-6 text-amber-300">
                <Sparkles size={14} className="animate-pulse" />
                <span>{lang === "ar" ? "المنصة القانونية والأكاديمية الموثوقة بالمغرب" : "Morocco's Leading Legal Knowledge Engine"}</span>
              </div>

              <h1
                  className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-4 drop-shadow-md"
                  style={{ fontFamily: serifFont(lang) }}
              >
                {t("hero_title") || "ميزان — مرجعك القانوني والشامل بالمغرب"}
              </h1>

              <p
                  className="text-white/90 text-sm sm:text-base md:text-lg max-w-2xl mb-6 sm:mb-8 leading-relaxed font-normal mx-auto md:mx-0"
                  style={{ fontFamily: sansFont(lang) }}
              >
                {t("hero_subtitle") ||
                    "موسوعة رقمية تجمع النصوص التشريعية، اجتهادات محكمة النقض، الجريدة الرسمية، وأرشيف امتحانات الحقوق بكليات FSJES."}
              </p>

              {/* Search Bar */}
              <form onSubmit={handleSearchSubmit} className="relative max-w-xl mb-6 sm:mb-8 mx-auto md:mx-0">
                <div className="relative flex items-center">
                  <input
                      type="search"
                      value={searchQuery}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                      placeholder={
                        lang === "ar"
                            ? "ابحث عن قانون، اجتهاد قضائي، أو مادة دراسية..."
                            : lang === "fr"
                                ? "Rechercher une loi, jurisprudence ou cours..."
                                : lang === "es"
                                    ? "Buscar ley, jurisprudencia o asignatura..."
                                    : "Search laws, court rulings, or courses..."
                      }
                      className="w-full h-12 sm:h-14 rtl:pr-11 ltr:pl-11 rtl:pl-28 ltr:pr-28 rounded-2xl bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm sm:text-base font-medium shadow-xl backdrop-blur-md border border-white/30 outline-none focus:ring-2 focus:ring-primary transition-all"
                      style={{ fontFamily: sansFont(lang) }}
                  />
                  <Search size={18} className="absolute rtl:right-4 ltr:left-4 text-slate-400 pointer-events-none" />
                  <button
                      type="submit"
                      className="absolute rtl:left-1.5 ltr:right-1.5 h-9 sm:h-11 px-4 bg-primary text-primary-foreground font-bold rounded-xl text-xs sm:text-sm hover:bg-primary/90 transition-colors shadow-md min-h-[38px] flex items-center justify-center"
                      style={{ fontFamily: sansFont(lang) }}
                  >
                    {lang === "ar" ? "بحث" : "Search"}
                  </button>
                </div>
              </form>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto">
                <Link
                    to={localizedPath("/library")}
                    className="w-full sm:w-auto text-center px-6 py-3.5 bg-white text-blue-950 font-extrabold rounded-2xl hover:bg-slate-100 transition-colors text-sm shadow-lg min-h-[48px] flex items-center justify-center gap-2 active:scale-95 touch-manipulation"
                    style={{ fontFamily: sansFont(lang) }}
                >
                  <BookOpen size={18} />
                  <span>{t("hero_cta_library") || "المكتبة الرقمية"}</span>
                </Link>
                <Link
                    to={localizedPath("/archive")}
                    className="w-full sm:w-auto text-center px-6 py-3.5 bg-white/10 hover:bg-white/20 border border-white/40 text-white font-bold rounded-2xl backdrop-blur-md transition-colors text-sm min-h-[48px] flex items-center justify-center gap-2 active:scale-95 touch-manipulation"
                    style={{ fontFamily: sansFont(lang) }}
                >
                  <GraduationCap size={18} />
                  <span>{t("hero_cta_archive") || "الأرشيف الجامعي (S1-S6)"}</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Horizontal Semester Bar */}
        <section className="bg-card/90 border-y border-border py-3 shadow-sm sticky top-0 z-30 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <span className="text-xs font-extrabold text-muted-foreground whitespace-nowrap rtl:ml-2 ltr:mr-2 flex items-center gap-1">
              <Scale size={14} className="text-primary" />
              {lang === "ar" ? "الفصول الدراسية:" : "Semesters:"}
            </span>
              {["S1", "S2", "S3", "S4", "S5", "S6"].map((s) => (
                  <Link
                      key={s}
                      to={localizedPath(`/archive?semester=${s.toLowerCase()}`)}
                      className="px-3.5 py-1.5 rounded-xl bg-muted/80 hover:bg-primary hover:text-primary-foreground text-xs font-bold transition-all whitespace-nowrap shrink-0 min-h-[36px] flex items-center"
                      style={{ fontFamily: sansFont(lang) }}
                  >
                    {t("semester_label") || "الفصل"} {s}
                  </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Pillars Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {[
              {
                icon: BookOpen,
                title: t4("المكتبة التشريعية", "Textes Législatifs", "Legislative Texts", "Textos Legislativos"),
                desc: t4("القوانين والمراسيم والمدونات", "Lois, décrets et codes", "Laws, decrees, and codes", "Leyes y decretos"),
                path: "/library",
                color: "text-blue-600 bg-blue-500/10",
              },
              {
                icon: Scale,
                title: t4("الاجتهاد القضائي", "Jurisprudence", "Case Law", "Jurisprudencia"),
                desc: t4("قرارات أحكام محكمة النقض", "Arrêts de la Cour de cassation", "Cassation court decisions", "Sentencias de Casación"),
                path: "/documents/cassation-rulings",
                color: "text-amber-600 bg-amber-500/10",
              },
              {
                icon: GraduationCap,
                title: t4("أرشيف الكليات", "Examens FSJES", "FSJES Exams", "Exámenes FSJES"),
                desc: t4("نماذج الامتحانات والملخصات", "Sujets d'examens et résumés", "Exam papers and study guides", "Modelos de examen y apuntes"),
                path: "/archive",
                color: "text-emerald-600 bg-emerald-500/10",
              },
              {
                icon: FileText,
                title: t4("الجريدة الرسمية", "Bulletin Officiel", "Official Gazette", "Boletín Oficial"),
                desc: t4("أحدث القوانين الصادرة", "Dernières publications légales", "Latest official legal notices", "Últimas publicaciones legales"),
                path: "/documents/official-journals",
                color: "text-purple-600 bg-purple-500/10",
              },
            ].map((item, idx) => (
                <Link
                    key={idx}
                    to={localizedPath(item.path)}
                    className="p-4 sm:p-5 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-lg transition-all group flex flex-col justify-between active:scale-[0.98] touch-manipulation"
                >
                  <div className={`p-3 rounded-xl ${item.color} w-fit mb-3 group-hover:scale-110 transition-transform`}>
                    <item.icon size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-foreground mb-1 group-hover:text-primary transition-colors">
                      {item.title[lang]}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{item.desc[lang]}</p>
                  </div>
                </Link>
            ))}
          </div>
        </section>

        {/* Main Content Feed */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
            <div>
              <div className="flex items-center justify-between mb-4 sm:mb-6" dir={dir}>
                <div>
                  <h2
                      className="text-lg sm:text-2xl font-bold text-foreground"
                      style={{ fontFamily: serifFont(lang) }}
                  >
                    {t("latest_articles") || "أحدث المقالات والدراسات القانونية"}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {lang === "ar" ? "تحليلات واجتهادات محينة باستمرار" : "Updated legal studies and articles"}
                  </p>
                </div>
                <Link
                    to={localizedPath("/library")}
                    className="text-xs sm:text-sm font-bold text-primary flex items-center gap-1 hover:underline min-h-[40px] px-2"
                    style={{ fontFamily: sansFont(lang) }}
                >
                  <span>{t("view_all") || "عرض الكل"}</span>
                  <ArrowRight size={14} className={arrowFlip} aria-hidden="true" />
                </Link>
              </div>

              {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-52 rounded-2xl bg-muted animate-pulse border border-border" />
                    ))}
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {articles.map((a, i) => (
                        <ArticleCard key={a.id} article={a} featured={i === 0} />
                    ))}
                  </div>
              )}

              <div className="my-8">
                <AdSenseSlot slotId="home-feed-mid" format="auto" responsive={true} className="rounded-2xl overflow-hidden" />
              </div>
            </div>

            {/* Sidebar */}
            <aside className="space-y-6" dir={dir}>
              <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-sm">
                <h3
                    className="text-sm font-bold mb-3 pb-2.5 border-b border-border/60 text-foreground flex items-center gap-1.5"
                    style={{ fontFamily: serifFont(lang) }}
                >
                  <TrendingUp size={16} className="text-primary" />
                  <span>{t("trending_topics") || "المواضيع الأكثر بحثاً"}</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {TRENDING_TOPICS.map((topic) => (
                      <Link
                          key={topic.slug}
                          to={localizedPath(`/search?q=${encodeURIComponent(topic.name[lang])}`)}
                          className="text-xs px-3 py-2 rounded-xl border border-border bg-muted/40 hover:bg-primary hover:text-primary-foreground transition-colors font-medium min-h-[36px] flex items-center shrink-0 active:scale-95"
                          style={{ fontFamily: sansFont(lang) }}
                      >
                        {topic.name[lang]}
                      </Link>
                  ))}
                </div>
              </div>

              {/* Newsletter */}
              <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-4 sm:p-5 shadow-sm">
                <h3
                    className="text-sm font-bold text-foreground mb-1"
                    style={{ fontFamily: serifFont(lang) }}
                >
                  {t("newsletter_title") || "النشرة القانونية الإخبارية"}
                </h3>
                <p
                    className="text-xs text-muted-foreground mb-3 leading-relaxed"
                    style={{ fontFamily: sansFont(lang) }}
                >
                  {t("newsletter_sub") || "احصل على المستجدات التشريعية واجتهادات محكمة النقض مباشرة عبر بريدك."}
                </p>

                {subscribed ? (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 size={18} />
                      <span>{lang === "ar" ? "تم الاشتراك بنجاح! شكراً لك." : "Subscribed successfully! Thank you."}</span>
                    </div>
                ) : (
                    <form onSubmit={handleNewsletterSubmit} className="space-y-2.5">
                      <input
                          type="text"
                          name="bot_trap"
                          value={honeypotBot}
                          onChange={(e) => setHoneypotBot(e.target.value)}
                          className="hidden"
                          tabIndex={-1}
                          autoComplete="off"
                      />

                      <div>
                        <label htmlFor="newsletter-email-input" className="sr-only">
                          {t("newsletter_email") || "البريد الإلكتروني"}
                        </label>
                        <input
                            id="newsletter-email-input"
                            type="email"
                            required
                            value={newsletterEmail}
                            onChange={(e) => setNewsletterEmail(e.target.value)}
                            placeholder={t("newsletter_email") || "البريد الإلكتروني..."}
                            maxLength={150}
                            className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                            style={{ fontFamily: sansFont(lang) }}
                        />
                      </div>

                      <button
                          type="submit"
                          className="w-full py-2.5 bg-primary text-primary-foreground text-xs sm:text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors min-h-[44px] shadow-sm active:scale-95 touch-manipulation"
                          style={{ fontFamily: sansFont(lang) }}
                      >
                        {t("newsletter_cta") || "اشترك الآن مجاناً"}
                      </button>
                    </form>
                )}
              </div>
            </aside>
          </div>
        </section>

        {/* FAQ Accordion Section */}
        <section className="bg-muted/40 border-t border-border py-10 sm:py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-8">
              <h2 className="text-xl sm:text-3xl font-extrabold text-foreground" style={{ fontFamily: serifFont(lang) }}>
                {lang === "ar" ? "الأسئلة الشائعة حول المنصة" : "Frequently Asked Questions"}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {lang === "ar" ? "كل ما تحتاج معرفته لاستخدام موقع ميزان" : "Everything you need to know about Mizan"}
              </p>
            </div>

            <div className="space-y-3">
              {FAQ_ITEMS.map((item, idx) => (
                  <div
                      key={idx}
                      className="bg-card border border-border/80 rounded-2xl overflow-hidden transition-all shadow-sm"
                  >
                    <button
                        onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                        className="w-full p-4 text-start font-bold text-sm sm:text-base flex items-center justify-between gap-3 focus:outline-none min-h-[48px]"
                        style={{ fontFamily: sansFont(lang) }}
                    >
                      <span>{item.q[lang]}</span>
                      <ChevronDown
                          size={18}
                          className={`text-muted-foreground transition-transform duration-200 shrink-0 ${
                              openFaq === idx ? "rotate-180 text-primary" : ""
                          }`}
                      />
                    </button>

                    {openFaq === idx && (
                        <div
                            className="px-4 pb-4 pt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/40 bg-muted/20 animate-in fade-in-50"
                            style={{ fontFamily: sansFont(lang) }}
                        >
                          {item.a[lang]}
                        </div>
                    )}
                  </div>
              ))}
            </div>
          </div>
        </section>
      </div>
  );
}