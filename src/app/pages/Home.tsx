import { useState, useEffect } from "react";
import { Link } from "react-router";
import { ArrowRight, TrendingUp, Clock, Star, FileText, GraduationCap, Gavel, Users } from "lucide-react";
import { getArticles, type Article } from "../lib/supabase";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useI18n, useLocalizedPath, serifFont, sansFont, type Lang } from "../lib/i18n";
import { useSeo } from "../lib/seo";
import { setWebSiteSchema, clearSchema } from "../lib/jsonld";

const HERO_IMG = "https://images.unsplash.com/photo-1759732419233-5b84c4cb5a9c?crop=entropy&cs=tinysrgb&fit=max&fm=webp&q=70&w=1440";

type L = Record<Lang, string>;
const t4 = (ar: string, fr: string, en: string, es: string): L => ({ ar, fr, en, es });

interface LocalArticle extends Article {
  titleL?: L;
  excerptL?: L;
  categoryL?: L;
}

const MOCK_ARTICLES: LocalArticle[] = [
  {
    id: "1",
    slug: "family-law-s1-2026",
    views: 4200,
    is_featured: true,
    created_at: "2026-07-13T10:00:00Z",
    updated_at: "2026-07-13T10:00:00Z",
    tags: ["S1", "2026"],
    title: "أسئلة وأجوبة امتحان قانون الأسرة S1 — المغرب 2026",
    excerpt: "",
    category: "قانون الأسرة",
    titleL: t4(
      "أسئلة وأجوبة امتحان قانون الأسرة S1 — المغرب 2026",
      "Examen de droit de la famille S1 — Maroc 2026",
      "Family Law Exam S1 — Morocco 2026",
      "Examen de derecho de familia S1 — Marruecos 2026"
    ),
    excerptL: t4(
      "نماذج إجابات شاملة تغطي مدوّنة الأسرة: الزواج، الطلاق، النسب والحضانة.",
      "Corrigés complets couvrant le Code de la famille : mariage, divorce, filiation et garde.",
      "Comprehensive answer keys covering the Family Code: marriage, divorce, filiation and custody.",
      "Respuestas completas sobre el Código de Familia: matrimonio, divorcio, filiación y custodia."
    ),
    categoryL: t4("قانون الأسرة", "Droit de la famille", "Family Law", "Derecho de familia"),
  },
  {
    id: "2",
    slug: "criminal-procedure-2025",
    views: 2800,
    is_featured: false,
    created_at: "2026-07-12T10:00:00Z",
    updated_at: "2026-07-12T10:00:00Z",
    title: "مستجدات قانون المسطرة الجنائية — تعديلات 2025",
    excerpt: "",
    category: "القانون الجنائي",
    titleL: t4(
      "مستجدات قانون المسطرة الجنائية — تعديلات 2025",
      "Nouveautés du Code de procédure pénale — 2025",
      "Criminal Procedure Code Updates — 2025",
      "Novedades del Código de Procedimiento Penal — 2025"
    ),
    excerptL: t4(
      "تحليل معمّق للتعديلات الأخيرة على قانون المسطرة الجنائية المغربي.",
      "Analyse approfondie des dernières modifications du Code de procédure pénale marocain.",
      "In-depth analysis of the latest amendments to the Moroccan Criminal Procedure Code.",
      "Análisis profundo de las últimas reformas del Código de Procedimiento Penal marroquí."
    ),
    categoryL: t4("القانون الجنائي", "Droit pénal", "Criminal Law", "Derecho penal"),
  },
  {
    id: "3",
    slug: "company-contract-cassation",
    views: 1500,
    is_featured: false,
    created_at: "2026-07-10T10:00:00Z",
    updated_at: "2026-07-10T10:00:00Z",
    title: "عقد الشركة وإشكالاته القانونية في ضوء أحكام محكمة النقض",
    excerpt: "",
    category: "القانون التجاري",
    titleL: t4(
      "عقد الشركة وإشكالاته القانونية في ضوء أحكام محكمة النقض",
      "Le contrat de société à la lumière de la Cour de cassation",
      "Company Contracts in Light of Cassation Rulings",
      "El contrato de sociedad según el Tribunal de Casación"
    ),
    excerptL: t4(
      "دراسة مقارنة بين القانون المغربي والفرنسي في مجال عقود الشركات.",
      "Étude comparée du droit marocain et français en matière de contrats de société.",
      "Comparative study of Moroccan and French law on company contracts.",
      "Estudio comparado del derecho marroquí y francés sobre contratos de sociedad."
    ),
    categoryL: t4("القانون التجاري", "Droit commercial", "Commercial Law", "Derecho mercantil"),
  },
  {
    id: "4",
    slug: "legality-administrative-law",
    views: 980,
    is_featured: false,
    created_at: "2026-07-08T10:00:00Z",
    updated_at: "2026-07-08T10:00:00Z",
    title: "مبدأ المشروعية في القانون الإداري المغربي — دراسة تحليلية",
    excerpt: "",
    category: "القانون الإداري",
    titleL: t4(
      "مبدأ المشروعية في القانون الإداري المغربي — دراسة تحليلية",
      "Le principe de légalité en droit administratif marocain",
      "The Principle of Legality in Moroccan Administrative Law",
      "El principio de legalidad en el derecho administrativo marroquí"
    ),
    excerptL: t4(
      "رصد لأحدث اجتهادات المحكمة الإدارية العليا حول مبدأ المشروعية.",
      "Panorama de la jurisprudence de la Cour administrative suprême sur la légalité.",
      "A review of the latest Supreme Administrative Court case law on legality.",
      "Repaso de la jurisprudencia del Tribunal Administrativo Supremo sobre la legalidad."
    ),
    categoryL: t4("القانون الإداري", "Droit administratif", "Administrative Law", "Derecho administrativo"),
  },
];

const statsData: { key: string; value: string; icon: React.ReactNode }[] = [
  { key: "stat_documents", value: "12,400+", icon: <FileText size={20} aria-hidden="true" /> },
  { key: "stat_universities", value: "18", icon: <GraduationCap size={20} aria-hidden="true" /> },
  { key: "stat_rulings", value: "3,200+", icon: <Gavel size={20} aria-hidden="true" /> },
  { key: "stat_researchers", value: "28k", icon: <Users size={20} aria-hidden="true" /> },
];

const trendingTopics: L[] = [
  t4("إصلاح مدوّنة الأسرة 2024", "Réforme du Code de la famille 2024", "Family Code Reform 2024", "Reforma del Código de Familia 2024"),
  t4("امتحانات S1 2026", "Examens S1 2026", "S1 Exams 2026", "Exámenes S1 2026"),
  t4("قانون رقم 103.13", "Loi n° 103.13", "Law No. 103.13", "Ley n.º 103.13"),
  t4("الطلاق للشقاق", "Divorce pour discorde", "Divorce for Discord", "Divorcio por desavenencia"),
  t4("الحضانة المشتركة", "Garde partagée", "Joint Custody", "Custodia compartida"),
  t4("العقد الإلكتروني", "Contrat électronique", "Electronic Contracts", "Contrato electrónico"),
];

function ArticleCard({ article, featured = false }: { article: LocalArticle; featured?: boolean }) {
  const { lang, dir, t } = useI18n();

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 24) return t("time_hours_ago").replace("{n}", String(h));
    const days = Math.floor(h / 24);
    return t("time_days_ago").replace("{n}", String(days));
  };

  const title = article.titleL?.[lang] ?? article.title;
  const excerpt = article.excerptL?.[lang] ?? article.excerpt;
  const category = article.categoryL?.[lang] ?? article.category;

  return (
    <article
      className={`group bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between ${
        featured ? "md:col-span-2" : ""
      }`}
      dir={dir}
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
              article.is_featured
                ? "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
                : "bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800"
            }`}
          >
            {category}
          </span>
          {article.is_featured && (
            <span className="text-xs text-red-600 dark:text-red-400 font-bold flex items-center gap-1">
              <TrendingUp size={12} aria-hidden="true" /> {t("trending_badge")}
            </span>
          )}
        </div>

        <Link to={`/article/${article.slug}`} className="block group-hover:text-primary transition-colors">
          <h3
            className={`font-bold text-foreground leading-snug mb-2 ${
              featured ? "text-lg md:text-xl" : "text-base"
            }`}
            style={{ fontFamily: serifFont(lang) }}
          >
            {title}
          </h3>
        </Link>

        <p
          className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4 line-clamp-2"
          style={{ fontFamily: sansFont(lang) }}
        >
          {excerpt}
        </p>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-border/50">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Clock size={12} aria-hidden="true" />
            {timeAgo(article.created_at)}
          </span>
          <span className="flex items-center gap-1">
            <Star size={12} aria-hidden="true" />
            {article.views.toLocaleString()} {t("reads")}
          </span>
        </div>
        <Link
          to={`/article/${article.slug}`}
          className="text-primary hover:underline flex items-center gap-1 font-semibold text-xs py-1"
          style={{ fontFamily: sansFont(lang) }}
        >
          {t("read_more")}
          <ArrowRight size={12} className={dir === "rtl" ? "rotate-180" : ""} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

export default function Home() {
  const { lang, dir, theme, t } = useI18n();
  const localizedPath = useLocalizedPath();
  const [articles, setArticles] = useState<LocalArticle[]>(MOCK_ARTICLES);
  const [loading, setLoading] = useState(false);

  useSeo(
    {
      title: t("hero_title"),
      description: t("hero_subtitle"),
      path: "/",
      keywords: [
        "القانون المغربي",
        "Moroccan law",
        "droit marocain",
        "أرشيف قانوني",
        "legal archive",
        "jurisprudence",
        "مدونة الأسرة",
      ],
      lang,
    },
    [lang]
  );

  useEffect(() => {
    setWebSiteSchema();
    return () => clearSchema("ld-webpage");
  }, [lang]);

  useEffect(() => {
    getArticles({ limit: 8, featured: false })
      .then((data) => {
        if (data?.length) setArticles(data as LocalArticle[]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const arrowFlip = dir === "rtl" ? "rotate-180" : "";

  return (
    <div>
      {/* Hero Section */}
      <section className="relative isolate overflow-hidden text-white" dir={dir}>
        <ImageWithFallback
          src={HERO_IMG}
          alt={t("hero_title")}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              theme === "dark"
                ? "radial-gradient(120% 100% at 75% 30%, rgba(10,15,26,0.65) 0%, rgba(10,15,26,0.90) 55%, rgba(6,10,20,0.98) 100%)"
                : "radial-gradient(120% 100% at 75% 30%, rgba(120,90,20,0.60) 0%, rgba(30,58,138,0.85) 55%, rgba(17,29,58,0.96) 100%)",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-28">
          <div className="max-w-2xl">
            <span className="inline-block text-xs font-mono bg-white/15 backdrop-blur-sm border border-white/25 px-3 py-1 rounded-full tracking-widest uppercase mb-5">
              {t("hero_badge")}
            </span>
            <h1
              className="text-3xl md:text-5xl font-bold leading-tight mb-4 drop-shadow-sm"
              style={{ fontFamily: serifFont(lang) }}
            >
              {t("hero_title")}
            </h1>
            <p
              className="text-white/95 text-base md:text-lg max-w-lg mb-8 leading-relaxed font-normal"
              style={{ fontFamily: sansFont(lang) }}
            >
              {t("hero_subtitle")}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to={localizedPath("/library")}
                className="px-6 py-3 bg-white text-blue-950 font-bold rounded-xl hover:bg-slate-100 transition-colors text-sm shadow-lg min-h-[44px] flex items-center justify-center"
                style={{ fontFamily: sansFont(lang) }}
              >
                {t("hero_cta_library")}
              </Link>
              <Link
                to={localizedPath("/archive")}
                className="px-6 py-3 border border-white/60 text-white font-semibold rounded-xl hover:bg-white/10 backdrop-blur-sm transition-colors text-sm min-h-[44px] flex items-center justify-center"
                style={{ fontFamily: sansFont(lang) }}
              >
                {t("hero_cta_archive")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4" dir={dir}>
            {statsData.map((s) => (
              <div key={s.key} className="text-center p-4">
                <div className="text-primary flex justify-center mb-2">{s.icon}</div>
                <div className="text-2xl md:text-3xl font-extrabold text-foreground">{s.value}</div>
                <div
                  className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 font-medium"
                  style={{ fontFamily: sansFont(lang) }}
                >
                  {t(s.key)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid lg:grid-cols-[1fr_300px] gap-8">
          <div>
            <div className="flex items-center justify-between mb-6" dir={dir}>
              <h2
                className="text-lg md:text-xl font-bold text-foreground"
                style={{ fontFamily: serifFont(lang) }}
              >
                {t("latest_articles")}
              </h2>
              <Link
                to={localizedPath("/library")}
                className="text-sm font-semibold text-primary flex items-center gap-1 hover:underline min-h-[36px]"
                style={{ fontFamily: sansFont(lang) }}
              >
                {t("view_all")} <ArrowRight size={14} className={arrowFlip} aria-hidden="true" />
              </Link>
            </div>
            {loading ? (
              <div className="grid md:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-48 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {articles.map((a, i) => (
                  <ArticleCard key={a.id} article={a} featured={i === 0} />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6" dir={dir}>
            {/* Trending Topics */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <h2
                className="text-sm font-bold mb-4 pb-3 border-b border-border text-foreground"
                style={{ fontFamily: serifFont(lang) }}
              >
                {t("trending_topics")}
              </h2>
              <div className="flex flex-wrap gap-2">
                {trendingTopics.map((topic) => (
                  <Link
                    key={topic.en}
                    to={localizedPath(`/search?q=${encodeURIComponent(topic[lang])}`)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary transition-colors font-medium"
                    style={{ fontFamily: sansFont(lang) }}
                  >
                    {topic[lang]}
                  </Link>
                ))}
              </div>
            </div>

            {/* Semester Navigation */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <h2
                className="text-sm font-bold mb-3 pb-3 border-b border-border text-foreground"
                style={{ fontFamily: serifFont(lang) }}
              >
                {t("browse_by_semester")}
              </h2>
              <nav aria-label={t("browse_by_semester")} className="space-y-2">
                {["S1", "S2", "S3", "S4", "S5", "S6"].map((s) => (
                  <Link
                    key={s}
                    to={`/archive?semester=${s.toLowerCase()}`}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group text-sm"
                    style={{ fontFamily: sansFont(lang) }}
                  >
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      {t("semester_label")} {s}
                    </span>
                    <ArrowRight
                      size={14}
                      className={`text-slate-400 group-hover:text-primary ${arrowFlip}`}
                      aria-hidden="true"
                    />
                  </Link>
                ))}
              </nav>
            </div>

            {/* Newsletter Subscription */}
            <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl p-5 shadow-sm">
              <h2
                className="text-sm font-bold text-blue-900 dark:text-blue-200 mb-1"
                style={{ fontFamily: serifFont(lang) }}
              >
                {t("newsletter_title")}
              </h2>
              <p
                className="text-xs text-slate-600 dark:text-slate-300 mb-3"
                style={{ fontFamily: sansFont(lang) }}
              >
                {t("newsletter_sub")}
              </p>
              <form onSubmit={(e) => e.preventDefault()} className="space-y-2">
                <label htmlFor="newsletter-email-input" className="sr-only">
                  {t("newsletter_email")}
                </label>
                <input
                  id="newsletter-email-input"
                  type="email"
                  placeholder={t("newsletter_email")}
                  maxLength={254}
                  aria-label={t("newsletter_email")}
                  className={`w-full text-sm px-3 py-2.5 rounded-lg border border-border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary ${
                    dir === "rtl" ? "text-right" : "text-left"
                  }`}
                  style={{ fontFamily: sansFont(lang) }}
                />
                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-900 dark:bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-950 dark:hover:bg-blue-700 transition-colors min-h-[40px]"
                  style={{ fontFamily: sansFont(lang) }}
                >
                  {t("newsletter_cta")}
                </button>
              </form>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}